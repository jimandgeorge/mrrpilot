import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getActiveStripeKey } from "@/lib/get-stripe-key";
import { getActivePaddleKey } from "@/lib/get-paddle-key";

const PADDLE_BASE = "https://api.paddle.com";
const PADDLE_SANDBOX_BASE = "https://sandbox-api.paddle.com";

function getPaddleBase(key: string) {
  return key.includes("_sdbx_") ? PADDLE_SANDBOX_BASE : PADDLE_BASE;
}

async function fetchPaddleCustomerData(customerId: string, apiKey: string) {
  const base = getPaddleBase(apiKey);

  const [custRes, subsRes, completedRes, billedRes] = await Promise.all([
    fetch(`${base}/customers/${customerId}`, { headers: { Authorization: `Bearer ${apiKey}` } }),
    fetch(`${base}/subscriptions?customer_id=${customerId}&per_page=50`, { headers: { Authorization: `Bearer ${apiKey}` } }),
    fetch(`${base}/transactions?customer_id=${customerId}&status=completed&per_page=200`, { headers: { Authorization: `Bearer ${apiKey}` } }),
    fetch(`${base}/transactions?customer_id=${customerId}&status=billed&per_page=200`, { headers: { Authorization: `Bearer ${apiKey}` } }),
  ]);

  if (!custRes.ok) return null;

  const custJson = await custRes.json();
  const subsJson = subsRes.ok ? await subsRes.json() : { data: [] };
  const completedJson = completedRes.ok ? await completedRes.json() : { data: [] };
  const billedJson = billedRes.ok ? await billedRes.json() : { data: [] };

  const customer = custJson.data;
  const subs: any[] = subsJson.data ?? [];

  // Deduplicate across completed + billed
  const txnMap = new Map<string, any>();
  [...(completedJson.data ?? []), ...(billedJson.data ?? [])].forEach((t) => { if (t.id) txnMap.set(t.id, t); });
  const txns: any[] = Array.from(txnMap.values());

  // Normalize Paddle subscriptions to Stripe-like shape
  const subscriptions = subs.map((sub: any) => {
    const item = sub.items?.[0];
    const interval = item?.price?.billing_cycle?.interval ?? sub.billing_cycle?.interval ?? "month";
    const intervalCount = item?.price?.billing_cycle?.frequency ?? sub.billing_cycle?.frequency ?? 1;
    const unitAmount = parseInt(item?.price?.unit_price?.amount ?? "0", 10) * (item?.quantity ?? 1);
    return {
      id: sub.id,
      status: sub.status,
      created: Math.floor(new Date(sub.created_at).getTime() / 1000),
      current_period_end: sub.current_billing_period?.ends_at
        ? Math.floor(new Date(sub.current_billing_period.ends_at).getTime() / 1000)
        : 0,
      items: {
        data: [{
          price: {
            unit_amount: unitAmount,
            recurring: { interval, interval_count: intervalCount },
            nickname: item?.product?.name ?? item?.price?.description ?? null,
          },
        }],
      },
      cancellation_details: sub.canceled_at ? { reason: "cancellation_requested" } : null,
    };
  });

  // Sort oldest-first so first transaction gets billing_reason "subscription_create"
  const sortedTxns = [...txns].sort(
    (a, b) => new Date(a.billed_at ?? a.created_at).getTime() - new Date(b.billed_at ?? b.created_at).getTime()
  );
  const firstTxnId = sortedTxns[0]?.id;

  // Normalize Paddle transactions to Stripe invoice-like shape
  const invoices = sortedTxns.map((txn: any) => {
    const item = txn.items?.[0];
    const interval = item?.price?.billing_cycle?.interval ?? "month";
    const intervalCount = item?.price?.billing_cycle?.frequency ?? 1;
    const amountPaid = parseInt(txn.details?.totals?.total ?? "0", 10);
    return {
      id: txn.id,
      created: Math.floor(new Date(txn.billed_at ?? txn.created_at).getTime() / 1000),
      amount_paid: amountPaid,
      amount_due: amountPaid,
      status: "paid",
      billing_reason: txn.id === firstTxnId ? "subscription_create" : "subscription_cycle",
      hosted_invoice_url: null,
      lines: {
        data: [{ price: { recurring: { interval, interval_count: intervalCount } } }],
      },
    };
  });

  return {
    customer: { id: customer.id, email: customer.email },
    invoices,
    subscriptions,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: customerId } = await params;

  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Paddle customer IDs start with ctm_
  if (customerId.startsWith("ctm_")) {
    const apiKey = await getActivePaddleKey(user.id);
    if (!apiKey) return NextResponse.json({ error: "No Paddle connection" }, { status: 404 });
    try {
      const data = await fetchPaddleCustomerData(customerId, apiKey);
      if (!data) return NextResponse.json({ error: "Customer not found" }, { status: 404 });
      return NextResponse.json(data);
    } catch {
      return NextResponse.json({ error: "Failed to fetch customer data" }, { status: 500 });
    }
  }

  // Default: Stripe
  const stripeKey = await getActiveStripeKey(user.id);
  if (!stripeKey) return NextResponse.json({ error: "No Stripe connection" }, { status: 404 });

  const stripe = new Stripe(stripeKey, { apiVersion: "2026-03-25.dahlia" });

  try {
    const [invoices, subscriptions, customer] = await Promise.all([
      stripe.invoices.list({ customer: customerId, limit: 100 }).autoPagingToArray({ limit: 1000 }),
      stripe.subscriptions.list({ customer: customerId, status: "all", limit: 10 }).autoPagingToArray({ limit: 100 }),
      stripe.customers.retrieve(customerId),
    ]);

    return NextResponse.json({ invoices, subscriptions, customer });
  } catch {
    return NextResponse.json({ error: "Failed to fetch customer data" }, { status: 500 });
  }
}
