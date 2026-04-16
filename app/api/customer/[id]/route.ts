import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getActiveStripeKey } from "@/lib/get-stripe-key";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: customerId } = await params;

  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const stripeKey = await getActiveStripeKey(user.id);
  if (!stripeKey) return NextResponse.json({ error: "No Stripe connection" }, { status: 404 });

  const stripe = new Stripe(stripeKey, { apiVersion: "2026-03-25.dahlia" });

  try {
    const [invoices, subscriptions, customer] = await Promise.all([
      stripe.invoices.list({ customer: customerId, limit: 100 }).autoPagingToArray({ limit: 1000 }),
      stripe.subscriptions.list({ customer: customerId, status: "all", limit: 10 }).autoPagingToArray({ limit: 100 }),
      stripe.customers.retrieve(customerId),
    ]);

    return NextResponse.json({ invoices, subscriptions, customer });
  } catch {
    return NextResponse.json({ error: "Failed to fetch customer data" }, { status: 500 });
  }
}
