import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getActiveRevolutKey } from "@/lib/get-revolut-key";

const PROD_BASE    = "https://merchant.revolut.com/api/1.0";
const SANDBOX_BASE = "https://sandbox-merchant.revolut.com/api/1.0";

async function getUserFromRequest(request: NextRequest) {
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  return user ?? null;
}

// Try production then sandbox; return which one accepted the key
async function detectRevolutBase(key: string): Promise<{ valid: boolean; isSandbox: boolean }> {
  for (const [base, isSandbox] of [[PROD_BASE, false], [SANDBOX_BASE, true]] as const) {
    try {
      const res = await fetch(`${base}/subscriptions?count=1`, {
        headers: { Authorization: `Bearer ${key}` },
      });
      if (res.status !== 401 && res.status !== 403) return { valid: true, isSandbox };
    } catch { /* try next */ }
  }
  return { valid: false, isSandbox: false };
}

// GET — is Revolut connected?
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const conn = await getActiveRevolutKey(user.id);
  return NextResponse.json({ connected: !!conn, isSandbox: conn?.isSandbox ?? false });
}

// POST — save Revolut API key
export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { revolutKey } = await request.json();
  const key = revolutKey?.trim();
  if (!key) return NextResponse.json({ error: "Missing API key." }, { status: 400 });

  const { valid, isSandbox } = await detectRevolutBase(key);
  if (!valid) {
    return NextResponse.json({ error: "Revolut rejected this key. Check it and try again." }, { status: 400 });
  }

  const { data: inserted, error } = await supabaseAdmin
    .from("revolut_connections")
    .insert({
      user_id: user.id,
      revolut_api_key: key,
      is_sandbox: isSandbox,
      name: "Default",
      connected_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: "Failed to save connection." }, { status: 500 });

  await supabaseAdmin
    .from("user_billing")
    .update({ active_revolut_connection_id: inserted.id })
    .eq("user_id", user.id);

  return NextResponse.json({ ok: true, isSandbox });
}

// DELETE — remove Revolut connection
export async function DELETE(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await supabaseAdmin.from("revolut_connections").delete().eq("user_id", user.id);
  await supabaseAdmin.from("user_billing").update({ active_revolut_connection_id: null }).eq("user_id", user.id);

  return NextResponse.json({ ok: true });
}
