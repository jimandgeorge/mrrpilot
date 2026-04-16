import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getActiveStripeKey } from "@/lib/get-stripe-key";

export const runtime = "nodejs";
export const maxDuration = 60;

const MRR_MILESTONES = [500, 1000, 2000, 3000, 5000, 7500, 10000, 15000, 20000, 25000, 50000, 100000];

function crossedMilestone(prevPounds: number, currPounds: number): number | null {
  for (const m of MRR_MILESTONES) {
    if (prevPounds < m && currPounds >= m) return m;
  }
  return null;
}

function buildEmail(userEmail: string, items: string[], currentMrrFormatted: string): string {
  const name = userEmail.split("@")[0];
  const rows = items.map((item) => `
    <tr>
      <td style="padding:6px 0;font-size:14px;color:#374151;line-height:1.6;">${item}</td>
    </tr>`).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;padding:40px 16px;">
  <tr><td align="center">
  <table width="520" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;width:100%;">
    <tr><td style="background:#fff;border-radius:12px;padding:40px 32px;">
      <p style="margin:0 0 6px;font-weight:700;font-size:16px;color:#111827;">RevInt</p>
      <h1 style="margin:0 0 20px;font-size:20px;color:#111827;">Morning update, ${name}</h1>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">
        ${rows}
      </table>
      <p style="margin:0 0 24px;font-size:14px;color:#6b7280;border-top:1px solid #f3f4f6;padding-top:16px;">
        Current MRR: <strong style="color:#111827;">${currentMrrFormatted}</strong>
      </p>
      <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://revenueintelligence.co.uk"}/dashboard"
         style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:10px;">
        Open dashboard →
      </a>
    </td></tr>
    <tr><td style="padding:16px 0;text-align:center;">
      <p style="margin:0;font-size:12px;color:#9ca3af;">© ${new Date().getFullYear()} RevInt · <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://revenueintelligence.co.uk"}/settings" style="color:#9ca3af;">settings</a></p>
    </td></tr>
  </table>
  </td></tr>
</table>
</body></html>`;
}

export async function GET(request: NextRequest) {
  const auth = request.headers.get("Authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "RESEND_API_KEY not set" }, { status: 500 });
  }
  const resend = new Resend(process.env.RESEND_API_KEY);

  const { data: userRows } = await supabaseAdmin
    .from("stripe_connections")
    .select("user_id");

  const userIds = [...new Set((userRows ?? []).map((r: any) => r.user_id as string))];
  if (!userIds.length) return NextResponse.json({ sent: 0 });

  let sent = 0;
  const errors: string[] = [];
  const yesterday = Math.floor(Date.now() / 1000) - 86400;

  for (const userId of userIds) {
    try {
      const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (!user?.email) continue;

      // Check subscription status — skip expired trials / inactive
      const { data: billing } = await supabaseAdmin
        .from("user_billing")
        .select("subscription_status, trial_ends_at, last_known_mrr")
        .eq("user_id", userId)
        .single();

      const isActive = billing?.subscription_status === "active" ||
        billing?.subscription_status === "trialing" && billing?.trial_ends_at && new Date(billing.trial_ends_at) > new Date();
      if (!isActive) continue;

      const stripeKey = await getActiveStripeKey(userId);
      if (!stripeKey) continue;

      const stripe = new Stripe(stripeKey, { apiVersion: "2026-03-25.dahlia" });

      // Fetch events from last 24h
      const [newSubEvents, cancelEvents, updatedEvents, activeSubs] = await Promise.all([
        stripe.events.list({ type: "customer.subscription.created", created: { gte: yesterday }, limit: 50 }).autoPagingToArray({ limit: 50 }),
        stripe.events.list({ type: "customer.subscription.deleted", created: { gte: yesterday }, limit: 50 }).autoPagingToArray({ limit: 50 }),
        stripe.events.list({ type: "customer.subscription.updated", created: { gte: yesterday }, limit: 50 }).autoPagingToArray({ limit: 50 }),
        stripe.subscriptions.list({ status: "active", limit: 100 }).autoPagingToArray({ limit: 2000 }),
      ]);

      // Current MRR
      let currentMrr = 0;
      activeSubs.forEach((sub: any) => {
        const item = sub.items?.data?.[0];
        const price = item?.price;
        if (!price) return;
        const unitAmount = price.unit_amount || 0;
        const quantity = item.quantity || 1;
        const interval = price.recurring?.interval;
        const ic = price.recurring?.interval_count || 1;
        let monthly = unitAmount * quantity;
        if (interval === "year") monthly = Math.round(monthly / (12 * ic));
        else if (interval === "week") monthly = Math.round((monthly * 52) / (12 * ic));
        else monthly = Math.round(monthly / ic);
        currentMrr += monthly;
      });

      const currentMrrPounds = Math.round(currentMrr / 100);
      const currentMrrFormatted = `£${currentMrrPounds.toLocaleString("en-GB")}`;

      // Build notable items
      const items: string[] = [];

      // New customers
      if (newSubEvents.length > 0) {
        const total = newSubEvents.reduce((sum: number, evt: any) => {
          const sub = evt.data.object as any;
          const item = sub.items?.data?.[0];
          const price = item?.price;
          if (!price) return sum;
          const unitAmount = price.unit_amount || 0;
          const interval = price.recurring?.interval;
          const ic = price.recurring?.interval_count || 1;
          let monthly = unitAmount * (item?.quantity || 1);
          if (interval === "year") monthly = Math.round(monthly / (12 * ic));
          else monthly = Math.round(monthly / ic);
          return sum + monthly;
        }, 0);
        const totalPounds = Math.round(total / 100);
        items.push(
          newSubEvents.length === 1
            ? `✓ 1 new customer · +£${totalPounds}/mo MRR`
            : `✓ ${newSubEvents.length} new customers · +£${totalPounds}/mo MRR`
        );
      }

      // Cancellations
      if (cancelEvents.length > 0) {
        items.push(
          cancelEvents.length === 1
            ? `✗ 1 cancellation today`
            : `✗ ${cancelEvents.length} cancellations today`
        );
      }

      // Recovered payments (updated to active from past_due/unpaid)
      const recovered = updatedEvents.filter((evt: any) => {
        const prev = evt.data.previous_attributes as any;
        const curr = evt.data.object as any;
        return (prev?.status === "past_due" || prev?.status === "unpaid") && curr.status === "active";
      });
      if (recovered.length > 0) {
        items.push(
          recovered.length === 1
            ? `✓ 1 failed payment recovered`
            : `✓ ${recovered.length} failed payments recovered`
        );
      }

      // MRR milestone
      const lastKnownMrrPounds = Math.round((billing?.last_known_mrr ?? 0) / 100);
      if (lastKnownMrrPounds > 0) {
        const milestone = crossedMilestone(lastKnownMrrPounds, currentMrrPounds);
        if (milestone) {
          items.push(`🎉 MRR crossed £${milestone.toLocaleString("en-GB")}!`);
        }
      }

      // Update last_known_mrr
      await supabaseAdmin
        .from("user_billing")
        .update({ last_known_mrr: currentMrr })
        .eq("user_id", userId);

      // Only send if something happened
      if (items.length === 0) continue;

      await resend.emails.send({
        from: process.env.RESEND_FROM ?? "RevInt <alerts@revenueintelligence.co.uk>",
        to: user.email,
        subject: items[0].replace(/^[✓✗🎉]\s/, ""),
        html: buildEmail(user.email, items, currentMrrFormatted),
      });

      sent++;
    } catch (err: any) {
      errors.push(`${userId}: ${err.message}`);
    }
  }

  return NextResponse.json({ sent, errors });
}
