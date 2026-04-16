import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  const stripe = new Stripe(process.env.REVINT_STRIPE_SECRET_KEY!);
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
      const customerId = sub.customer as string;

      // Update billing record
      await supabaseAdmin.from("user_billing").update({
        subscription_status: "canceled",
      }).eq("revint_stripe_subscription_id", sub.id);

      // Look up the user to send cancellation emails
      if (process.env.RESEND_API_KEY) {
        const { data: billing } = await supabaseAdmin
          .from("user_billing")
          .select("user_id")
          .eq("revint_stripe_customer_id", customerId)
          .single();

        let userEmail: string | null = null;
        if (billing?.user_id) {
          const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(billing.user_id);
          userEmail = user?.email ?? null;
        }

        const resend = new Resend(process.env.RESEND_API_KEY);
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://revenueintelligence.co.uk";
        const from = process.env.RESEND_FROM ?? "RevInt <alerts@revenueintelligence.co.uk>";

        // Notify Brendan
        resend.emails.send({
          from,
          to: "brendan.mcintosh@outlook.com",
          subject: `Cancellation: ${userEmail ?? customerId}`,
          html: `<p><strong>${userEmail ?? customerId}</strong> just cancelled their RevInt subscription.</p>`,
        }).catch(() => {});

        // Email the user
        if (userEmail) {
          resend.emails.send({
            from,
            to: userEmail,
            subject: "You've cancelled your RevInt subscription",
            html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;padding:40px 16px;">
  <tr><td align="center">
  <table width="520" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;width:100%;">
    <tr><td style="background:#fff;border-radius:12px;padding:40px 32px;">
      <p style="margin:0 0 6px;font-weight:700;font-size:16px;color:#111827;">RevInt</p>
      <h1 style="margin:0 0 16px;font-size:22px;color:#111827;">Sorry to see you go</h1>
      <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
        Your RevInt subscription has been cancelled. You'll keep access until the end of your current billing period.
      </p>
      <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
        If you cancelled by mistake, or want to come back, you can resubscribe any time — your data will still be there.
      </p>
      <a href="${appUrl}/upgrade"
         style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:14px 28px;border-radius:10px;">
        Resubscribe →
      </a>
      <p style="margin:24px 0 0;font-size:13px;color:#9ca3af;">
        If you have feedback on why you cancelled, reply to this email — I read every one.
      </p>
    </td></tr>
    <tr><td style="padding:16px 0;text-align:center;">
      <p style="margin:0;font-size:12px;color:#9ca3af;">© ${new Date().getFullYear()} RevInt</p>
    </td></tr>
  </table>
  </td></tr>
</table>
</body></html>`,
          }).catch(() => {});
        }
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
