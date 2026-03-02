import { tool, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod/v4";
import { db } from "@/db";
import { deals, auditLogs, notifications, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";

const getDealStatus = tool(
  "get_deal_status",
  "Get the current status and field values of the deal being discussed",
  {
    dealId: z.string().describe("The deal ID"),
  },
  async ({ dealId }) => {
    const deal = db.select().from(deals).where(eq(deals.id, dealId)).get();
    if (!deal) {
      return { content: [{ type: "text" as const, text: "Deal not found" }] };
    }
    return {
      content: [{ type: "text" as const, text: JSON.stringify(deal, null, 2) }],
    };
  }
);

const updateDealField = tool(
  "update_deal_field",
  "Update a specific field on the deal form. Only use after the user confirms the value.",
  {
    dealId: z.string().describe("The deal ID"),
    field: z
      .enum([
        "name",
        "counterparty",
        "equityTicker",
        "investmentAmount",
        "dealDate",
        "settlementDate",
        "notes",
      ])
      .describe("The field to update"),
    value: z.string().describe("The new value for the field"),
    userId: z.string().describe("The user ID performing the action"),
    documentId: z
      .string()
      .optional()
      .describe("The document ID if extracted from a document"),
    documentPage: z
      .number()
      .optional()
      .describe("The page number if extracted from a document"),
  },
  async ({ dealId, field, value, userId, documentId, documentPage }) => {
    const deal = db.select().from(deals).where(eq(deals.id, dealId)).get();
    if (!deal) {
      return { content: [{ type: "text" as const, text: "Deal not found" }] };
    }

    const oldValue = (deal as Record<string, unknown>)[field];
    const now = new Date().toISOString();
    const parsedValue =
      field === "investmentAmount" ? parseFloat(value) : value;

    db.update(deals)
      .set({ [field]: parsedValue, updatedAt: now })
      .where(eq(deals.id, dealId))
      .run();

    db.insert(auditLogs)
      .values({
        id: uuid(),
        dealId,
        userId,
        action: "AGENT_EXTRACTED",
        fieldName: field,
        oldValue: oldValue != null ? String(oldValue) : null,
        newValue: String(value),
        source: "agent",
        documentId: documentId ?? null,
        documentPage: documentPage ?? null,
        timestamp: now,
      })
      .run();

    return {
      content: [
        { type: "text" as const, text: `Updated ${field} to "${value}"` },
      ],
    };
  }
);

const sendNotification = tool(
  "send_notification",
  "Send an in-app notification to a user",
  {
    userEmail: z.string().describe("Email of the user to notify"),
    dealId: z.string().describe("The related deal ID"),
    message: z.string().describe("The notification message"),
  },
  async ({ userEmail, dealId, message }) => {
    const user = db
      .select()
      .from(users)
      .where(eq(users.email, userEmail))
      .get();
    if (!user) {
      return {
        content: [
          { type: "text" as const, text: `User ${userEmail} not found` },
        ],
      };
    }

    db.insert(notifications)
      .values({
        id: uuid(),
        userId: user.id,
        dealId,
        message,
        createdAt: new Date().toISOString(),
      })
      .run();

    return {
      content: [
        { type: "text" as const, text: `Notification sent to ${userEmail}` },
      ],
    };
  }
);

export const agentMcpServer = createSdkMcpServer({
  name: "deal-closing-tools",
  version: "1.0.0",
  tools: [getDealStatus, updateDealField, sendNotification],
});
