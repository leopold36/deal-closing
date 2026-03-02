import { pgTable, text, doublePrecision, integer, boolean } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  role: text("role", { enum: ["entry", "approver", "admin"] }).notNull(),
});

export const deals = pgTable("deals", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  counterparty: text("counterparty"),
  equityTicker: text("equity_ticker"),
  investmentAmount: doublePrecision("investment_amount"),
  dealDate: text("deal_date"),
  settlementDate: text("settlement_date"),
  notes: text("notes"),
  status: text("status", {
    enum: ["entry", "pending_approval", "approved", "rejected", "recalled"],
  })
    .notNull()
    .default("entry"),
  createdBy: text("created_by").references(() => users.id),
  assignedApprover: text("assigned_approver").references(() => users.id),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const documents = pgTable("documents", {
  id: text("id").primaryKey(),
  dealId: text("deal_id").references(() => deals.id),
  filename: text("filename").notNull(),
  filepath: text("filepath").notNull(),
  mimeType: text("mime_type"),
  uploadedBy: text("uploaded_by").references(() => users.id),
  uploadedAt: text("uploaded_at").notNull(),
});

export const auditLogs = pgTable("audit_logs", {
  id: text("id").primaryKey(),
  dealId: text("deal_id").references(() => deals.id),
  userId: text("user_id").references(() => users.id),
  action: text("action", {
    enum: [
      "CREATED",
      "FIELD_UPDATED",
      "AGENT_EXTRACTED",
      "AGENT_SUGGESTED",
      "SUBMITTED",
      "APPROVED",
      "REJECTED",
      "RECALLED",
    ],
  }).notNull(),
  fieldName: text("field_name"),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  source: text("source", { enum: ["manual", "agent"] }),
  documentId: text("document_id").references(() => documents.id),
  documentPage: integer("document_page"),
  comment: text("comment"),
  timestamp: text("timestamp").notNull(),
});

export const suggestions = pgTable("suggestions", {
  id: text("id").primaryKey(),
  dealId: text("deal_id").references(() => deals.id),
  fieldName: text("field_name").notNull(),
  suggestedValue: text("suggested_value").notNull(),
  documentId: text("document_id").references(() => documents.id),
  documentPage: integer("document_page"),
  status: text("status", {
    enum: ["pending", "accepted", "dismissed"],
  })
    .notNull()
    .default("pending"),
  createdAt: text("created_at").notNull(),
});

export const fieldApprovals = pgTable("field_approvals", {
  id: text("id").primaryKey(),
  dealId: text("deal_id").references(() => deals.id),
  fieldName: text("field_name").notNull(),
  approvedBy: text("approved_by").references(() => users.id),
  approvedAt: text("approved_at").notNull(),
});

export const notifications = pgTable("notifications", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id),
  dealId: text("deal_id").references(() => deals.id),
  message: text("message").notNull(),
  read: boolean("read").default(false),
  createdAt: text("created_at").notNull(),
});

export const chatMessages = pgTable("chat_messages", {
  id: text("id").primaryKey(),
  dealId: text("deal_id").references(() => deals.id),
  role: text("role", { enum: ["user", "assistant"] }).notNull(),
  content: text("content").notNull(),
  timestamp: text("timestamp").notNull(),
});
