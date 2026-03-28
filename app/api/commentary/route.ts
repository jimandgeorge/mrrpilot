import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "@/lib/supabase-admin";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const metrics = await request.json();

  const prompt = buildPrompt(metrics);

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 300,
    messages: [{ role: "user", content: prompt }],
  });

  const content = message.content[0];
  const text = content.type === "text" ? content.text : "";

  return NextResponse.json({ commentary: text });
}

function buildPrompt(m: {
  mrr: number;
  projectedMrr: number;
  periodChange: number;
  growthRate: number;
  churnRate: number;
  churnRevenue: number;
  churnCount: number;
  newCustomers: number;
  range: string;
  breakdown: { new: number; renewal: number; upgrade: number };
  churnTrend: { thisPeriod: number; lastPeriod: number };
}) {
  const fmt = (p: number) => `£${(p / 100).toFixed(0)}`;
  const pct = (n: number) => `${n.toFixed(1)}%`;

  const trendNote = m.churnTrend.thisPeriod > m.churnTrend.lastPeriod
    ? `Churn is up vs the previous period (${m.churnTrend.lastPeriod} → ${m.churnTrend.thisPeriod} cancellations).`
    : m.churnTrend.thisPeriod < m.churnTrend.lastPeriod
    ? `Churn is down vs the previous period (${m.churnTrend.lastPeriod} → ${m.churnTrend.thisPeriod} cancellations).`
    : "";

  return `You are a concise revenue analyst for a SaaS business. Analyze these metrics and write a 2–3 sentence narrative that a founder would find genuinely useful. Be specific with the numbers, identify the single most important signal, and end with one concrete action. No fluff, no bullet points — just clear prose.

Period: ${m.range}
MRR: ${fmt(m.mrr)}
Period change: ${m.periodChange >= 0 ? "+" : ""}${fmt(m.periodChange)}
Growth rate: ${pct(m.growthRate)} of MRR
Churn rate: ${pct(m.churnRate)} — lost ${fmt(m.churnRevenue)} from ${m.churnCount} cancellation${m.churnCount !== 1 ? "s" : ""}
${trendNote}
New customers: ${m.newCustomers} (${fmt(m.breakdown.new)} new revenue)
Renewals: ${fmt(m.breakdown.renewal)}
Upgrades: ${fmt(m.breakdown.upgrade)}
3-month MRR forecast: ${fmt(m.projectedMrr)}

Write 2–3 sentences maximum.`;
}
