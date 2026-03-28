import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";

// In-memory rate limiter — 5 attempts per user per 10 minutes
const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = attempts.get(userId);
  if (!entry || now > entry.resetAt) {
    attempts.set(userId, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (entry.count >= MAX_ATTEMPTS) return false;
  entry.count++;
  return true;
}

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

  if (!checkRateLimit(user.id)) {
    return NextResponse.json({ error: "Too many attempts. Try again in 10 minutes." }, { status: 429 });
  }

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
