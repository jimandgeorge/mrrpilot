import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  // Verify cron secret
  const auth = request.headers.get("Authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "RESEND_API_KEY not set" }, { status: 500 });
  }
  const resend = new Resend(process.env.RESEND_API_KEY);

  // Get all users with a connected Stripe account
  const { data: connections, error } = await supabaseAdmin
    .from("stripe_connections")
    .select("user_id, stripe_secret_key");

  if (error || !connections?.length) {
    return NextResponse.json({ sent: 0 });
  }

  let sent = 0;
  const errors: string[] = [];

  for (const conn of connections) {
    try {
      // Get user email from Supabase auth
      const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(conn.user_id);
      if (!user?.email) continue;

      // Compute metrics from Stripe
      const metrics = await computeMetrics(conn.stripe_secret_key);
      if (!metrics) continue;

      // Send digest
      await resend.emails.send({
        from: process.env.RESEND_FROM ?? "RevInt <digest@revint.io>",
        to: user.email,
        subject: `Your weekly revenue digest · ${metrics.mrrFormatted} MRR`,
        html: buildEmail(user.email, metrics),
      });

      sent++;
    } catch (err: any) {
      errors.push(`${conn.user_id}: ${err.message}`);
    }
  }

  return NextResponse.json({ sent, errors });
}

// ─── Metrics computation ──────────────────────────────────────────────────────

async function computeMetrics(stripeKey: string) {
  try {
    const stripe = new Stripe(stripeKey, { apiVersion: "2026-03-25.dahlia" });
    const now = Math.floor(Date.now() / 1000);
    const sevenDaysAgo = now - 7 * 86400;
    const fourteenDaysAgo = now - 14 * 86400;
    const thirtyFiveDaysAgo = now - 35 * 86400;

    const [invoices, events] = await Promise.all([
      stripe.invoices.list({ limit: 100 }).autoPagingToArray({ limit: 10000 }),
      stripe.events.list({ limit: 100, type: "customer.subscription.deleted" }).autoPagingToArray({ limit: 5000 }),
    ]);

    // Build churn set
    const latestChurnAt: Record<string, number> = {};
    events.forEach((evt: any) => {
      const cid = evt.data.object.customer;
      if (!latestChurnAt[cid] || evt.created > latestChurnAt[cid]) latestChurnAt[cid] = evt.created;
    });
    const latestInvoiceAt: Record<string, number> = {};
    invoices.forEach((inv: any) => {
      if (!inv.customer) return;
      if (!latestInvoiceAt[inv.customer] || inv.created > latestInvoiceAt[inv.customer])
        latestInvoiceAt[inv.customer] = inv.created;
    });
    const churnedIds = new Set<string>();
    Object.entries(latestChurnAt).forEach(([cid, churnAt]) => {
      if (latestInvoiceAt[cid] && latestInvoiceAt[cid] < thirtyFiveDaysAgo) churnedIds.add(cid);
    });

    // Latest invoice per active customer → MRR
    const latestByCustomer: Record<string, any> = {};
    invoices.forEach((inv: any) => {
      if (!inv.customer || churnedIds.has(inv.customer) || !inv.amount_paid) return;
      if (!latestByCustomer[inv.customer] || inv.created > latestByCustomer[inv.customer].created)
        latestByCustomer[inv.customer] = inv;
    });

    function toMonthly(inv: any): number {
      const line = inv.lines?.data?.[0];
      const interval = line?.price?.recurring?.interval;
      const ic = line?.price?.recurring?.interval_count || 1;
      let mo = inv.amount_paid;
      if (interval === "year") mo = Math.round(mo / (12 * ic));
      else if (interval === "week") mo = Math.round((mo * 52) / (12 * ic));
      else mo = Math.round(mo / ic);
      return mo;
    }

    let mrr = 0;
    Object.values(latestByCustomer).forEach((inv: any) => { mrr += toMonthly(inv); });
    const activeCount = Object.keys(latestByCustomer).length;
    const arpu = activeCount > 0 ? Math.round(mrr / activeCount) : 0;

    // MRR last week — same logic but exclude invoices newer than 7 days ago
    const latestByCustomerLastWeek: Record<string, any> = {};
    invoices.forEach((inv: any) => {
      if (!inv.customer || churnedIds.has(inv.customer) || !inv.amount_paid) return;
      if (inv.created > sevenDaysAgo) return; // exclude this week
      if (!latestByCustomerLastWeek[inv.customer] || inv.created > latestByCustomerLastWeek[inv.customer].created)
        latestByCustomerLastWeek[inv.customer] = inv;
    });
    let mrrLastWeek = 0;
    Object.values(latestByCustomerLastWeek).forEach((inv: any) => { mrrLastWeek += toMonthly(inv); });

    // New customers this week (first-ever invoice this week)
    const firstInvoiceAt: Record<string, number> = {};
    invoices.forEach((inv: any) => {
      if (!inv.customer || !inv.amount_paid) return;
      if (!firstInvoiceAt[inv.customer] || inv.created < firstInvoiceAt[inv.customer])
        firstInvoiceAt[inv.customer] = inv.created;
    });
    const newThisWeek = Object.values(firstInvoiceAt).filter((t) => t >= sevenDaysAgo).length;
    const newLastWeek = Object.values(firstInvoiceAt).filter((t) => t >= fourteenDaysAgo && t < sevenDaysAgo).length;

    // Churn events this week
    const churnThisWeek = events.filter((e: any) => e.created >= sevenDaysAgo).length;

    // Churn risk (20–34 days since last payment)
    const riskCustomers: { email: string; mrr: number; daysLeft: number }[] = [];
    const emailMap: Record<string, string> = {};
    invoices.forEach((inv: any) => { if (inv.customer && inv.customer_email) emailMap[inv.customer] = inv.customer_email; });
    Object.entries(latestByCustomer).forEach(([cid, inv]: [string, any]) => {
      const daysSince = (now - inv.created) / 86400;
      if (daysSince >= 20 && daysSince < 35) {
        riskCustomers.push({ email: emailMap[cid] || cid, mrr: toMonthly(inv), daysLeft: Math.floor(35 - daysSince) });
      }
    });
    riskCustomers.sort((a, b) => b.mrr - a.mrr);
    const mrrAtRisk = riskCustomers.reduce((s, c) => s + c.mrr, 0);

    const mrrChange = mrr - mrrLastWeek;
    const fmt = (p: number) => `£${(p / 100).toLocaleString("en-GB", { maximumFractionDigits: 0 })}`;

    return {
      mrrFormatted: fmt(mrr),
      mrrChange,
      mrrChangeFormatted: fmt(Math.abs(mrrChange)),
      arpuFormatted: fmt(arpu),
      activeCount,
      newThisWeek,
      newLastWeek,
      churnThisWeek,
      riskCustomers: riskCustomers.slice(0, 3),
      mrrAtRiskFormatted: fmt(mrrAtRisk),
      riskCount: riskCustomers.length,
    };
  } catch {
    return null;
  }
}

// ─── Email HTML ───────────────────────────────────────────────────────────────

function buildEmail(email: string, m: NonNullable<Awaited<ReturnType<typeof computeMetrics>>>) {
  const weekOf = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const changeColor = m.mrrChange >= 0 ? "#16a34a" : "#dc2626";
  const changeSign = m.mrrChange >= 0 ? "+" : "−";
  const churnColor = m.churnThisWeek > 0 ? "#dc2626" : "#111827";
  const newVsLast = m.newThisWeek > m.newLastWeek ? `↑ vs ${m.newLastWeek} last week` : m.newThisWeek < m.newLastWeek ? `↓ vs ${m.newLastWeek} last week` : `same as last week`;

  const riskRows = m.riskCustomers.map((c) => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;font-size:13px;color:#374151;">${c.email}</td>
      <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;font-size:13px;color:#374151;text-align:right;">£${(c.mrr / 100).toFixed(0)}/mo</td>
      <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;font-size:13px;color:#d97706;text-align:right;font-weight:600;">${c.daysLeft}d left</td>
    </tr>
  `).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;padding:40px 16px;">
  <tr><td align="center">
  <table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;">

    <!-- Header -->
    <tr><td style="background:#4f46e5;border-radius:12px 12px 0 0;padding:28px 32px;">
      <p style="margin:0;color:#fff;font-weight:700;font-size:17px;letter-spacing:-0.3px;">RevInt</p>
      <p style="margin:6px 0 0;color:rgba(255,255,255,0.65);font-size:13px;">Weekly digest · ${weekOf}</p>
    </td></tr>

    <!-- MRR hero -->
    <tr><td style="background:#fff;padding:32px 32px 8px;">
      <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.6px;">Monthly Recurring Revenue</p>
      <p style="margin:0;font-size:44px;font-weight:700;color:#111827;letter-spacing:-1px;">${m.mrrFormatted}</p>
      <p style="margin:8px 0 0;font-size:14px;color:${changeColor};font-weight:600;">${changeSign}${m.mrrChangeFormatted} vs last week</p>
    </td></tr>

    <!-- Metrics row -->
    <tr><td style="background:#fff;padding:24px 32px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td width="30%" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:16px;text-align:center;">
            <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;">New</p>
            <p style="margin:0;font-size:28px;font-weight:700;color:#111827;">${m.newThisWeek}</p>
            <p style="margin:4px 0 0;font-size:11px;color:#9ca3af;">${newVsLast}</p>
          </td>
          <td width="5%"></td>
          <td width="30%" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:16px;text-align:center;">
            <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;">Churned</p>
            <p style="margin:0;font-size:28px;font-weight:700;color:${churnColor};">${m.churnThisWeek}</p>
            <p style="margin:4px 0 0;font-size:11px;color:#9ca3af;">this week</p>
          </td>
          <td width="5%"></td>
          <td width="30%" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:16px;text-align:center;">
            <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;">ARPU</p>
            <p style="margin:0;font-size:28px;font-weight:700;color:#111827;">${m.arpuFormatted}</p>
            <p style="margin:4px 0 0;font-size:11px;color:#9ca3af;">${m.activeCount} active</p>
          </td>
        </tr>
      </table>
    </td></tr>

    ${m.riskCount > 0 ? `
    <!-- Churn risk -->
    <tr><td style="background:#fff;padding:0 32px 24px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:16px 20px;">
        <tr>
          <td>
            <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#d97706;">⚠ Churn Risk · ${m.riskCount} customer${m.riskCount !== 1 ? "s" : ""} · ${m.mrrAtRiskFormatted} MRR at risk</p>
            <p style="margin:0 0 12px;font-size:12px;color:#92400e;">These customers haven't paid in 20–34 days. Reach out before the window closes.</p>
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              ${riskRows}
            </table>
          </td>
        </tr>
      </table>
    </td></tr>
    ` : ""}

    <!-- CTA -->
    <tr><td style="background:#fff;padding:8px 32px 32px;text-align:center;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://mrrpilot-roan.vercel.app"}/dashboard"
         style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:14px 32px;border-radius:10px;">
        View Dashboard →
      </a>
    </td></tr>

    <!-- Footer -->
    <tr><td style="background:#f1f5f9;border-radius:0 0 12px 12px;padding:20px 32px;text-align:center;">
      <p style="margin:0;font-size:12px;color:#9ca3af;">
        You're receiving this because you have a RevInt account (${email}).<br>
        To stop these emails, reply with "unsubscribe".
      </p>
    </td></tr>

  </table>
  </td></tr>
</table>
</body></html>`;
}
