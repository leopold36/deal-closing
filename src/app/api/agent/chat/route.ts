import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { toolDefinitions, executeToolCall } from "@/lib/agent-tools";
import { db } from "@/db";
import { chatMessages } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { v4 as uuid } from "uuid";

export const maxDuration = 60;

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY?.trim(),
});

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

## Document handling

When a user uploads a document, ALWAYS follow these steps:
1. Call read_document with the document ID provided in the message to read its content
2. Analyze the content and identify which deal fields have relevant data
3. Present the fields you found data for using this EXACT format — one per line:
   [FIELD:name] Deal Name
   [FIELD:counterparty] Counterparty
   [FIELD:equityTicker] Equity Ticker
   [FIELD:investmentAmount] Investment Amount
   [FIELD:dealDate] Deal Date
   [FIELD:settlementDate] Settlement Date
   [FIELD:notes] Notes
   Only include fields where you actually found relevant data in the document.
4. Tell the user: "Click on any field above to extract its value, or say 'extract all' to fill in everything I found."

## Extracting values

When the user asks to extract a specific field (e.g., "Please extract the value for: Investment Amount") or says "extract all":
1. Use suggest_deal_field for each requested field with the value you found in the document
2. Include the documentId parameter so the suggestion is linked to the source document
3. Do NOT ask for confirmation — just suggest the values directly

## General conversation

When extracting information from conversation (not documents):
1. Tell the user what you found and for which field
2. Use suggest_deal_field to create a suggestion
3. Do NOT ask for confirmation before suggesting

You can use get_deal_status to see the current state of the deal.
Be concise and professional. When dealing with documents, look for:
- Deal name / transaction name
- Counterparty names
- Equity tickers or company identifiers
- Investment amounts, purchase prices
- Signing dates, closing dates, settlement dates
- Key terms and conditions for the notes field`;

  try {
    let fullResponse = "";
    const encoder = new TextEncoder();

    const responseStream = new ReadableStream({
      async start(controller) {
        try {
          const messages: Anthropic.MessageParam[] = [
            { role: "user", content: prompt },
          ];

          const MAX_TURNS = 5;
          for (let turn = 0; turn < MAX_TURNS; turn++) {
            const stream = client.messages.stream({
              model: "claude-sonnet-4-6",
              max_tokens: 4096,
              system: systemPrompt,
              tools: toolDefinitions,
              messages,
            });

            stream.on("text", (textDelta) => {
              fullResponse += textDelta;
              const data = `data: ${JSON.stringify({ text: textDelta })}\n\n`;
              controller.enqueue(encoder.encode(data));
            });

            const response = await stream.finalMessage();

            if (response.stop_reason === "tool_use") {
              // Add assistant message to conversation
              messages.push({ role: "assistant", content: response.content });

              // Execute tool calls and collect results
              const toolResults: Anthropic.ToolResultBlockParam[] = [];
              for (const block of response.content) {
                if (block.type === "tool_use") {
                  const result = await executeToolCall(
                    block.name,
                    block.input as Record<string, unknown>
                  );
                  toolResults.push({
                    type: "tool_result",
                    tool_use_id: block.id,
                    content: result,
                  });
                }
              }

              messages.push({ role: "user", content: toolResults });
            } else {
              break;
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

    return new Response(responseStream, {
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
