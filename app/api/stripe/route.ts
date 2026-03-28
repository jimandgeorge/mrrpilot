import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: NextRequest) {
  // Resolve per-user Stripe key — no global fallback
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ notConnected: true });

  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return NextResponse.json({ notConnected: true });

  const { data: conn } = await supabaseAdmin
    .from("stripe_connections")
    .select("stripe_secret_key")
    .eq("user_id", user.id)
    .single();

  if (!conn?.stripe_secret_key) return NextResponse.json({ notConnected: true });

  const stripeKey = conn.stripe_secret_key;

  const stripe = new Stripe(stripeKey, { apiVersion: "2026-03-25.dahlia" });

  try {
    // 📡 Fetch Stripe data (paginated)
    const [invoices, events, pastDueSubs, unpaidSubs] = await Promise.all([
      stripe.invoices.list({ limit: 100 }).autoPagingToArray({ limit: 10000 }),
      stripe.events.list({ limit: 100, type: "customer.subscription.deleted" }).autoPagingToArray({ limit: 10000 }),
      stripe.subscriptions.list({ status: "past_due", limit: 100, expand: ["data.customer"] }).autoPagingToArray({ limit: 1000 }),
      stripe.subscriptions.list({ status: "unpaid", limit: 100, expand: ["data.customer"] }).autoPagingToArray({ limit: 1000 }),
    ]);

    // 🧠 Build customers from invoices
    const customerMap: Record<string, any> = {};

    invoices.forEach((inv: any) => {
      const customerId = inv.customer;
      if (!customerId) return;
      const email = inv.customer_email || "Unknown";

      if (!customerMap[customerId]) {
        customerMap[customerId] = {
          id: customerId,
          email,
          total: 0,
          payments: 0,
          lastPayment: null,
          churned: false,
        };
      }

      // Always update to latest known email for this customer
      if (inv.customer_email) customerMap[customerId].email = inv.customer_email;

      customerMap[customerId].total += inv.amount_paid || 0;
      customerMap[customerId].payments += 1;

      const date = new Date(inv.created * 1000);

      if (!customerMap[customerId].lastPayment || date > customerMap[customerId].lastPayment) {
        customerMap[customerId].lastPayment = date;
      }
    });

    // 💀 Churn detection: churned only if latest subscription deletion is AFTER latest invoice
    // Build map of customerId → latest churn event timestamp
    const latestChurnAt: Record<string, number> = {};

    events.forEach((evt: any) => {
      const customerId = evt.data.object.customer;
      if (!customerId) return;
      if (!latestChurnAt[customerId] || evt.created > latestChurnAt[customerId]) {
        latestChurnAt[customerId] = evt.created;
      }
    });

    // Build map of customerId → latest invoice timestamp
    const latestInvoiceAt: Record<string, number> = {};

    invoices.forEach((inv: any) => {
      if (!inv.customer) return;
      if (!latestInvoiceAt[inv.customer] || inv.created > latestInvoiceAt[inv.customer]) {
        latestInvoiceAt[inv.customer] = inv.created;
      }
    });

    // Mark churned only if churn event exists AND last payment was more than 35 days ago
    const now = Math.floor(Date.now() / 1000);
    const thirtyFiveDaysAgo = now - 35 * 24 * 60 * 60;

    invoices.forEach((inv: any) => {
      if (!inv.customer) return;
      const churnAt = latestChurnAt[inv.customer];
      const invoiceAt = latestInvoiceAt[inv.customer];
      if (churnAt && invoiceAt < thirtyFiveDaysAgo) {
        if (customerMap[inv.customer]) customerMap[inv.customer].churned = true;
      }
    });

    const customers = Object.values(customerMap);

    // 🏷️ Build customerId → email map for churn event enrichment
    const customerIdToEmail: Record<string, string> = {};
    invoices.forEach((inv: any) => {
      if (inv.customer && inv.customer_email) {
        customerIdToEmail[inv.customer] = inv.customer_email;
      }
    });

    // Map Stripe feedback codes to human-readable labels
    const feedbackLabels: Record<string, string> = {
      too_expensive: "Too expensive",
      missing_features: "Missing features",
      switched_service: "Switched service",
      unused: "Not using it",
      customer_service: "Poor support",
      low_quality: "Quality issues",
      too_complex: "Too complex",
      other: "Other",
    };

    // Structured churn events with reason tagging
    const churnEvents = events.map((evt: any) => {
      const sub = evt.data.object;
      const customerId = sub.customer;
      const details = sub.cancellation_details;
      const feedback = details?.feedback ?? null;
      const reason = details?.reason ?? null;

      // Infer reason when Stripe doesn't provide one
      const email = customerIdToEmail[customerId] || "Unknown";
      const payments = customerMap[customerId]?.payments ?? 0;
      let inferredLabel: string;
      if (reason === "payment_failed") {
        inferredLabel = "Payment failed";
      } else if (feedback && feedbackLabels[feedback]) {
        inferredLabel = feedbackLabels[feedback];
      } else if (payments <= 1) {
        inferredLabel = "Didn't find value";
      } else if (payments <= 3) {
        inferredLabel = "Early churn";
      } else {
        inferredLabel = "Unknown";
      }

      return {
        email,
        customerId,
        label: inferredLabel,
        feedback,
        reason,
        cancelledAt: evt.created,
        amount: sub.items?.data?.[0]?.price?.unit_amount ?? 0,
      };
    });

    // ⚠️ At-risk subscriptions (past_due or unpaid status)
    const atRiskSubscriptions = [...pastDueSubs, ...unpaidSubs].map((sub: any) => {
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
      const email = typeof sub.customer === "object" && sub.customer?.email
        ? sub.customer.email
        : customerIdToEmail[customerId] || "Unknown";
      const item = sub.items?.data?.[0];
      const unitAmount = item?.price?.unit_amount || 0;
      const interval = item?.price?.recurring?.interval;
      const intervalCount = item?.price?.recurring?.interval_count || 1;
      let mrr = unitAmount * (item?.quantity || 1);
      if (interval === "year") mrr = Math.round(mrr / (12 * intervalCount));
      else if (interval === "week") mrr = Math.round((mrr * 52) / (12 * intervalCount));
      else mrr = Math.round(mrr / intervalCount);
      const daysPastDue = sub.current_period_end
        ? Math.floor((now - sub.current_period_end) / 86400)
        : 0;
      return { id: customerId, email, mrr, daysPastDue, status: sub.status };
    }).filter((s: any) => s.id);

    // 💳 Past-due invoices (open + due date in the past)
    const pastDueInvoices = invoices
      .filter((inv: any) => inv.status === "open" && inv.due_date && inv.due_date < now)
      .map((inv: any) => ({
        id: inv.id,
        customer: inv.customer,
        email: customerIdToEmail[inv.customer as string] || inv.customer_email || "Unknown",
        amount: inv.amount_remaining || inv.amount_due,
        dueDate: inv.due_date,
        daysOverdue: Math.floor((now - inv.due_date) / 86400),
        hostedUrl: inv.hosted_invoice_url,
      }))
      .sort((a: any, b: any) => b.amount - a.amount);

    // 📤 Return data
    return NextResponse.json({
      invoices,
      events,
      customers,
      churnEvents,
      pastDueInvoices,
      atRiskSubscriptions,
    });

  } catch (error) {
    console.error("Stripe API error:", error);

    return NextResponse.json({
      invoices: [],
      events: [],
      customers: [],
      churnEvents: [],
    });
  }
}
