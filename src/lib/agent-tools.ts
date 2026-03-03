import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/db";
import {
  deals,
  auditLogs,
  notifications,
  users,
  suggestions,
  documents,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { readDocumentAsText } from "@/lib/document-reader";

export const toolDefinitions: Anthropic.Tool[] = [
  {
    name: "get_deal_status",
    description:
      "Get the current status and field values of the deal being discussed",
    input_schema: {
      type: "object" as const,
      properties: {
        dealId: { type: "string", description: "The deal ID" },
      },
      required: ["dealId"],
    },
  },
  {
    name: "suggest_deal_field",
    description:
      "Suggest a value for a specific field on the deal form. The value will appear as a suggestion that the user can accept or dismiss. Do NOT tell the user to confirm — the UI handles that via accept/dismiss buttons.",
    input_schema: {
      type: "object" as const,
      properties: {
        dealId: { type: "string", description: "The deal ID" },
        field: {
          type: "string",
          enum: [
            "name",
            "counterparty",
            "equityTicker",
            "investmentAmount",
            "dealDate",
            "settlementDate",
            "notes",
          ],
          description: "The field to suggest a value for",
        },
        value: {
          type: "string",
          description: "The suggested value for the field",
        },
        userId: {
          type: "string",
          description: "The user ID performing the action",
        },
        documentId: {
          type: "string",
          description: "The document ID if extracted from a document",
        },
        documentPage: {
          type: "number",
          description: "The page number if extracted from a document",
        },
      },
      required: ["dealId", "field", "value", "userId"],
    },
  },
  {
    name: "send_notification",
    description: "Send an in-app notification to a user",
    input_schema: {
      type: "object" as const,
      properties: {
        userEmail: {
          type: "string",
          description: "Email of the user to notify",
        },
        dealId: { type: "string", description: "The related deal ID" },
        message: {
          type: "string",
          description: "The notification message",
        },
      },
      required: ["userEmail", "dealId", "message"],
    },
  },
  {
    name: "read_document",
    description:
      "Read the text content of an uploaded document. Use this to extract deal information from uploaded files.",
    input_schema: {
      type: "object" as const,
      properties: {
        documentId: {
          type: "string",
          description: "The document ID to read",
        },
      },
      required: ["documentId"],
    },
  },
];

export async function executeToolCall(
  name: string,
  input: Record<string, unknown>
): Promise<string> {
  switch (name) {
    case "get_deal_status": {
      const { dealId } = input as { dealId: string };
      const [deal] = await db
        .select()
        .from(deals)
        .where(eq(deals.id, dealId));
      if (!deal) return "Deal not found";
      return JSON.stringify(deal, null, 2);
    }

    case "suggest_deal_field": {
      const { dealId, field, value, userId, documentId, documentPage } =
        input as {
          dealId: string;
          field: string;
          value: string;
          userId: string;
          documentId?: string;
          documentPage?: number;
        };
      const [deal] = await db
        .select()
        .from(deals)
        .where(eq(deals.id, dealId));
      if (!deal) return "Deal not found";

      const now = new Date().toISOString();

      await db.insert(suggestions).values({
        id: uuid(),
        dealId,
        fieldName: field,
        suggestedValue: value,
        documentId: documentId ?? null,
        documentPage: documentPage ?? null,
        status: "pending",
        createdAt: now,
      });

      await db.insert(auditLogs).values({
        id: uuid(),
        dealId,
        userId,
        action: "AGENT_SUGGESTED",
        fieldName: field,
        oldValue: null,
        newValue: value,
        source: "agent",
        documentId: documentId ?? null,
        documentPage: documentPage ?? null,
        timestamp: now,
      });

      return `Suggested "${value}" for ${field}. The user will see this in the suggestion column and can accept or dismiss it.`;
    }

    case "send_notification": {
      const { userEmail, dealId, message } = input as {
        userEmail: string;
        dealId: string;
        message: string;
      };
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, userEmail));
      if (!user) return `User ${userEmail} not found`;

      await db.insert(notifications).values({
        id: uuid(),
        userId: user.id,
        dealId,
        message,
        createdAt: new Date().toISOString(),
      });

      return `Notification sent to ${userEmail}`;
    }

    case "read_document": {
      const { documentId } = input as { documentId: string };
      const [doc] = await db
        .select()
        .from(documents)
        .where(eq(documents.id, documentId));
      if (!doc) return "Document not found";

      try {
        const text = await readDocumentAsText(doc.filepath);
        return `Document: ${doc.filename}\n\n${text}`;
      } catch (error) {
        return `Failed to read document: ${String(error)}`;
      }
    }

    default:
      return `Unknown tool: ${name}`;
  }
}
