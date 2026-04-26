import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getActiveRevolutKey } from "@/lib/get-revolut-key";
import { revToMonthly, normaliseRevolutOrder, normaliseRevolutCancellation } from "@/lib/providers/revolut-normalise";
import { checkRateLimit } from "@/lib/rate-limit";

const PROD_BASE    = "https://merchant.revolut.com/api/1.0";
const SANDBOX_BASE = "https://sandbox-merchant.revolut.com/api/1.0";

async function revFetch(base: string, path: string, apiKey: string, params: Record<string, string> = {}): Promise<any[]> {
  const url = new URL(`${base}${path}`);
  Object.entries({ count: "1000", ...params }).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${apiKey}` } });
  if (!res.ok) return [];
  const json = await res.json();
  // Revolut returns either { items: [...] } or a plain array
  return Array.isArray(json) ? json : (json.items ?? []);
}

export async function GET(request: NextRequest) {
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ notConnected: true });

  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return NextResponse.json({ notConnected: true });

  const conn = await getActiveRevolutKey(user.id);
  if (!conn) return NextResponse.json({ notConnected: true });

  if (!checkRateLimit("revolut-fetch", user.id, 10, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { key: apiKey, isSandbox } = conn;
  const base = isSandbox ? SANDBOX_BASE : PROD_BASE;

  // Rate limit manual refreshes
  const isManual = request.nextUrl.searchParams.get("manual") === "1";
  if (isManual) {
    const { data: billing } = await supabaseAdmin
      .from("user_billing")
      .select("last_revolut_refresh")
      .eq("user_id", user.id)
      .single();
    if (billing?.last_revolut_refresh) {
      const secondsLeft = Math.ceil(
        (new Date(billing.last_revolut_refresh).getTime() + 60000 - Date.now()) / 1000
      );
      if (secondsLeft > 0) return NextResponse.json({ rateLimited: true, secondsLeft });
    }
  }

  await supabaseAdmin
    .from("user_billing")
    .update({ last_revolut_refresh: new Date().toISOString() })
    .eq("user_id", user.id);

  try {
    const [allSubs, allOrders] = await Promise.all([
      revFetch(base, "/subscriptions", apiKey),
      revFetch(base, "/orders", apiKey, { state: "COMPLETED" }),
    ]);

    const now = Math.floor(Date.now() / 1000);

    // Partition subscriptions by state
    const activeSubs  = allSubs.filter((s: any) => s.state === "ACTIVE");
    const pastDueSubs = allSubs.filter((s: any) => s.state === "PAST_DUE" || (s.state === "ACTIVE" && s.next_payment_date && new Date(s.next_payment_date) < new Date()));
    const canceledSubs = allSubs.filter((s: any) => s.state === "CANCELLED" || s.state === "CANCELED");

    // Build billing cycle map: subscription_id → { unit, period }
    const subBillingMap = new Map<string, { unit: string; period: number }>();
    allSubs.forEach((s: any) => {
      subBillingMap.set(s.id, {
        unit: s.billing_cycle?.unit ?? "MONTH",
        period: s.billing_cycle?.period ?? 1,
      });
    });

    // MRR by customer (email is the customer identifier in Revolut)
    const activeCustomerIds = new Set<string>();
    const mrrByCustomer: Record<string, { mrr: number; planName: string; priceId: string }> = {};
    activeSubs.forEach((sub: any) => {
      const customerId = sub.email ?? sub.id;
      if (!customerId) return;
      activeCustomerIds.add(customerId);
      const unit = sub.billing_cycle?.unit ?? "MONTH";
      const period = sub.billing_cycle?.period ?? 1;
      const mrr = revToMonthly(sub.amount ?? 0, unit, period);
      const planName = sub.plan_name ?? sub.description ?? `£${(mrr / 100).toLocaleString("en-GB", { maximumFractionDigits: 0 })}/mo`;
      mrrByCustomer[customerId] = { mrr, planName, priceId: sub.id };
    });

    // Customer map from orders
    const customerMap: Record<string, any> = {};
    allOrders.forEach((order: any) => {
      const customerId = order.email ?? order.customer_id ?? order.id;
      if (!customerId) return;
      const total = order.amount ?? 0;
      if (!customerMap[customerId]) {
        customerMap[customerId] = { id: customerId, email: order.email ?? "Unknown", total: 0, payments: 0, churned: false };
      }
      customerMap[customerId].total += total;
      customerMap[customerId].payments += 1;
    });

    // Mark churned
    canceledSubs.forEach((sub: any) => {
      const customerId = sub.email ?? sub.id;
      if (!activeCustomerIds.has(customerId) && customerMap[customerId]) {
        customerMap[customerId].churned = true;
      }
    });

    const customers_out = Object.values(customerMap);

    // Churn events
    const churnEvents = canceledSubs.map((sub: any) => {
      const customerId = sub.email ?? sub.id;
      const payments = customerMap[customerId]?.payments ?? 0;
      const label = payments <= 1 ? "Didn't find value" : payments <= 3 ? "Early churn" : "Unknown";
      return { email: sub.email ?? "Unknown", customerId, label, cancelledAt: Math.floor(new Date(sub.cancelled_at ?? Date.now()).getTime() / 1000), amount: mrrByCustomer[customerId]?.mrr ?? 0 };
    });

    // At-risk subscriptions
    const atRiskSubscriptions = pastDueSubs.map((sub: any) => {
      const customerId = sub.email ?? sub.id;
      const unit = sub.billing_cycle?.unit ?? "MONTH";
      const period = sub.billing_cycle?.period ?? 1;
      const mrr = revToMonthly(sub.amount ?? 0, unit, period);
      const nextPayment = sub.next_payment_date ? Math.floor(new Date(sub.next_payment_date).getTime() / 1000) : 0;
      const daysPastDue = nextPayment ? Math.max(0, Math.floor((now - nextPayment) / 86400)) : 0;
      const planName = sub.plan_name ?? sub.description ?? `£${(mrr / 100).toLocaleString("en-GB", { maximumFractionDigits: 0 })}/mo`;
      return { id: customerId, email: sub.email ?? "Unknown", mrr, daysPastDue, status: "past_due", planName };
    }).filter((s: any) => s.id);

    // Normalise orders → invoices (sorted oldest-first for correct "first customer" detection)
    const sortedOrders = [...allOrders].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    const seenCustomers = new Set<string>();
    const invoices = sortedOrders.map((order) =>
      normaliseRevolutOrder(order, seenCustomers, subBillingMap)
    );
    const events = canceledSubs.map((sub) => normaliseRevolutCancellation(sub));

    return NextResponse.json({
      invoices,
      events,
      customers: customers_out,
      churnEvents,
      pastDueInvoices: [],
      atRiskSubscriptions,
      mrrByCustomer,
    });

  } catch (error) {
    console.error("Revolut API error:", error);
    return NextResponse.json({ invoices: [], events: [], customers: [], churnEvents: [] });
  }
}
