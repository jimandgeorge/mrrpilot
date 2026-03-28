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
  const stream = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 200,
    messages: [{ role: "user", content: buildPrompt(metrics) }],
    stream: true,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
          controller.enqueue(encoder.encode(chunk.delta.text));
        }
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
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

If there are customers at churn risk, lead with that — name them, say how many days they have left, tell the founder to reach out today. That is always the most urgent thing.

If there's no churn risk, lead with the most notable revenue movement. Be specific with numbers. End with one concrete action.

No bullet points. No headers. No "great news" or "exciting times". Just talk to them plainly.

Data:
- MRR: ${fmt(m.mrr)} | Period change: ${m.periodChange >= 0 ? "+" : ""}${fmt(m.periodChange)} | Range: ${m.range}
- New customers: ${m.newCustomers} (${fmt(m.breakdown.new)} new revenue) | Upgrades: ${fmt(m.breakdown.upgrade)}
- Churn: ${m.churnCount} cancellation${m.churnCount !== 1 ? "s" : ""}, ${fmt(m.churnRevenue)} lost | ${trendLine}
- ${riskLine}
- 3-month forecast: ${fmt(m.projectedMrr)}

2–3 sentences max. Sound like a person, not a report.`;
}
