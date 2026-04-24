import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getActivePaddleKey } from "@/lib/get-paddle-key";

const PADDLE_BASE = "https://api.paddle.com";
const PADDLE_SANDBOX_BASE = "https://sandbox-api.paddle.com";

async function getUserFromRequest(request: NextRequest) {
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  return user ?? null;
}

function getPaddleBase(key: string): string {
  return key.includes("_sdbx_") ? PADDLE_SANDBOX_BASE : PADDLE_BASE;
}

// GET — is Paddle connected?
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const key = await getActivePaddleKey(user.id);
  return NextResponse.json({ connected: !!key });
}

// POST — save Paddle API key
export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { paddleKey } = await request.json();
  const key = paddleKey?.trim();
  if (!key) return NextResponse.json({ error: "Missing API key." }, { status: 400 });

  // Validate by making a test call
  try {
    const base = getPaddleBase(key);
    const res = await fetch(`${base}/products?per_page=1`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!res.ok) {
      return NextResponse.json({ error: "Paddle rejected this key. Check it and try again." }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Could not reach Paddle API." }, { status: 400 });
  }

  const { data: inserted, error } = await supabaseAdmin
    .from("paddle_connections")
    .insert({ user_id: user.id, paddle_api_key: key, name: "Default", connected_at: new Date().toISOString() })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: "Failed to save connection." }, { status: 500 });

  await supabaseAdmin
    .from("user_billing")
    .update({ active_paddle_connection_id: inserted.id })
    .eq("user_id", user.id);

  return NextResponse.json({ ok: true });
}

// DELETE — remove Paddle connection
export async function DELETE(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await supabaseAdmin.from("paddle_connections").delete().eq("user_id", user.id);
  await supabaseAdmin.from("user_billing").update({ active_paddle_connection_id: null }).eq("user_id", user.id);

  return NextResponse.json({ ok: true });
}
