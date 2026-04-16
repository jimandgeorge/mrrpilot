import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

async function getUser(request: NextRequest) {
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  return user;
}

export async function GET(request: NextRequest) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabaseAdmin
    .from("user_billing")
    .select("mrr_goal")
    .eq("user_id", user.id)
    .single();

  return NextResponse.json({ mrr_goal: data?.mrr_goal ?? 0 });
}

export async function POST(request: NextRequest) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { mrr_goal } = await request.json();
  await supabaseAdmin
    .from("user_billing")
    .update({ mrr_goal: mrr_goal ?? 0 })
    .eq("user_id", user.id);

  return NextResponse.json({ ok: true });
}
