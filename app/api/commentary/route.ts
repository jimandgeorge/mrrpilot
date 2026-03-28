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
  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 200,
    messages: [{ role: "user", content: buildPrompt(metrics) }],
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
  churnRisk: { email: string; daysSince: number; daysLeft: number; mrr: number }[];
}) {
  const fmt = (p: number) => `£${(p / 100).toFixed(0)}`;

  const riskLine = m.churnRisk.length > 0
    ? `At-risk customers (haven't paid in 20–34 days): ${m.churnRisk.map(c => `${c.email} (${c.daysLeft} days left, ${fmt(c.mrr)}/mo)`).join("; ")}.`
    : "No customers currently at churn risk.";

  const trendLine = m.churnTrend.thisPeriod > m.churnTrend.lastPeriod
    ? `Churn increased this period (${m.churnTrend.lastPeriod} → ${m.churnTrend.thisPeriod}).`
    : m.churnTrend.thisPeriod < m.churnTrend.lastPeriod
    ? `Churn improved this period (${m.churnTrend.lastPeriod} → ${m.churnTrend.thisPeriod}).`
    : "";

  return `You are a trusted advisor to a small SaaS founder. Write 2–3 sentences in a direct, conversational tone — like a quick message from someone who knows their business well.

Be specific with numbers. Name customers when relevant. Focus on what matters most right now and end with one concrete thing to do.

No bullet points. No headers. No "great news" or "exciting times". Just talk to them plainly.

Data:
- MRR: ${fmt(m.mrr)} | Period change: ${m.periodChange >= 0 ? "+" : ""}${fmt(m.periodChange)} | Range: ${m.range}
- New customers: ${m.newCustomers} (${fmt(m.breakdown.new)} new revenue) | Upgrades: ${fmt(m.breakdown.upgrade)}
- Churn: ${m.churnCount} cancellation${m.churnCount !== 1 ? "s" : ""}, ${fmt(m.churnRevenue)} lost | ${trendLine}
- ${riskLine}
- 3-month forecast: ${fmt(m.projectedMrr)}

2–3 sentences max. Sound like a person, not a report.`;
}
