import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getActiveStripeKey } from "@/lib/get-stripe-key";

const STRIPE_EVENTS = [
  "customer.subscription.created",
  "customer.subscription.deleted",
  "invoice.payment_succeeded",
  "invoice.payment_failed",
];

export async function GET(request: NextRequest) {
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabaseAdmin
    .from("slack_integrations")
    .select("slack_webhook_url, stripe_webhook_id, webhook_token")
    .eq("user_id", user.id)
    .maybeSingle();

  return NextResponse.json({ integration: data ?? null });
}

export async function POST(request: NextRequest) {
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slack_webhook_url } = await request.json();
  if (!slack_webhook_url?.startsWith("https://hooks.slack.com/")) {
    return NextResponse.json({ error: "Invalid Slack webhook URL" }, { status: 400 });
  }

  // Generate a unique token for the Stripe webhook URL
  const { data: existing } = await supabaseAdmin
    .from("slack_integrations")
    .select("webhook_token, stripe_webhook_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const webhookToken = existing?.webhook_token ?? crypto.randomUUID();
  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/stripe-events/${webhookToken}`;

  // Create or update Stripe webhook endpoint
  let stripeWebhookId: string | null = existing?.stripe_webhook_id ?? null;
  let stripeWebhookSecret: string | null = null;

  const stripeKey = await getActiveStripeKey(user.id);
  if (stripeKey) {
    const stripe = new Stripe(stripeKey, { apiVersion: "2026-03-25.dahlia" });

    // Delete old webhook if it exists
    if (stripeWebhookId) {
      try { await stripe.webhookEndpoints.del(stripeWebhookId); } catch { /* already gone */ }
    }

    try {
      const endpoint = await stripe.webhookEndpoints.create({
        url: webhookUrl,
        enabled_events: STRIPE_EVENTS as Stripe.WebhookEndpointCreateParams.EnabledEvent[],
      });
      stripeWebhookId = endpoint.id;
      stripeWebhookSecret = endpoint.secret ?? null;
    } catch {
      // Restricted key — save webhook URL anyway, real-time won't work
      stripeWebhookId = null;
    }
  }

  const upsertData: any = {
    user_id: user.id,
    slack_webhook_url,
    webhook_token: webhookToken,
    stripe_webhook_id: stripeWebhookId,
  };
  if (stripeWebhookSecret) upsertData.stripe_webhook_secret = stripeWebhookSecret;

  await supabaseAdmin.from("slack_integrations").upsert(upsertData, { onConflict: "user_id" });

  return NextResponse.json({ ok: true, realtime: !!stripeWebhookId });
}

export async function DELETE(request: NextRequest) {
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabaseAdmin
    .from("slack_integrations")
    .select("stripe_webhook_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (data?.stripe_webhook_id) {
    const stripeKey = await getActiveStripeKey(user.id);
    if (stripeKey) {
      const stripe = new Stripe(stripeKey, { apiVersion: "2026-03-25.dahlia" });
      try { await stripe.webhookEndpoints.del(data.stripe_webhook_id); } catch { /* already gone */ }
    }
  }

  await supabaseAdmin.from("slack_integrations").delete().eq("user_id", user.id);
  return NextResponse.json({ ok: true });
}
