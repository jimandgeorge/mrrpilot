import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";

async function getUser(request: NextRequest) {
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  return user;
}

// GET — fetch current share token for the user
export async function GET(request: NextRequest) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabaseAdmin
    .from("share_tokens")
    .select("token, created_at")
    .eq("user_id", user.id)
    .maybeSingle();

  return NextResponse.json({ token: data?.token ?? null, createdAt: data?.created_at ?? null });
}

// POST — generate a new share token (revokes old one first)
export async function POST(request: NextRequest) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Delete any existing token
  await supabaseAdmin.from("share_tokens").delete().eq("user_id", user.id);

  const token = randomBytes(24).toString("base64url");
  const { data, error } = await supabaseAdmin
    .from("share_tokens")
    .insert({ user_id: user.id, token })
    .select("token")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ token: data.token });
}

// DELETE — revoke share token
export async function DELETE(request: NextRequest) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await supabaseAdmin.from("share_tokens").delete().eq("user_id", user.id);
  return NextResponse.json({ ok: true });
}
