import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: NextRequest) {
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let { data: billing } = await supabaseAdmin
    .from("user_billing")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!billing) {
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const { data: created } = await supabaseAdmin
      .from("user_billing")
      .insert({ user_id: user.id, trial_ends_at: trialEndsAt, subscription_status: "trialing" })
      .select()
      .single();
    billing = created;

    // Notify on new signup
    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const emailResult = await resend.emails.send({
        from: process.env.RESEND_FROM ?? "Revenue Intelligence <alerts@revenueintelligence.co.uk>",
        to: "brendan.mcintosh@outlook.com",
        subject: `New trial signup: ${user.email}`,
        html: `<p>${user.email} just started a trial on Revenue Intelligence.</p>`,
      });
      console.log("[signup-email]", JSON.stringify(emailResult));
    }
  }

  const now = Date.now();
  const trialEnd = new Date(billing.trial_ends_at).getTime();
  const daysLeft = Math.max(0, Math.ceil((trialEnd - now) / 86400000));
  const trialExpired = billing.subscription_status === "trialing" && daysLeft === 0;
  const isActive = (billing.subscription_status === "active" || billing.subscription_status === "trialing") && !trialExpired;

  return NextResponse.json({ status: billing.subscription_status, daysLeft, isActive, trialExpired });
}
