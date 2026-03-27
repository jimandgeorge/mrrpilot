import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-03-25.dahlia",
});

export async function GET() {
  try {
    // 📡 Fetch Stripe data (paginated)
    const [invoices, events] = await Promise.all([
      stripe.invoices.list({ limit: 100 }).autoPagingToArray({ limit: 10000 }),
      stripe.events.list({ limit: 100, type: "customer.subscription.deleted" }).autoPagingToArray({ limit: 10000 }),
    ]);

    // 🧠 Build customers from invoices
    const customerMap: Record<string, any> = {};

    invoices.forEach((inv: any) => {
      const email = inv.customer_email || "Unknown";

      if (!customerMap[email]) {
        customerMap[email] = {
          email,
          total: 0,
          payments: 0,
          lastPayment: null,
          churned: false,
        };
      }

      customerMap[email].total += inv.amount_paid || 0;
      customerMap[email].payments += 1;

      const date = new Date(inv.created * 1000);

      if (!customerMap[email].lastPayment || date > customerMap[email].lastPayment) {
        customerMap[email].lastPayment = date;
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
        const email = inv.customer_email || "Unknown";
        if (customerMap[email]) customerMap[email].churned = true;
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
      const payments = customerMap[email]?.payments ?? 0;
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

    // 📤 Return data
    return NextResponse.json({
      invoices,
      events,
      customers,
      churnEvents,
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
