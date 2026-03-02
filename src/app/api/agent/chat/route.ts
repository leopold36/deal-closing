import { NextResponse } from "next/server";
import { query } from "@anthropic-ai/claude-agent-sdk";
import { agentMcpServer } from "@/lib/agent-tools";
import { db } from "@/db";
import { chatMessages } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { v4 as uuid } from "uuid";

// Allow Agent SDK to spawn claude subprocess even inside a Claude Code session
delete process.env.CLAUDECODE;

export async function POST(req: Request) {
  const { message, dealId, userId } = await req.json();

  // Save user message
  await db.insert(chatMessages).values({
    id: uuid(),
    dealId,
    role: "user",
    content: message,
    timestamp: new Date().toISOString(),
  });

  // Get chat history
  const history = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.dealId, dealId))
    .orderBy(asc(chatMessages.timestamp));

  // Build messages array for conversation context
  const historyLines = history.map(
    (m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`
  );
  const conversationContext =
    historyLines.length > 1
      ? `Previous conversation:\n${historyLines.slice(0, -1).join("\n")}\n\n`
      : "";

  const prompt = `${conversationContext}User: ${message}`;

  const systemPrompt = `You are a deal closing assistant at LGT. You help users fill in deal information by extracting data from uploaded documents (SPAs, cap tables, term sheets, side letters, etc.) or through conversation.

Current deal ID: ${dealId}
Current user ID: ${userId}

When you extract information from a document or conversation:
1. Tell the user what you found and for which field
2. Use suggest_deal_field to create a suggestion — the user will see it in the form and can accept or dismiss it via the UI
3. Do NOT ask for confirmation before suggesting — just suggest the value

You can use get_deal_status to see the current state of the deal.
Be concise and professional. When dealing with documents, look for:
- Deal name / transaction name
- Counterparty names
- Equity tickers or company identifiers
- Investment amounts, purchase prices
- Signing dates, closing dates, settlement dates
- Key terms and conditions for the notes field`;

  try {
    const q = query({
      prompt,
      options: {
        model: "claude-sonnet-4-6",
        systemPrompt,
        maxTurns: 5,
        tools: [],
        permissionMode: "bypassPermissions",
        allowDangerouslySkipPermissions: true,
        mcpServers: {
          "deal-closing-tools": agentMcpServer,
        },
      },
    });

    let fullResponse = "";

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const msg of q) {
            if (msg.type === "assistant") {
              const text = msg.message.content.reduce((acc, block) => {
                if (block.type === "text") {
                  return acc + block.text;
                }
                return acc;
              }, "");

              if (text && text !== fullResponse) {
                const newText = text.slice(fullResponse.length);
                fullResponse = text;
                const data = `data: ${JSON.stringify({ text: newText })}\n\n`;
                controller.enqueue(encoder.encode(data));
              }
            }
          }

          if (fullResponse) {
            await db.insert(chatMessages).values({
              id: uuid(),
              dealId,
              role: "assistant",
              content: fullResponse,
              timestamp: new Date().toISOString(),
            });
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          console.error("Agent stream error:", error);
          const errMsg = `data: ${JSON.stringify({ error: String(error) })}\n\n`;
          controller.enqueue(encoder.encode(errMsg));
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Agent error:", error);
    return NextResponse.json(
      { error: "Agent request failed" },
      { status: 500 }
    );
  }
}
