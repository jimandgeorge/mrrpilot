import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "@/lib/supabase-admin";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { messages, context } = await request.json();

  const stream = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 400,
    system: buildSystemPrompt(context),
    messages,
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

function buildSystemPrompt(ctx: {
  mrr: number;
  arr: number;
  arpu: number;
  nrr: number | null;
  growthRate: number;
  churnRate: number;
  churnRevenue: number;
  projectedMrr: number;
  newCustomers: number;
  breakdown: { new: number; renewal: number; upgrade: number };
  churnTrend: { thisPeriod: number; lastPeriod: number };
  churnRisk: { email: string; mrr: number; daysSince: number; daysLeft: number }[];
  planRevenue: { name: string; mrr: number; customers: number; pct: number }[];
  recentEvents: { email: string; type: string; amount: number; date: string }[];
  range: string;
}) {
  const fmt = (p: number) => `£${(p / 100).toFixed(0)}`;

  const riskSection = ctx.churnRisk.length > 0
    ? ctx.churnRisk.map(c => `  - ${c.email}: ${fmt(c.mrr)}/mo, ${c.daysSince} days since last payment, ${c.daysLeft} days left`).join("\n")
    : "  None";

  const plansSection = ctx.planRevenue.length > 0
    ? ctx.planRevenue.map(p => `  - ${p.name}: ${p.customers} customer${p.customers !== 1 ? "s" : ""}, ${fmt(p.mrr)}/mo (${p.pct}%)`).join("\n")
    : "  No plan data";

  const eventsSection = ctx.recentEvents.slice(0, 20)
    .map(e => `  - ${e.email}: ${e.type}${e.amount ? ` (${fmt(e.amount)})` : ""} on ${e.date}`)
    .join("\n");

  return `You are a revenue analyst embedded in RevInt, a dashboard for a SaaS founder. Answer questions about their business directly and specifically. Use customer emails when referring to people. Keep answers concise — 1–3 sentences unless the question genuinely needs more. No bullet points unless listing multiple items. No preamble.

Current data (${ctx.range} range):
- MRR: ${fmt(ctx.mrr)} | ARR: ${fmt(ctx.arr)} | ARPU: ${fmt(ctx.arpu)}
- NRR: ${ctx.nrr !== null ? `${ctx.nrr}%` : "not enough data"} | Growth: ${ctx.growthRate >= 0 ? "+" : ""}${ctx.growthRate.toFixed(1)}% | Churn rate: ${ctx.churnRate.toFixed(1)}%
- Revenue lost to churn: ${fmt(ctx.churnRevenue)} | Cancellations: ${ctx.churnTrend.thisPeriod} (vs ${ctx.churnTrend.lastPeriod} last period)
- New customers: ${ctx.newCustomers} | New revenue: ${fmt(ctx.breakdown.new)} | Upgrades: ${fmt(ctx.breakdown.upgrade)}
- 3-month forecast: ${fmt(ctx.projectedMrr)}

Churn risk (20–34 days since last payment):
${riskSection}

Revenue by plan:
${plansSection}

Recent activity:
${eventsSection}`;
}
