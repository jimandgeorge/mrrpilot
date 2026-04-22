import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getActiveStripeKey } from "@/lib/get-stripe-key";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const { data: integration } = await supabaseAdmin
    .from("slack_integrations")
    .select("user_id, slack_webhook_url, stripe_webhook_secret")
    .eq("webhook_token", token)
    .maybeSingle();

  if (!integration) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const rawBody = await request.text();
  const sig = request.headers.get("stripe-signature") ?? "";

  let event: Stripe.Event;
  try {
    const stripe = new Stripe("placeholder_not_used_for_verification", { apiVersion: "2026-03-25.dahlia" });
    event = stripe.webhooks.constructEvent(rawBody, sig, integration.stripe_webhook_secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Fetch customer email if we can
  let customerEmail: string | null = null;
  try {
    const stripeKey = await getActiveStripeKey(integration.user_id);
    if (stripeKey) {
      const stripe = new Stripe(stripeKey, { apiVersion: "2026-03-25.dahlia" });
      const obj = event.data.object as any;
      const customerId = typeof obj.customer === "string" ? obj.customer : obj.customer?.id;
      if (customerId) {
        const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
        customerEmail = customer.email;
      }
    }
  } catch { /* non-critical */ }

  const message = buildMessage(event, customerEmail);
  if (message) {
    await fetch(integration.slack_webhook_url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: message }),
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}

function buildMessage(event: Stripe.Event, email: string | null): string | null {
  const who = email ?? "a customer";
  const fmt = (n: number) => `£${(n / 100).toLocaleString("en-GB", { maximumFractionDigits: 0 })}`;

  switch (event.type) {
    case "customer.subscription.created": {
      const sub = event.data.object as Stripe.Subscription;
      const item = sub.items?.data?.[0];
      const unit = item?.price?.unit_amount ?? 0;
      const qty = item?.quantity ?? 1;
      const interval = item?.price?.recurring?.interval;
      const ic = item?.price?.recurring?.interval_count ?? 1;
      let mrr = unit * qty;
      if (interval === "year") mrr = Math.round(mrr / (12 * ic));
      else mrr = Math.round(mrr / ic);
      return `🎉 *New customer* — ${who} · ${fmt(mrr)}/mo`;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const item = sub.items?.data?.[0];
      const unit = item?.price?.unit_amount ?? 0;
      const qty = item?.quantity ?? 1;
      const interval = item?.price?.recurring?.interval;
      const ic = item?.price?.recurring?.interval_count ?? 1;
      let mrr = unit * qty;
      if (interval === "year") mrr = Math.round(mrr / (12 * ic));
      else mrr = Math.round(mrr / ic);
      return `😬 *Cancellation* — ${who} · ${fmt(mrr)}/mo lost`;
    }
    case "invoice.payment_succeeded": {
      const inv = event.data.object as Stripe.Invoice;
      if (inv.billing_reason === "subscription_create") return null; // covered by subscription.created
      return `💰 *Payment* — ${email ?? inv.customer_email ?? "a customer"} · ${fmt(inv.amount_paid)}`;
    }
    case "invoice.payment_failed": {
      const inv = event.data.object as Stripe.Invoice;
      return `⚠️ *Payment failed* — ${email ?? inv.customer_email ?? "a customer"} · ${fmt(inv.amount_due)} at risk`;
    }
    default:
      return null;
  }
}
