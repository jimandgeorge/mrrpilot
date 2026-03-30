import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";

const stripe = new Stripe(process.env.REVINT_STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig!, process.env.REVINT_STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id;
      const subscriptionId = session.subscription as string;
      if (!userId || !subscriptionId) break;

      const sub = await stripe.subscriptions.retrieve(subscriptionId) as any;
      await supabaseAdmin.from("user_billing").update({
        revint_stripe_subscription_id: subscriptionId,
        revint_stripe_customer_id: session.customer as string,
        subscription_status: sub.status,
        current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
      }).eq("user_id", userId);
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as any;
      const customerId = sub.customer as string;
      await supabaseAdmin.from("user_billing").update({
        subscription_status: sub.status,
        current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
      }).eq("revint_stripe_customer_id", customerId);
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await supabaseAdmin.from("user_billing").update({
        subscription_status: "canceled",
      }).eq("revint_stripe_subscription_id", sub.id);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
