import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";

async function getUserFromRequest(request: NextRequest) {
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  return user ?? null;
}

// POST — validate + save Stripe key
export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { stripeKey } = await request.json();
  if (!stripeKey?.startsWith("sk_")) {
    return NextResponse.json({ error: "Invalid Stripe secret key format." }, { status: 400 });
  }

  // Validate the key by making a test Stripe call
  try {
    const stripe = new Stripe(stripeKey, { apiVersion: "2026-03-25.dahlia" });
    await stripe.balance.retrieve();
  } catch {
    return NextResponse.json({ error: "Stripe rejected this key. Check it and try again." }, { status: 400 });
  }

  // Save to Supabase
  const { error } = await supabaseAdmin
    .from("stripe_connections")
    .upsert({ user_id: user.id, stripe_secret_key: stripeKey, connected_at: new Date().toISOString() }, { onConflict: "user_id" });

  if (error) return NextResponse.json({ error: "Failed to save connection." }, { status: 500 });

  return NextResponse.json({ ok: true });
}

// DELETE — disconnect
export async function DELETE(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await supabaseAdmin.from("stripe_connections").delete().eq("user_id", user.id);

  return NextResponse.json({ ok: true });
}
