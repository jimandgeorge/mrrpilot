import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  // Look up user by token
  const { data: shareRow } = await supabaseAdmin
    .from("share_tokens")
    .select("user_id")
    .eq("token", token)
    .maybeSingle();

  if (!shareRow) return NextResponse.json({ error: "Invalid or expired link" }, { status: 404 });

  // Get their Stripe key
  const { data: conn } = await supabaseAdmin
    .from("stripe_connections")
    .select("stripe_secret_key")
    .eq("user_id", shareRow.user_id)
    .single();

  if (!conn?.stripe_secret_key) return NextResponse.json({ error: "No Stripe connection" }, { status: 404 });

  const stripe = new Stripe(conn.stripe_secret_key, { apiVersion: "2026-03-25.dahlia" });

  try {
    const [invoices, events] = await Promise.all([
      stripe.invoices.list({ limit: 100 }).autoPagingToArray({ limit: 10000 }),
      stripe.events.list({ limit: 100, type: "customer.subscription.deleted" }).autoPagingToArray({ limit: 10000 }),
    ]);
    return NextResponse.json({ invoices, events });
  } catch {
    return NextResponse.json({ error: "Failed to fetch Stripe data" }, { status: 500 });
  }
}
