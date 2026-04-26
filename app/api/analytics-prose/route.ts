import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { checkRateLimit } from "@/lib/rate-limit";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!checkRateLimit("analytics-prose", user.id, 10, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

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
    ? m.planRevenue.map((p: any) => `${p.name}: ${p.customers} customer${p.customers !== 1 ? "s" : ""} · ${fmt(p.mrr)}/mo (${p.pct}%)`).join(", ")
    : "";

  const churnLine = m.churnTrend?.thisPeriod > 0
    ? `${m.churnTrend.thisPeriod} formal cancellation${m.churnTrend.thisPeriod !== 1 ? "s" : ""} this period vs ${m.churnTrend.lastPeriod} last period.`
    : "0 formal subscription cancellations this period.";

  const atRiskLine = m.churnRisk?.length
    ? `At-risk customers: ${(m.churnRisk as any[]).map((c: any) => `${c.email} (${c.daysPastDue}d overdue, ${fmt(c.mrr)}/mo)`).join(", ")}.`
    : "";

  return `You are writing 3 short plain-English sections for a SaaS founder's revenue dashboard. Each section replaces a chart — your words are the data. Sound like a sharp analyst who knows this specific business, not a generic report.

Rules:
- Be specific with £ numbers
- Name specific customers or emails when they appear in the data — don't say "a customer", say their email
- Explain WHY things happened, not just what (e.g. "expansion drove the gain" not just "MRR grew")
- End each section with one concrete action or implication
- No bullet points, no headers inside the text, no "great news"
- 2–3 sentences per section
- CRITICAL: Only state what the data directly shows. Never say the data is wrong, incomplete, or that measurement is broken.
- CRITICAL: If formal cancellations = 0 but contraction or waterfall churn > 0, that means customers downgraded or quietly lapsed — say exactly that, do not question the measurement.

Data:
- MRR: ${fmt(m.mrr)} | MoM: ${m.mrrMoM !== null ? `${m.mrrMoM >= 0 ? "+" : ""}${m.mrrMoM}%` : "n/a"} | NRR: ${m.nrr !== null ? `${m.nrr}%` : "n/a"} | Quick Ratio: ${m.quickRatio ?? "n/a"}
- ${waterfallLine}
- Contraction (downgrades): ${fmt(m.contractionRevenue ?? 0)} | Silent exits (no cancellation event): ${fmt(m.waterfallChurnRevenue ?? 0)}
- Revenue breakdown: ${fmt(m.breakdown?.new ?? 0)} new, ${fmt(m.breakdown?.renewal ?? 0)} renewals, ${fmt(m.breakdown?.upgrade ?? 0)} expansion
- Plans: ${plansLine || "no plan data"}
- ${churnLine}
- Formal churn revenue: ${fmt(m.churnRevenue ?? 0)} | Churn rate (cancellations only): ${m.churnRate !== undefined ? `${(m.churnRate).toFixed(1)}%` : "n/a"}
- ARPU: ${fmt(m.arpu ?? 0)}
${atRiskLine ? `- ${atRiskLine}` : ""}

Return a JSON object with exactly these three keys. No markdown fences.

"momentum": What drove last month's MRR change and whether the trajectory is improving or stalling. End with what this means for the next 60 days.

"mix": Which plans or segments are carrying the revenue, whether there's concentration risk, and whether the renewal base looks stable.

"churn": Use the contraction and silent-exit figures, not just the cancellation count. State plainly what type of revenue loss occurred (downgrades vs exits vs cancellations), name at-risk customers if present, and give one specific action.`;
}
