import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  const stripe = new Stripe(process.env.REVINT_STRIPE_SECRET_KEY!);
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: billing } = await supabaseAdmin
    .from("user_billing")
    .select("revint_stripe_customer_id")
    .eq("user_id", user.id)
    .single();

  let customerId = billing?.revint_stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;
    await supabaseAdmin
      .from("user_billing")
      .upsert({ user_id: user.id, revint_stripe_customer_id: customerId })
      .eq("user_id", user.id);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://revenueintelligence.co.uk";

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: process.env.REVINT_STRIPE_PRICE_ID!, quantity: 1 }],
    success_url: `${appUrl}/upgrade/success`,
    cancel_url: `${appUrl}/upgrade`,
    client_reference_id: user.id,
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: session.url });
}
