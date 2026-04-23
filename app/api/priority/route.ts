import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "@/lib/supabase-admin";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return new Response("Unauthorized", { status: 401 });

  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return new Response("Unauthorized", { status: 401 });

  const m = await request.json();

  const stream = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 120,
    stream: true,
    messages: [{ role: "user", content: buildPrompt(m) }],
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

  return new Response(readable, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}

function buildPrompt(m: any): string {
  const fmt = (p: number) => `£${Math.round(p / 100).toLocaleString("en-GB")}`;

  const riskLines = (m.churnRisk ?? []).length > 0
    ? (m.churnRisk as any[]).map((c: any) =>
        `${c.email} (${c.daysPastDue === 0 ? "overdue today" : `${c.daysPastDue} days overdue`}, ${fmt(c.mrr)}/mo)`
      ).join("; ")
    : null;

  const recentChurns = (m.recentChurns ?? []).length > 0
    ? (m.recentChurns as any[]).map((c: any) => `${c.email} (${fmt(c.mrr)}/mo)`).join(", ")
    : null;

  return `You are advising a SaaS founder. Give them ONE specific thing to do RIGHT NOW — today.

Rules:
- Start with a verb (Email, Call, Check, Fix)
- Name the specific customer if there's a payment failure or churn risk — use their email
- Include £ amounts when relevant
- Maximum 2 sentences, no more
- No hedging ("consider", "you might want to"), just a direct instruction
- Priority order: payment failures > churn risk > recent churns > growth actions

Business data:
- MRR: ${fmt(m.mrr)} | MoM: ${m.mrrMoM !== null ? `${m.mrrMoM >= 0 ? "+" : ""}${m.mrrMoM}%` : "n/a"} | NRR: ${m.nrr !== null ? `${m.nrr}%` : "n/a"}
- Customers at risk: ${riskLines ?? "none"}
- Recent cancellations: ${recentChurns ?? "none"}
- Churn this period: ${m.churnTrend?.thisPeriod ?? 0} (was ${m.churnTrend?.lastPeriod ?? 0} last period)
- New customers: ${m.newCustomers ?? 0}

One action. Direct. Start with a verb.`;
}
