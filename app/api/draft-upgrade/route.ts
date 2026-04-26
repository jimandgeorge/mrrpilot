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

  if (!checkRateLimit("draft-upgrade", user.id, 10, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { email, planName, mrr, monthsAsCustomer, totalPaid } = await request.json();

  const fmt = (p: number) => `£${(p / 100).toFixed(0)}`;

  const prompt = `You are helping a SaaS founder write a short, personal email to a loyal customer who might be ready for more value from the product.

Customer: ${email}
Current plan: ${planName} (${fmt(mrr)}/mo)
Customer for: ${monthsAsCustomer} month${monthsAsCustomer !== 1 ? "s" : ""}
Total paid to date: ${fmt(totalPaid)}

Write 3–4 sentences the founder can send from their personal email. This should feel like a genuine check-in — not a sales pitch. Acknowledge their loyalty subtly. Ask if they're getting full value or if there's anything they wish the product did. End with a soft, natural invitation to explore a higher tier or have a quick conversation.

No subject line. No sign-off. Just the email body.`;

  const stream = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 250,
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

  return new Response(readable, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
