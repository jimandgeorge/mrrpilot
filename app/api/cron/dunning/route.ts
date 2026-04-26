import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getActiveStripeKey } from "@/lib/get-stripe-key";

export const runtime = "nodejs";
export const maxDuration = 60;

const STEPS: { step: number; minDays: number; label: string }[] = [
  { step: 1, minDays: 0, label: "Day 1" },
  { step: 2, minDays: 3, label: "Day 3" },
  { step: 3, minDays: 7, label: "Day 7" },
];

export async function GET(request: NextRequest) {
  const auth = request.headers.get("Authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://revenueintelligence.co.uk";

  const { data: userRows } = await supabaseAdmin.from("stripe_connections").select("user_id");
  const userIds = [...new Set((userRows ?? []).map((r: any) => r.user_id as string))];
  if (!userIds.length) return NextResponse.json({ sent: 0 });

  let sent = 0;
  const errors: string[] = [];

  for (const userId of userIds) {
    try {
      const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (!user?.email) continue;

      const stripeKey = await getActiveStripeKey(userId);
      if (!stripeKey) continue;
      const stripe = new Stripe(stripeKey, { apiVersion: "2026-03-25.dahlia" });

      const thirtyDaysAgo = Math.floor((Date.now() - 30 * 86400000) / 1000);
      const events = await stripe.events.list({
        type: "invoice.payment_failed",
        created: { gte: thirtyDaysAgo },
        limit: 100,
      }).autoPagingToArray({ limit: 100 });

      // Get Stripe account name for use in customer emails
      let companyName = "the service";
      try {
        const account = await stripe.accounts.retrieve();
        companyName = (account as any).business_profile?.name
          || (account as any).settings?.dashboard?.display_name
          || companyName;
      } catch { /* non-critical */ }

      for (const event of events) {
        const invoiceSnapshot = event.data.object as Stripe.Invoice;
        const invoiceId = invoiceSnapshot.id;
        if (!invoiceId) continue;

        // Fetch current invoice status
        let invoice: Stripe.Invoice;
        try {
          invoice = await stripe.invoices.retrieve(invoiceId);
        } catch { continue; }

        // Mark recovered if now paid
        if (invoice.status === "paid") {
          await supabaseAdmin.from("dunning_sequences").upsert({
            user_id: userId,
            stripe_invoice_id: invoiceId,
            customer_id: String(invoice.customer),
            customer_email: invoice.customer_email,
            amount: invoice.amount_due,
            failed_at: new Date(event.created * 1000).toISOString(),
            recovered: true,
            recovered_at: new Date().toISOString(),
          }, { onConflict: "user_id,stripe_invoice_id" });
          continue;
        }

        if (!["open"].includes(invoice.status ?? "")) continue;

        const failedAt = new Date(event.created * 1000);
        const daysSince = (Date.now() - failedAt.getTime()) / 86400000;

        const { data: existing } = await supabaseAdmin
          .from("dunning_sequences")
          .select("step, recovered")
          .eq("user_id", userId)
          .eq("stripe_invoice_id", invoiceId)
          .maybeSingle();

        if (existing?.recovered) continue;
        const currentStep = existing?.step ?? 0;

        const nextStep = STEPS.find(
          (s) => s.step === currentStep + 1 && daysSince >= s.minDays
        );
        if (!nextStep) continue;

        const customerEmail = invoice.customer_email ?? "your customer";
        const amountPounds = `£${(invoice.amount_due / 100).toFixed(2)}`;
        const payLink = invoice.hosted_invoice_url ?? `${appUrl}/dashboard`;

        // Build the draft email the founder can send to their customer
        const draftSubject = encodeURIComponent(
          nextStep.step === 1
            ? `Payment issue with your ${companyName} subscription`
            : nextStep.step === 2
            ? `Quick follow-up — payment still outstanding`
            : `Important: final payment notice`
        );
        const draftBody = encodeURIComponent(buildCustomerDraft(nextStep.step, companyName, amountPounds, payLink));
        const mailtoLink = `mailto:${encodeURIComponent(customerEmail)}?subject=${draftSubject}&body=${draftBody}`;

        // Email the founder with the ready-to-send draft
        await resend.emails.send({
          from: process.env.RESEND_FROM ?? "Revenue Intelligence <alerts@revenueintelligence.co.uk>",
          to: user.email,
          subject: `💳 Recovery draft ready — ${customerEmail} · ${amountPounds} (${nextStep.label})`,
          html: buildFounderEmail({ founderEmail: user.email, customerEmail, amountPounds, payLink, mailtoLink, step: nextStep.step, companyName, appUrl }),
        });

        await supabaseAdmin.from("dunning_sequences").upsert({
          user_id: userId,
          stripe_invoice_id: invoiceId,
          customer_id: String(invoice.customer),
          customer_email: invoice.customer_email,
          amount: invoice.amount_due,
          failed_at: failedAt.toISOString(),
          step: nextStep.step,
          last_sent_at: new Date().toISOString(),
          recovered: false,
        }, { onConflict: "user_id,stripe_invoice_id" });

        sent++;
      }
    } catch (err: any) {
      errors.push(`${userId}: ${err.message}`);
    }
  }

  return NextResponse.json({ sent, errors });
}

function buildCustomerDraft(step: number, company: string, amount: string, payLink: string): string {
  if (step === 1) {
    return `Hi,

We had a problem processing your payment of ${amount} for ${company}.

This can happen when a card expires or details change. You can update your payment method and settle the balance here:
${payLink}

Let me know if you have any questions.`;
  }
  if (step === 2) {
    return `Hi,

Just following up — your payment of ${amount} for ${company} is still outstanding.

Please take a moment to update your payment details here:
${payLink}

Happy to help if something isn't working on your end.`;
  }
  return `Hi,

This is a final notice regarding your outstanding payment of ${amount} for ${company}.

To keep your subscription active, please settle the balance here:
${payLink}

If we don't hear from you shortly, your subscription may be cancelled. Please reach out if you'd like to discuss.`;
}

function buildFounderEmail({ founderEmail, customerEmail, amountPounds, payLink, mailtoLink, step, companyName, appUrl }: {
  founderEmail: string; customerEmail: string; amountPounds: string; payLink: string;
  mailtoLink: string; step: number; companyName: string; appUrl: string;
}) {
  const stepLabel = step === 1 ? "Day 1" : step === 2 ? "Day 3 follow-up" : "Day 7 final notice";
  const urgencyColor = step === 1 ? "#4f46e5" : step === 2 ? "#d97706" : "#dc2626";
  const urgencyBg = step === 1 ? "#eef2ff" : step === 2 ? "#fffbeb" : "#fef2f2";
  const urgencyBorder = step === 1 ? "#c7d2fe" : step === 2 ? "#fde68a" : "#fecaca";

  const draft = buildCustomerDraft(step, companyName, amountPounds, payLink)
    .split("\n").map((l) => l ? `<p style="margin:0 0 8px;font-size:14px;color:#374151;line-height:1.6;">${l}</p>` : `<p style="margin:0 0 8px;">&nbsp;</p>`).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;padding:40px 16px;">
  <tr><td align="center">
  <table width="520" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;width:100%;">

    <tr><td style="background:${urgencyColor};border-radius:12px 12px 0 0;padding:24px 32px;">
      <p style="margin:0;color:#fff;font-weight:700;font-size:16px;">💳 Recovery email ready · ${stepLabel}</p>
      <p style="margin:4px 0 0;color:rgba(255,255,255,0.75);font-size:12px;">Revenue Intelligence detected a failed payment — here's a draft to send</p>
    </td></tr>

    <tr><td style="background:#fff;padding:32px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${urgencyBg};border:1px solid ${urgencyBorder};border-radius:10px;padding:16px 20px;margin-bottom:24px;">
        <tr>
          <td style="font-size:13px;color:#6b7280;">Customer</td>
          <td style="font-size:13px;font-weight:600;color:#111827;text-align:right;">${customerEmail}</td>
        </tr>
        <tr>
          <td style="font-size:13px;color:#6b7280;padding-top:8px;">Amount overdue</td>
          <td style="font-size:13px;font-weight:600;color:#111827;text-align:right;padding-top:8px;">${amountPounds}</td>
        </tr>
      </table>

      <p style="margin:0 0 16px;font-size:13px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Draft email to send</p>
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:20px;margin-bottom:24px;">
        ${draft}
      </div>

      <a href="${mailtoLink}"
         style="display:inline-block;background:${urgencyColor};color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:14px 28px;border-radius:10px;margin-bottom:12px;">
        Send now (opens email) →
      </a>
      <br>
      <a href="${payLink}" style="font-size:13px;color:#6b7280;text-decoration:underline;">View Stripe invoice</a>
    </td></tr>

    <tr><td style="background:#f1f5f9;border-radius:0 0 12px 12px;padding:16px 32px;text-align:center;">
      <p style="margin:0;font-size:12px;color:#9ca3af;">Revenue Intelligence · <a href="${appUrl}/settings" style="color:#9ca3af;">Manage alerts</a></p>
    </td></tr>

  </table>
  </td></tr>
</table>
</body></html>`;
}
