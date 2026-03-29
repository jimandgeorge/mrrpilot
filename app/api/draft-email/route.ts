import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "@/lib/supabase-admin";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { email, plan, mrr, daysPastDue, monthsAsCustomer, totalPaid } = await request.json();

  const fmt = (p: number) => `£${(p / 100).toLocaleString("en-GB", { maximumFractionDigits: 0 })}`;

  const prompt = `You are helping a SaaS founder write a short, personal email to a customer whose subscription payment has failed.

Customer: ${email}
Plan: ${plan} (${fmt(mrr)}/mo)
Payment overdue by: ${daysPastDue} day${daysPastDue !== 1 ? "s" : ""}
Customer for: ${monthsAsCustomer} month${monthsAsCustomer !== 1 ? "s" : ""}
Total paid to date: ${fmt(totalPaid)}

Write 3–4 sentences the founder can send directly from their personal email. Sound like a real person who genuinely wants to help — not an automated payment reminder. Don't lead with "your payment failed" — instead check in, offer to help, mention you noticed something and wanted to reach out. End with a clear, low-friction next step (reply, a quick call, a link to update payment details).

No subject line. No sign-off. Just the email body.`;

  const stream = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 300,
    messages: [{ role: "user", content: prompt }],
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
