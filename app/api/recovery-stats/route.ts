import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: NextRequest) {
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: rows } = await supabaseAdmin
    .from("dunning_sequences")
    .select("amount, recovered, recovered_at, last_sent_at")
    .eq("user_id", user.id);

  const all = rows ?? [];
  const recovered = all.filter((r) => r.recovered);

  const thisMonthStart = new Date();
  thisMonthStart.setDate(1);
  thisMonthStart.setHours(0, 0, 0, 0);

  const totalRecovered = recovered.reduce((s, r) => s + (r.amount || 0), 0);
  const recoveredThisMonth = recovered
    .filter((r) => r.recovered_at && new Date(r.recovered_at) >= thisMonthStart)
    .reduce((s, r) => s + (r.amount || 0), 0);

  return NextResponse.json({
    totalRecovered,
    recoveredThisMonth,
    totalRecoveredCount: recovered.length,
    totalSent: all.filter((r) => r.last_sent_at).length,
  });
}
