import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "@/lib/supabase-admin";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await request.json();

  try {
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 600,
      messages: [{ role: "user", content: buildPrompt(data) }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";

    // Parse JSON from response, stripping any markdown fences
    const cleaned = text.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
    const sections = JSON.parse(cleaned);

    return NextResponse.json(sections);
  } catch {
    return NextResponse.json({ momentum: null, mix: null, churn: null });
  }
}

function buildPrompt(m: any) {
  const fmt = (p: number) => `£${Math.round(p / 100).toLocaleString("en-GB")}`;

  const lastWaterfall = m.mrrWaterfall?.[m.mrrWaterfall.length - 1];
  const waterfallLine = lastWaterfall
    ? `Last month: +${fmt(lastWaterfall.new * 100)} new, +${fmt(lastWaterfall.expansion * 100)} expansion, ${fmt(Math.abs(lastWaterfall.contraction) * 100)} contraction, ${fmt(Math.abs(lastWaterfall.churn) * 100)} churn, net ${lastWaterfall.net >= 0 ? "+" : ""}${fmt(lastWaterfall.net * 100)}.`
    : "";

  const plansLine = m.planRevenue?.length
    ? m.planRevenue.map((p: any) => `${p.name}: ${p.customers} customer${p.customers !== 1 ? "s" : ""} · ${fmt(p.mrr * 100)}/mo (${p.pct}%)`).join(", ")
    : "";

  const churnLine = m.churnTrend?.thisPeriod > 0
    ? `${m.churnTrend.thisPeriod} cancellation${m.churnTrend.thisPeriod !== 1 ? "s" : ""} this period vs ${m.churnTrend.lastPeriod} last period.`
    : "No cancellations this period.";

  return `You are writing 3 short plain-English sections for a SaaS founder's revenue dashboard. Each section replaces a chart — your words are the data visualisation. Be specific with numbers. Sound like a sharp analyst, not a report. No bullet points. No headers inside the text. No "great news". 2–3 sentences each.

Data:
- MRR: ${fmt(m.mrr)} | MoM: ${m.mrrMoM !== null ? `${m.mrrMoM >= 0 ? "+" : ""}${m.mrrMoM}%` : "n/a"} | NRR: ${m.nrr !== null ? `${m.nrr}%` : "n/a"} | Quick Ratio: ${m.quickRatio ?? "n/a"}
- ${waterfallLine}
- Revenue breakdown: ${fmt(m.breakdown?.new ?? 0)} new, ${fmt(m.breakdown?.renewal ?? 0)} renewals, ${fmt(m.breakdown?.upgrade ?? 0)} expansion
- Plans: ${plansLine || "no plan data"}
- ${churnLine}
- Churn rate: ${m.churnRate !== undefined ? `${(m.churnRate).toFixed(1)}%` : "n/a"} | Lost to churn: ${fmt(m.churnRevenue ?? 0)}
- ARPU: ${fmt(m.arpu ?? 0)}

Return a JSON object with exactly these three keys. No markdown fences.

"momentum": 2–3 sentences on MRR movement — what drove last month's change, whether growth is accelerating or stalling, and what the trend means for the next few months.

"mix": 2–3 sentences on revenue composition — which plans are pulling their weight, any concentration risk, whether the renewal base is healthy.

"churn": 2–3 sentences on churn — rate, cancellations this period, trend vs last period. If churn is low or zero, say so plainly and note what that means for NRR or retention.`;
}
