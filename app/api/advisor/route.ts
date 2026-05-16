import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response("ANTHROPIC_API_KEY is not set", { status: 500 });
  }

  const { messages, systemPrompt } = await req.json();

  const stream = anthropic.messages.stream({
    model: "claude-sonnet-4-5",
    max_tokens: 1500,
    system: [
      {
        type: "text",
        text: systemPrompt,
        // Prompt caching: the financial snapshot is the same across all turns
        // in a session, so subsequent messages are ~10x cheaper on the context.
        cache_control: { type: "ephemeral" },
      } as any,
    ],
    messages,
  });

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            controller.enqueue(new TextEncoder().encode(chunk.delta.text));
          }
        }
      } finally {
        controller.close();
      }
    },
    cancel() {
      stream.abort();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
}
