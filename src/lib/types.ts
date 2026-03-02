export type DealStatus = "entry" | "pending_approval" | "approved" | "rejected" | "recalled";

export type Deal = {
  id: string;
  name: string;
  counterparty: string | null;
  equityTicker: string | null;
  investmentAmount: number | null;
  dealDate: string | null;
  settlementDate: string | null;
  notes: string | null;
  status: DealStatus;
  createdBy: string | null;
  assignedApprover: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AuditLog = {
  id: string;
  dealId: string;
  userId: string;
  action: string;
  fieldName: string | null;
  oldValue: string | null;
  newValue: string | null;
  source: "manual" | "agent" | null;
  documentId: string | null;
  documentPage: number | null;
  comment: string | null;
  timestamp: string;
  userName?: string;
  userEmail?: string;
};

export type ChatMessage = {
  id: string;
  dealId: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
};

export type Notification = {
  id: string;
  userId: string;
  dealId: string;
  message: string;
  read: boolean;
  createdAt: string;
};

export type Suggestion = {
  id: string;
  dealId: string;
  fieldName: string;
  suggestedValue: string;
  documentId: string | null;
  documentPage: number | null;
  status: "pending" | "accepted" | "dismissed";
  createdAt: string;
};

export type FieldApproval = {
  id: string;
  dealId: string;
  fieldName: string;
  approvedBy: string;
  approvedAt: string;
};

export const DEAL_FIELDS = [
  { key: "name", label: "Deal Name", type: "text" },
  { key: "counterparty", label: "Counterparty", type: "text" },
  { key: "equityTicker", label: "Equity Ticker", type: "text" },
  { key: "investmentAmount", label: "Investment Amount", type: "currency" },
  { key: "dealDate", label: "Deal Date", type: "date" },
  { key: "settlementDate", label: "Settlement Date", type: "date" },
  { key: "notes", label: "Notes", type: "textarea" },
] as const;

export type DealFieldKey = (typeof DEAL_FIELDS)[number]["key"];
