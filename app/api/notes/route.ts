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
    .from("customer_notes")
    .select("stripe_customer_id, note")
    .eq("user_id", user.id);

  const map: Record<string, string> = {};
  (data || []).forEach((row: any) => { map[row.stripe_customer_id] = row.note; });
  return NextResponse.json({ notes: map });
}

export async function POST(request: NextRequest) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { stripeCustomerId, note } = await request.json();
  if (!stripeCustomerId) return NextResponse.json({ error: "Missing stripeCustomerId" }, { status: 400 });

  await supabaseAdmin.from("customer_notes").upsert({
    user_id: user.id,
    stripe_customer_id: stripeCustomerId,
    note: note ?? "",
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,stripe_customer_id" });

  return NextResponse.json({ ok: true });
}
