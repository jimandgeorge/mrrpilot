import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getActivePaddleKey } from "@/lib/get-paddle-key";
import { paddleToMonthly, normalisePaddleTransaction, normalisePaddleCancellation } from "@/lib/providers/paddle-normalise";

const PADDLE_BASE = "https://api.paddle.com";
const PADDLE_SANDBOX_BASE = "https://sandbox-api.paddle.com";

function getPaddleBase(key: string): string {
  return key.includes("_sdbx_") ? PADDLE_SANDBOX_BASE : PADDLE_BASE;
}

async function fetchAll(base: string, path: string, apiKey: string, params: Record<string, string> = {}): Promise<any[]> {
  const results: any[] = [];
  let after: string | undefined;
  do {
    const url = new URL(`${base}${path}`);
    url.searchParams.set("per_page", "200");
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    if (after) url.searchParams.set("after", after);
    const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${apiKey}` } });
    if (!res.ok) break;
    const json = await res.json();
    results.push(...(json.data ?? []));
    after = json.meta?.pagination?.has_more ? json.meta.pagination.next : undefined;
  } while (after);
  return results;
}

export async function GET(request: NextRequest) {
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ notConnected: true });

  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return NextResponse.json({ notConnected: true });

  const apiKey = await getActivePaddleKey(user.id);
  if (!apiKey) return NextResponse.json({ notConnected: true });

  // Rate limit manual refreshes to once per 60 seconds
  const isManual = request.nextUrl.searchParams.get("manual") === "1";
  if (isManual) {
    const { data: billing } = await supabaseAdmin
      .from("user_billing")
      .select("last_paddle_refresh")
      .eq("user_id", user.id)
      .single();
    if (billing?.last_paddle_refresh) {
      const secondsLeft = Math.ceil(
        (new Date(billing.last_paddle_refresh).getTime() + 60000 - Date.now()) / 1000
      );
      if (secondsLeft > 0) return NextResponse.json({ rateLimited: true, secondsLeft });
    }
  }

  await supabaseAdmin
    .from("user_billing")
    .update({ last_paddle_refresh: new Date().toISOString() })
    .eq("user_id", user.id);

  const base = getPaddleBase(apiKey);

  try {
    const [customers, activeSubs, pastDueSubs, pausedSubs, canceledSubs, completedTxns, pastDueTxns] = await Promise.all([
      fetchAll(base, "/customers", apiKey),
      fetchAll(base, "/subscriptions", apiKey, { status: "active" }),
      fetchAll(base, "/subscriptions", apiKey, { status: "past_due" }),
      fetchAll(base, "/subscriptions", apiKey, { status: "paused" }),
      fetchAll(base, "/subscriptions", apiKey, { status: "canceled" }),
      fetchAll(base, "/transactions", apiKey, { status: "completed" }),
      fetchAll(base, "/transactions", apiKey, { status: "past_due" }),
    ]);

    // Customer email map
    const customerEmailMap: Record<string, string> = {};
    customers.forEach((c: any) => { if (c.id && c.email) customerEmailMap[c.id] = c.email; });

    // MRR by customer from active subscriptions
    const activeCustomerIds = new Set<string>();
    const mrrByCustomer: Record<string, { mrr: number; planName: string; priceId: string }> = {};
    activeSubs.forEach((sub: any) => {
      const customerId = sub.customer_id;
      if (!customerId) return;
      activeCustomerIds.add(customerId);
      const item = sub.items?.[0];
      const unitAmount = parseInt(item?.price?.unit_price?.amount ?? "0", 10) * (item?.quantity ?? 1);
      const interval = sub.billing_cycle?.interval ?? "month";
      const frequency = sub.billing_cycle?.frequency ?? 1;
      const mrr = paddleToMonthly(unitAmount, interval, frequency);
      const planName = item?.product?.name ?? item?.price?.description ?? `£${(mrr / 100).toLocaleString("en-GB", { maximumFractionDigits: 0 })}/mo`;
      mrrByCustomer[customerId] = { mrr, planName, priceId: item?.price?.id ?? "unknown" };
    });

    // Customer map from transactions
    const customerMap: Record<string, any> = {};
    completedTxns.forEach((txn: any) => {
      const customerId = txn.customer_id;
      if (!customerId) return;
      const total = parseInt(txn.details?.totals?.total ?? "0", 10);
      if (!customerMap[customerId]) {
        customerMap[customerId] = { id: customerId, email: customerEmailMap[customerId] || "Unknown", total: 0, payments: 0, churned: false };
      }
      customerMap[customerId].total += total;
      customerMap[customerId].payments += 1;
    });

    // Mark churned: canceled subscription and no active subscription
    canceledSubs.forEach((sub: any) => {
      const customerId = sub.customer_id;
      if (!activeCustomerIds.has(customerId) && customerMap[customerId]) {
        customerMap[customerId].churned = true;
      }
    });

    const customers_out = Object.values(customerMap);

    // Churn events from canceled subscriptions
    const now = Math.floor(Date.now() / 1000);
    const churnEvents = canceledSubs.map((sub: any) => {
      const customerId = sub.customer_id;
      const email = customerEmailMap[customerId] || "Unknown";
      const payments = customerMap[customerId]?.payments ?? 0;
      const label = payments <= 1 ? "Didn't find value" : payments <= 3 ? "Early churn" : "Unknown";
      return { email, customerId, label, cancelledAt: Math.floor(new Date(sub.canceled_at ?? Date.now()).getTime() / 1000), amount: mrrByCustomer[customerId]?.mrr ?? 0 };
    });

    // At-risk subscriptions
    const atRiskSubscriptions = [...pastDueSubs, ...pausedSubs].map((sub: any) => {
      const customerId = sub.customer_id;
      const email = customerEmailMap[customerId] || "Unknown";
      const item = sub.items?.[0];
      const unitAmount = parseInt(item?.price?.unit_price?.amount ?? "0", 10) * (item?.quantity ?? 1);
      const interval = sub.billing_cycle?.interval ?? "month";
      const frequency = sub.billing_cycle?.frequency ?? 1;
      const mrr = paddleToMonthly(unitAmount, interval, frequency);
      const periodEnd = sub.current_billing_period?.ends_at
        ? Math.floor(new Date(sub.current_billing_period.ends_at).getTime() / 1000) : 0;
      const daysPastDue = periodEnd ? Math.max(0, Math.floor((now - periodEnd) / 86400)) : 0;
      const planName = item?.product?.name ?? item?.price?.description ?? `£${(mrr / 100).toLocaleString("en-GB", { maximumFractionDigits: 0 })}/mo`;
      return { id: customerId, email, mrr, daysPastDue, status: sub.status, planName };
    }).filter((s: any) => s.id);

    // Past-due invoices from past_due transactions
    const pastDueInvoices = pastDueTxns.map((txn: any) => ({
      id: txn.id,
      customer: txn.customer_id,
      email: customerEmailMap[txn.customer_id] || "Unknown",
      amount: parseInt(txn.details?.totals?.total ?? "0", 10),
      daysOverdue: 0,
      hostedUrl: null,
    }));

    // Normalise transactions and cancellations for the dashboard
    const sortedTxns = [...completedTxns].sort(
      (a, b) => new Date(a.billed_at ?? a.created_at).getTime() - new Date(b.billed_at ?? b.created_at).getTime()
    );
    const seenCustomers = new Set<string>();
    const invoices = sortedTxns.map((txn) =>
      normalisePaddleTransaction(txn, customerEmailMap[txn.customer_id] ?? null, seenCustomers)
    );
    const events = canceledSubs.map((sub) =>
      normalisePaddleCancellation(sub, customerEmailMap[sub.customer_id] ?? null)
    );

    return NextResponse.json({
      invoices,
      events,
      customers: customers_out,
      churnEvents,
      pastDueInvoices,
      atRiskSubscriptions,
      mrrByCustomer,
    });

  } catch (error) {
    console.error("Paddle API error:", error);
    return NextResponse.json({ invoices: [], events: [], customers: [], churnEvents: [] });
  }
}
