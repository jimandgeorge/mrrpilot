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

// GET — list all connections for user
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [{ data: connections }, { data: billing }] = await Promise.all([
    supabaseAdmin
      .from("stripe_connections")
      .select("id, name, connected_at")
      .eq("user_id", user.id)
      .order("connected_at", { ascending: true }),
    supabaseAdmin
      .from("user_billing")
      .select("active_stripe_connection_id")
      .eq("user_id", user.id)
      .single(),
  ]);

  const list = connections ?? [];
  const activeId = billing?.active_stripe_connection_id ?? list[0]?.id ?? null;

  return NextResponse.json({
    connections: list.map((c) => ({ ...c, isActive: c.id === activeId })),
  });
}

// POST — add a new connection
export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!checkRateLimit(user.id)) {
    return NextResponse.json({ error: "Too many attempts. Try again in 10 minutes." }, { status: 429 });
  }

  const { stripeKey, name } = await request.json();
  if (!stripeKey?.startsWith("sk_")) {
    return NextResponse.json({ error: "Invalid Stripe secret key format." }, { status: 400 });
  }

  const accountName = (name?.trim() || "Default");

  // Validate the key
  try {
    const stripe = new Stripe(stripeKey, { apiVersion: "2026-03-25.dahlia" });
    await stripe.balance.retrieve();
  } catch {
    return NextResponse.json({ error: "Stripe rejected this key. Check it and try again." }, { status: 400 });
  }

  // Check for name conflict
  const { data: existing } = await supabaseAdmin
    .from("stripe_connections")
    .select("id")
    .eq("user_id", user.id)
    .eq("name", accountName)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: `You already have an account named "${accountName}". Choose a different name.` }, { status: 409 });
  }

  const { data: inserted, error } = await supabaseAdmin
    .from("stripe_connections")
    .insert({ user_id: user.id, stripe_secret_key: stripeKey, name: accountName, connected_at: new Date().toISOString() })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: "Failed to save connection." }, { status: 500 });

  // If this is the first connection, set it as active
  const { data: billing } = await supabaseAdmin
    .from("user_billing")
    .select("active_stripe_connection_id")
    .eq("user_id", user.id)
    .single();

  if (!billing?.active_stripe_connection_id) {
    await supabaseAdmin
      .from("user_billing")
      .update({ active_stripe_connection_id: inserted.id })
      .eq("user_id", user.id);
  }

  return NextResponse.json({ ok: true, id: inserted.id });
}

// PATCH — set active connection
export async function PATCH(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  // Verify connection belongs to user
  const { data: conn } = await supabaseAdmin
    .from("stripe_connections")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!conn) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await supabaseAdmin
    .from("user_billing")
    .update({ active_stripe_connection_id: id })
    .eq("user_id", user.id);

  return NextResponse.json({ ok: true });
}

// DELETE — remove a connection by id
export async function DELETE(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await request.json();

  if (!id) {
    // Legacy: disconnect all (kept for backward compat)
    await supabaseAdmin.from("stripe_connections").delete().eq("user_id", user.id);
    await supabaseAdmin.from("user_billing").update({ active_stripe_connection_id: null }).eq("user_id", user.id);
    return NextResponse.json({ ok: true });
  }

  // Verify ownership
  const { data: conn } = await supabaseAdmin
    .from("stripe_connections")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!conn) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await supabaseAdmin.from("stripe_connections").delete().eq("id", id);

  // If this was the active connection, promote the next oldest
  const { data: billing } = await supabaseAdmin
    .from("user_billing")
    .select("active_stripe_connection_id")
    .eq("user_id", user.id)
    .single();

  if (billing?.active_stripe_connection_id === id) {
    const { data: next } = await supabaseAdmin
      .from("stripe_connections")
      .select("id")
      .eq("user_id", user.id)
      .order("connected_at", { ascending: true })
      .limit(1)
      .single();

    await supabaseAdmin
      .from("user_billing")
      .update({ active_stripe_connection_id: next?.id ?? null })
      .eq("user_id", user.id);
  }

  return NextResponse.json({ ok: true });
}
