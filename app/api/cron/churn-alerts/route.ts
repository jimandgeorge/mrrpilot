import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const auth = request.headers.get("Authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "RESEND_API_KEY not set" }, { status: 500 });
  }
  const resend = new Resend(process.env.RESEND_API_KEY);

  const { data: connections } = await supabaseAdmin
    .from("stripe_connections")
    .select("user_id, stripe_secret_key");

  if (!connections?.length) return NextResponse.json({ sent: 0 });

  let sent = 0;
  const errors: string[] = [];

  for (const conn of connections) {
    try {
      const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(conn.user_id);
      if (!user?.email) continue;

      const stripe = new Stripe(conn.stripe_secret_key, { apiVersion: "2026-03-25.dahlia" });
      const now = Math.floor(Date.now() / 1000);

      const [pastDueSubs, unpaidSubs, incompleteSubs] = await Promise.all([
        stripe.subscriptions.list({ status: "past_due", limit: 100, expand: ["data.customer"] }).autoPagingToArray({ limit: 100 }),
        stripe.subscriptions.list({ status: "unpaid", limit: 100, expand: ["data.customer"] }).autoPagingToArray({ limit: 100 }),
        stripe.subscriptions.list({ status: "incomplete", limit: 100, expand: ["data.customer"] }).autoPagingToArray({ limit: 100 }),
      ]);

      const atRisk = [...pastDueSubs, ...unpaidSubs, ...incompleteSubs].map((sub: any) => {
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
        const email = typeof sub.customer === "object" ? sub.customer?.email : null;
        const item = sub.items?.data?.[0];
        const unitAmount = item?.price?.unit_amount || 0;
        const interval = item?.price?.recurring?.interval;
        const intervalCount = item?.price?.recurring?.interval_count || 1;
        let mrr = unitAmount * (item?.quantity || 1);
        if (interval === "year") mrr = Math.round(mrr / (12 * intervalCount));
        else if (interval === "week") mrr = Math.round((mrr * 52) / (12 * intervalCount));
        else mrr = Math.round(mrr / intervalCount);
        const daysPastDue = sub.current_period_end
          ? Math.max(0, Math.floor((now - sub.current_period_end) / 86400))
          : 0;
        const planName = item?.price?.nickname || `£${(mrr / 100).toFixed(0)}/mo`;
        return { customerId, email, mrr, daysPastDue, planName, status: sub.status };
      }).filter((s: any) => s.customerId);

      if (!atRisk.length) continue;

      // Check which customers we've already alerted in the last 7 days
      const customerIds = atRisk.map((s: any) => s.customerId);
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();

      const { data: recentAlerts } = await supabaseAdmin
        .from("churn_alert_log")
        .select("stripe_customer_id")
        .eq("user_id", conn.user_id)
        .in("stripe_customer_id", customerIds)
        .gte("alerted_at", sevenDaysAgo);

      const alreadyAlerted = new Set((recentAlerts || []).map((r: any) => r.stripe_customer_id));
      const newAtRisk = atRisk.filter((s: any) => !alreadyAlerted.has(s.customerId));

      if (!newAtRisk.length) continue;

      // Send one email per new at-risk customer
      for (const customer of newAtRisk) {
        await resend.emails.send({
          from: process.env.RESEND_FROM ?? "RevInt <alerts@revenueintelligence.co.uk>",
          to: user.email,
          subject: `⚠ ${customer.email || customer.customerId} payment failed — reach out today`,
          html: buildAlertEmail(user.email, customer),
        });

        await supabaseAdmin.from("churn_alert_log").upsert({
          user_id: conn.user_id,
          stripe_customer_id: customer.customerId,
          alerted_at: new Date().toISOString(),
        }, { onConflict: "user_id,stripe_customer_id" });

        sent++;
      }
    } catch (err: any) {
      errors.push(`${conn.user_id}: ${err.message}`);
    }
  }

  return NextResponse.json({ sent, errors });
}

function buildAlertEmail(founderEmail: string, c: { email: string | null; mrr: number; daysPastDue: number; planName: string; status: string }) {
  const customerLabel = c.email || "A customer";
  const mrrFormatted = `£${(c.mrr / 100).toLocaleString("en-GB", { maximumFractionDigits: 0 })}`;
  const overdueText = c.daysPastDue === 0 ? "overdue today" : `${c.daysPastDue} day${c.daysPastDue !== 1 ? "s" : ""} overdue`;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://revenueintelligence.co.uk";

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;padding:40px 16px;">
  <tr><td align="center">
  <table width="520" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;width:100%;">

    <!-- Header -->
    <tr><td style="background:#78350f;border-radius:12px 12px 0 0;padding:24px 32px;">
      <p style="margin:0;color:#fef3c7;font-weight:700;font-size:16px;">⚠ Churn Risk Alert</p>
      <p style="margin:4px 0 0;color:rgba(254,243,199,0.7);font-size:12px;">RevInt · Act today</p>
    </td></tr>

    <!-- Body -->
    <tr><td style="background:#fff;padding:32px;">
      <p style="margin:0 0 20px;font-size:15px;color:#111827;line-height:1.6;">
        <strong>${customerLabel}</strong> has a payment failure that needs your attention.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:20px;margin-bottom:24px;">
        <tr>
          <td>
            ${c.email ? `<p style="margin:0 0 12px;font-size:14px;font-weight:600;color:#92400e;">${c.email}</p>` : ""}
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-size:12px;color:#78350f;padding-bottom:6px;">Plan</td>
                <td style="font-size:12px;font-weight:600;color:#111827;text-align:right;padding-bottom:6px;">${c.planName}</td>
              </tr>
              <tr>
                <td style="font-size:12px;color:#78350f;padding-bottom:6px;">MRR at risk</td>
                <td style="font-size:12px;font-weight:600;color:#111827;text-align:right;padding-bottom:6px;">${mrrFormatted}/mo</td>
              </tr>
              <tr>
                <td style="font-size:12px;color:#78350f;">Status</td>
                <td style="font-size:12px;font-weight:600;color:#d97706;text-align:right;">${overdueText}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">
        A personal email now can save this customer. RevInt can write it for you in one click.
      </p>

      <a href="${appUrl}/dashboard"
         style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:14px 28px;border-radius:10px;">
        Draft outreach email →
      </a>
    </td></tr>

    <!-- Footer -->
    <tr><td style="background:#f1f5f9;border-radius:0 0 12px 12px;padding:16px 32px;text-align:center;">
      <p style="margin:0;font-size:12px;color:#9ca3af;">
        RevInt alert for ${founderEmail}. <a href="${appUrl}/settings" style="color:#9ca3af;">Manage alerts</a>
      </p>
    </td></tr>

  </table>
  </td></tr>
</table>
</body></html>`;
}
