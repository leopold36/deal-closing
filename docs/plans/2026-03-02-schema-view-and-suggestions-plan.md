# Database Schema View & AI Suggestion Column — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an interactive Database Schema page and convert the agent from direct-write to a suggestion staging workflow with accept/dismiss in the deal form.

**Architecture:** New `suggestions` SQLite table holds agent-proposed values. The agent tool writes there instead of to `deals`. The deal form gains a suggestion column between label and input. A new `/schema` page renders a CSS/SVG ER diagram of all tables. No external libraries needed.

**Tech Stack:** Next.js 15, Drizzle ORM + SQLite, Tailwind CSS v4, shadcn/ui, Claude Agent SDK, SWR, lucide-react

---

### Task 1: Add `suggestions` table to database schema

**Files:**
- Modify: `src/db/schema.ts:40-62` (add table, extend audit action enum)
- Modify: `src/lib/types.ts` (add Suggestion type, extend AuditLog action)

**Step 1: Add the suggestions table to schema.ts**

Add after the `auditLogs` table definition (before `notifications`):

```typescript
export const suggestions = sqliteTable("suggestions", {
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
```

Also update the `auditLogs.action` enum to include `"AGENT_SUGGESTED"`:
```typescript
action: text("action", {
    enum: [
      "CREATED",
      "FIELD_UPDATED",
      "AGENT_EXTRACTED",
      "AGENT_SUGGESTED",
      "SUBMITTED",
      "APPROVED",
      "REJECTED",
    ],
  }).notNull(),
```

**Step 2: Add Suggestion type to types.ts**

Add after the `Notification` type:

```typescript
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
```

**Step 3: Regenerate database and push schema**

Run: `cd "/Users/leopoldhaex/LEHA/LGT/AI - Application/Deal Closing" && npx drizzle-kit push`

Expected: Schema pushed successfully, new `suggestions` table created.

**Step 4: Commit**

```bash
git add src/db/schema.ts src/lib/types.ts
git commit -m "feat: add suggestions table and AGENT_SUGGESTED audit action"
```

---

### Task 2: Add suggestions API endpoints

**Files:**
- Create: `src/app/api/deals/[id]/suggestions/route.ts`
- Create: `src/app/api/suggestions/[id]/accept/route.ts`
- Create: `src/app/api/suggestions/[id]/dismiss/route.ts`

**Step 1: Create GET endpoint for deal suggestions**

Create `src/app/api/deals/[id]/suggestions/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { db } from "@/db";
import { suggestions } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const rows = db
    .select()
    .from(suggestions)
    .where(and(eq(suggestions.dealId, id), eq(suggestions.status, "pending")))
    .all();
  return NextResponse.json(rows);
}
```

**Step 2: Create accept endpoint**

Create `src/app/api/suggestions/[id]/accept/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { db } from "@/db";
import { suggestions, deals, auditLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { userId } = await req.json();

  const suggestion = db
    .select()
    .from(suggestions)
    .where(eq(suggestions.id, id))
    .get();
  if (!suggestion) {
    return NextResponse.json(
      { error: "Suggestion not found" },
      { status: 404 }
    );
  }

  const deal = db
    .select()
    .from(deals)
    .where(eq(deals.id, suggestion.dealId))
    .get();
  if (!deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  const now = new Date().toISOString();
  const oldValue = (deal as Record<string, unknown>)[suggestion.fieldName];
  const fieldValue =
    suggestion.fieldName === "investmentAmount"
      ? parseFloat(suggestion.suggestedValue)
      : suggestion.suggestedValue;

  // Update the deal field
  db.update(deals)
    .set({ [suggestion.fieldName]: fieldValue, updatedAt: now })
    .where(eq(deals.id, suggestion.dealId))
    .run();

  // Mark suggestion as accepted
  db.update(suggestions)
    .set({ status: "accepted" })
    .where(eq(suggestions.id, id))
    .run();

  // Create audit log
  db.insert(auditLogs)
    .values({
      id: uuid(),
      dealId: suggestion.dealId,
      userId,
      action: "AGENT_EXTRACTED",
      fieldName: suggestion.fieldName,
      oldValue: oldValue != null ? String(oldValue) : null,
      newValue: suggestion.suggestedValue,
      source: "agent",
      documentId: suggestion.documentId,
      documentPage: suggestion.documentPage,
      timestamp: now,
    })
    .run();

  return NextResponse.json({ success: true });
}
```

**Step 3: Create dismiss endpoint**

Create `src/app/api/suggestions/[id]/dismiss/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { db } from "@/db";
import { suggestions } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const suggestion = db
    .select()
    .from(suggestions)
    .where(eq(suggestions.id, id))
    .get();
  if (!suggestion) {
    return NextResponse.json(
      { error: "Suggestion not found" },
      { status: 404 }
    );
  }

  db.update(suggestions)
    .set({ status: "dismissed" })
    .where(eq(suggestions.id, id))
    .run();

  return NextResponse.json({ success: true });
}
```

**Step 4: Verify the build compiles**

Run: `cd "/Users/leopoldhaex/LEHA/LGT/AI - Application/Deal Closing" && npx next build 2>&1 | tail -5`

Expected: Build succeeds.

**Step 5: Commit**

```bash
git add src/app/api/deals/\[id\]/suggestions/route.ts src/app/api/suggestions/
git commit -m "feat: add suggestions API endpoints (get, accept, dismiss)"
```

---

### Task 3: Change agent tool from direct-write to suggest

**Files:**
- Modify: `src/lib/agent-tools.ts:25-90` (rename tool, change behavior)
- Modify: `src/app/api/agent/chat/route.ts:42-53` (update system prompt)

**Step 1: Update agent-tools.ts**

Replace the `updateDealField` tool with `suggestDealField`. The tool now inserts into the `suggestions` table instead of updating `deals` directly, and creates an `AGENT_SUGGESTED` audit log.

In `src/lib/agent-tools.ts`, replace the entire `updateDealField` constant (lines 25-90) with:

```typescript
const suggestDealField = tool(
  "suggest_deal_field",
  "Suggest a value for a specific field on the deal form. The value will appear as a suggestion that the user can accept or dismiss. Do NOT tell the user to confirm — the UI handles that via accept/dismiss buttons.",
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
      .describe("The field to suggest a value for"),
    value: z.string().describe("The suggested value for the field"),
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

    const now = new Date().toISOString();

    db.insert(suggestions)
      .values({
        id: uuid(),
        dealId,
        fieldName: field,
        suggestedValue: value,
        documentId: documentId ?? null,
        documentPage: documentPage ?? null,
        status: "pending",
        createdAt: now,
      })
      .run();

    db.insert(auditLogs)
      .values({
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
      })
      .run();

    return {
      content: [
        {
          type: "text" as const,
          text: `Suggested "${value}" for ${field}. The user will see this in the suggestion column and can accept or dismiss it.`,
        },
      ],
    };
  }
);
```

Also add the `suggestions` import at the top:
```typescript
import { deals, auditLogs, notifications, users, suggestions } from "@/db/schema";
```

And update the `tools` array in `agentMcpServer`:
```typescript
tools: [getDealStatus, suggestDealField, sendNotification],
```

**Step 2: Update system prompt in chat route**

In `src/app/api/agent/chat/route.ts`, replace the `systemPrompt` string (lines 42-53) with:

```typescript
  const systemPrompt = `You are a deal closing assistant. You help users fill in deal information by extracting data from uploaded documents or through conversation.

Current deal ID: ${dealId}
Current user ID: ${userId}

When you extract information from a document or conversation:
1. Tell the user what you found and for which field
2. Use suggest_deal_field to create a suggestion — the user will see it in the form and can accept or dismiss it via the UI
3. Do NOT ask for confirmation before suggesting — just suggest the value

You can use get_deal_status to see the current state of the deal.
Be concise and professional.`;
```

**Step 3: Verify build**

Run: `cd "/Users/leopoldhaex/LEHA/LGT/AI - Application/Deal Closing" && npx next build 2>&1 | tail -5`

Expected: Build succeeds.

**Step 4: Commit**

```bash
git add src/lib/agent-tools.ts src/app/api/agent/chat/route.ts
git commit -m "feat: change agent from direct-write to suggestion staging"
```

---

### Task 4: Add suggestion column to deal form

**Files:**
- Modify: `src/components/deal-form.tsx` (add suggestion column, accept/dismiss handlers)

**Step 1: Update deal-form.tsx**

The form needs to:
1. Fetch suggestions via SWR: `useSWR<Suggestion[]>(`/api/deals/${dealId}/suggestions`, fetcher)`
2. Add accept/dismiss handlers
3. Change the grid from 3 columns to 4: `grid-cols-[140px_160px_1fr_180px]`
4. Render the suggestion cell between label and input

Replace the full content of `src/components/deal-form.tsx` with:

```typescript
"use client";

import { useState, useCallback } from "react";
import useSWR, { mutate } from "swr";
import { useUser } from "@/lib/user-context";
import { Deal, AuditLog, Suggestion, DEAL_FIELDS } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FieldAuditChip } from "./field-audit-chip";
import { AuditTimeline } from "./audit-timeline";
import { Check, X } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const statusLabels: Record<string, string> = {
  entry: "Data Entry",
  pending_approval: "Pending Approval",
  approved: "Approved",
  rejected: "Rejected",
};

const statusColors: Record<string, string> = {
  entry: "bg-blue-500/10 text-blue-700 border-blue-200",
  pending_approval: "bg-amber-500/10 text-amber-700 border-amber-200",
  approved: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  rejected: "bg-red-500/10 text-red-700 border-red-200",
};

type Props = {
  dealId: string;
};

export function DealForm({ dealId }: Props) {
  const { currentUser } = useUser();
  const { data: deal, mutate: mutateDeal } = useSWR<Deal>(
    `/api/deals/${dealId}`,
    fetcher
  );
  const { data: auditLogs = [] } = useSWR<AuditLog[]>(
    `/api/deals/${dealId}/audit`,
    fetcher
  );
  const { data: pendingSuggestions = [], mutate: mutateSuggestions } = useSWR<
    Suggestion[]
  >(`/api/deals/${dealId}/suggestions`, fetcher);

  const [saving, setSaving] = useState<string | null>(null);

  const handleFieldBlur = useCallback(
    async (field: string, value: string) => {
      if (!deal || !currentUser) return;
      const currentValue = (deal as Record<string, unknown>)[field];
      if (String(currentValue ?? "") === value) return;

      setSaving(field);
      await fetch(`/api/deals/${dealId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          field,
          value: value || null,
          userId: currentUser.id,
          source: "manual",
        }),
      });
      mutateDeal();
      mutate(`/api/deals/${dealId}/audit`);
      setSaving(null);
    },
    [deal, currentUser, dealId, mutateDeal]
  );

  const handleAcceptSuggestion = async (suggestion: Suggestion) => {
    if (!currentUser) return;
    await fetch(`/api/suggestions/${suggestion.id}/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: currentUser.id }),
    });
    mutateDeal();
    mutateSuggestions();
    mutate(`/api/deals/${dealId}/audit`);
  };

  const handleDismissSuggestion = async (suggestion: Suggestion) => {
    await fetch(`/api/suggestions/${suggestion.id}/dismiss`, {
      method: "POST",
    });
    mutateSuggestions();
  };

  const handleSubmitForApproval = async () => {
    if (!currentUser) return;
    await fetch(`/api/deals/${dealId}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: currentUser.id }),
    });
    mutateDeal();
    mutate(`/api/deals/${dealId}/audit`);
  };

  const handleApprove = async () => {
    if (!currentUser) return;
    await fetch(`/api/deals/${dealId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: currentUser.id }),
    });
    mutateDeal();
    mutate(`/api/deals/${dealId}/audit`);
  };

  const handleReject = async () => {
    const comment = prompt("Rejection reason:");
    if (!comment || !currentUser) return;
    await fetch(`/api/deals/${dealId}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: currentUser.id, comment }),
    });
    mutateDeal();
    mutate(`/api/deals/${dealId}/audit`);
  };

  if (!deal) return <p className="text-muted-foreground">Loading...</p>;

  const isEditable = deal.status === "entry" || deal.status === "rejected";

  const getSuggestionForField = (fieldName: string) =>
    pendingSuggestions.find((s) => s.fieldName === fieldName);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">{deal.name}</h2>
        </div>
        <Badge
          className={`${statusColors[deal.status]} text-[11px] font-medium border px-1.5 py-0`}
          variant="secondary"
        >
          {statusLabels[deal.status]}
        </Badge>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[140px_160px_1fr_180px] gap-2 items-center">
        <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
          Field
        </span>
        <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
          AI Suggestion
        </span>
        <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
          Value
        </span>
        <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
          Audit
        </span>
      </div>

      <div className="space-y-2">
        {DEAL_FIELDS.map((field) => {
          const value = String(
            (deal as Record<string, unknown>)[field.key] ?? ""
          );
          const suggestion = getSuggestionForField(field.key);
          return (
            <div
              key={field.key}
              className="grid grid-cols-[140px_160px_1fr_180px] gap-2 items-start"
            >
              <Label className="pt-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {field.label}
              </Label>

              {/* Suggestion cell */}
              <div className="min-h-[32px]">
                {suggestion ? (
                  <div className="flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-2 py-1">
                    <span className="text-xs truncate flex-1 tabular-nums">
                      {suggestion.suggestedValue}
                    </span>
                    <button
                      onClick={() => handleAcceptSuggestion(suggestion)}
                      className="shrink-0 rounded p-0.5 hover:bg-emerald-100 text-emerald-600"
                      title="Accept suggestion"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDismissSuggestion(suggestion)}
                      className="shrink-0 rounded p-0.5 hover:bg-red-100 text-red-500"
                      title="Dismiss suggestion"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <span className="text-[11px] text-muted-foreground/50 pt-1.5 block">
                    —
                  </span>
                )}
              </div>

              {/* Value input */}
              <div>
                {field.type === "textarea" ? (
                  <Textarea
                    defaultValue={value}
                    disabled={!isEditable}
                    onBlur={(e) => handleFieldBlur(field.key, e.target.value)}
                    className="min-h-[60px]"
                  />
                ) : (
                  <Input
                    type={field.type === "currency" ? "number" : field.type}
                    defaultValue={value}
                    disabled={!isEditable}
                    onBlur={(e) => handleFieldBlur(field.key, e.target.value)}
                  />
                )}
                {saving === field.key && (
                  <span className="text-xs text-muted-foreground">
                    Saving...
                  </span>
                )}
              </div>

              {/* Audit chip */}
              <FieldAuditChip fieldName={field.key} auditLogs={auditLogs} />
            </div>
          );
        })}
      </div>

      <div className="flex gap-2 pt-3 border-t">
        {deal.status === "entry" && (
          <Button
            onClick={handleSubmitForApproval}
            size="sm"
            className="h-7 text-xs"
          >
            Submit for Approval
          </Button>
        )}
        {deal.status === "pending_approval" && (
          <>
            <Button
              onClick={handleApprove}
              variant="default"
              size="sm"
              className="h-7 text-xs"
            >
              Approve
            </Button>
            <Button
              onClick={handleReject}
              variant="destructive"
              size="sm"
              className="h-7 text-xs"
            >
              Reject
            </Button>
          </>
        )}
        {deal.status === "approved" && (
          <p className="text-xs text-emerald-600 font-medium">
            This deal has been approved.
          </p>
        )}
      </div>

      <AuditTimeline logs={auditLogs} />
    </div>
  );
}
```

**Step 2: Update chat-panel.tsx to also revalidate suggestions**

In `src/components/chat-panel.tsx`, after the `mutate` calls at line 95, add:

```typescript
    mutate(`/api/deals/${dealId}/suggestions`);
```

So the block at lines 94-96 becomes:

```typescript
    mutateMessages();
    mutate(`/api/deals/${dealId}`);
    mutate(`/api/deals/${dealId}/audit`);
    mutate(`/api/deals/${dealId}/suggestions`);
```

**Step 3: Verify build**

Run: `cd "/Users/leopoldhaex/LEHA/LGT/AI - Application/Deal Closing" && npx next build 2>&1 | tail -5`

Expected: Build succeeds.

**Step 4: Commit**

```bash
git add src/components/deal-form.tsx src/components/chat-panel.tsx
git commit -m "feat: add AI suggestion column to deal form with accept/dismiss"
```

---

### Task 5: Update field-audit-chip to handle AGENT_SUGGESTED action

**Files:**
- Modify: `src/components/field-audit-chip.tsx:24-36` (add icon/label for new action)

**Step 1: Add AGENT_SUGGESTED handling**

In `src/components/field-audit-chip.tsx`, add a `Lightbulb` import from lucide-react (alongside the existing imports), then update the icon/label logic.

Add to imports:
```typescript
import { Pencil, Bot, Check, Lightbulb } from "lucide-react";
```

Replace the `icon` logic (lines 24-31):
```typescript
  const icon =
    lastLog.action === "AGENT_SUGGESTED" ? (
      <Lightbulb className="h-2.5 w-2.5" />
    ) : lastLog.source === "agent" ? (
      <Bot className="h-2.5 w-2.5" />
    ) : lastLog.action === "APPROVED" ? (
      <Check className="h-2.5 w-2.5" />
    ) : (
      <Pencil className="h-2.5 w-2.5" />
    );
```

Replace the `label` logic (lines 33-36):
```typescript
  const label =
    lastLog.action === "AGENT_SUGGESTED"
      ? "AI suggested"
      : lastLog.source === "agent"
        ? `Agent, confirmed by ${lastLog.userEmail}`
        : `${lastLog.userEmail}`;
```

Also update the history display text in the `fieldLogs.map` section (line 58-59):
```typescript
                <div className="font-medium">
                  {log.action === "AGENT_SUGGESTED"
                    ? "AI suggested"
                    : log.source === "agent"
                      ? "Agent extracted"
                      : "Manual update"}{" "}
                  by {log.userEmail}
                </div>
```

**Step 2: Commit**

```bash
git add src/components/field-audit-chip.tsx
git commit -m "feat: show AGENT_SUGGESTED action in field audit chips"
```

---

### Task 6: Create Database Schema page with ER diagram

**Files:**
- Create: `src/app/schema/page.tsx`
- Modify: `src/components/nav-bar.tsx:9-14` (add Schema nav item)

**Step 1: Create the schema page**

Create `src/app/schema/page.tsx`. This is a server component (no `"use client"`) that renders a static ER diagram. Each table is a positioned card. SVG lines connect FK columns to referenced PKs. Below the diagram, a callout explains the audit trail flow.

```tsx
import { Badge } from "@/components/ui/badge";

type Column = {
  name: string;
  type: string;
  constraints: string[];
  fk?: string; // "tableName.column"
};

type TableDef = {
  name: string;
  columns: Column[];
};

const tables: TableDef[] = [
  {
    name: "users",
    columns: [
      { name: "id", type: "TEXT", constraints: ["PK"] },
      { name: "name", type: "TEXT", constraints: ["NOT NULL"] },
      { name: "email", type: "TEXT", constraints: ["NOT NULL", "UNIQUE"] },
      { name: "role", type: "TEXT", constraints: ["NOT NULL"] },
    ],
  },
  {
    name: "deals",
    columns: [
      { name: "id", type: "TEXT", constraints: ["PK"] },
      { name: "name", type: "TEXT", constraints: ["NOT NULL"] },
      { name: "counterparty", type: "TEXT", constraints: [] },
      { name: "equity_ticker", type: "TEXT", constraints: [] },
      { name: "investment_amount", type: "REAL", constraints: [] },
      { name: "deal_date", type: "TEXT", constraints: [] },
      { name: "settlement_date", type: "TEXT", constraints: [] },
      { name: "notes", type: "TEXT", constraints: [] },
      { name: "status", type: "TEXT", constraints: ["NOT NULL"] },
      { name: "created_by", type: "TEXT", constraints: ["FK"], fk: "users.id" },
      {
        name: "assigned_approver",
        type: "TEXT",
        constraints: ["FK"],
        fk: "users.id",
      },
      { name: "created_at", type: "TEXT", constraints: ["NOT NULL"] },
      { name: "updated_at", type: "TEXT", constraints: ["NOT NULL"] },
    ],
  },
  {
    name: "documents",
    columns: [
      { name: "id", type: "TEXT", constraints: ["PK"] },
      {
        name: "deal_id",
        type: "TEXT",
        constraints: ["FK"],
        fk: "deals.id",
      },
      { name: "filename", type: "TEXT", constraints: ["NOT NULL"] },
      { name: "filepath", type: "TEXT", constraints: ["NOT NULL"] },
      { name: "mime_type", type: "TEXT", constraints: [] },
      {
        name: "uploaded_by",
        type: "TEXT",
        constraints: ["FK"],
        fk: "users.id",
      },
      { name: "uploaded_at", type: "TEXT", constraints: ["NOT NULL"] },
    ],
  },
  {
    name: "suggestions",
    columns: [
      { name: "id", type: "TEXT", constraints: ["PK"] },
      {
        name: "deal_id",
        type: "TEXT",
        constraints: ["FK"],
        fk: "deals.id",
      },
      { name: "field_name", type: "TEXT", constraints: ["NOT NULL"] },
      { name: "suggested_value", type: "TEXT", constraints: ["NOT NULL"] },
      {
        name: "document_id",
        type: "TEXT",
        constraints: ["FK"],
        fk: "documents.id",
      },
      { name: "document_page", type: "INTEGER", constraints: [] },
      { name: "status", type: "TEXT", constraints: ["NOT NULL"] },
      { name: "created_at", type: "TEXT", constraints: ["NOT NULL"] },
    ],
  },
  {
    name: "audit_logs",
    columns: [
      { name: "id", type: "TEXT", constraints: ["PK"] },
      {
        name: "deal_id",
        type: "TEXT",
        constraints: ["FK"],
        fk: "deals.id",
      },
      {
        name: "user_id",
        type: "TEXT",
        constraints: ["FK"],
        fk: "users.id",
      },
      { name: "action", type: "TEXT", constraints: ["NOT NULL"] },
      { name: "field_name", type: "TEXT", constraints: [] },
      { name: "old_value", type: "TEXT", constraints: [] },
      { name: "new_value", type: "TEXT", constraints: [] },
      { name: "source", type: "TEXT", constraints: [] },
      {
        name: "document_id",
        type: "TEXT",
        constraints: ["FK"],
        fk: "documents.id",
      },
      { name: "document_page", type: "INTEGER", constraints: [] },
      { name: "comment", type: "TEXT", constraints: [] },
      { name: "timestamp", type: "TEXT", constraints: ["NOT NULL"] },
    ],
  },
  {
    name: "notifications",
    columns: [
      { name: "id", type: "TEXT", constraints: ["PK"] },
      {
        name: "user_id",
        type: "TEXT",
        constraints: ["FK"],
        fk: "users.id",
      },
      {
        name: "deal_id",
        type: "TEXT",
        constraints: ["FK"],
        fk: "deals.id",
      },
      { name: "message", type: "TEXT", constraints: ["NOT NULL"] },
      { name: "read", type: "INTEGER", constraints: [] },
      { name: "created_at", type: "TEXT", constraints: ["NOT NULL"] },
    ],
  },
  {
    name: "chat_messages",
    columns: [
      { name: "id", type: "TEXT", constraints: ["PK"] },
      {
        name: "deal_id",
        type: "TEXT",
        constraints: ["FK"],
        fk: "deals.id",
      },
      { name: "role", type: "TEXT", constraints: ["NOT NULL"] },
      { name: "content", type: "TEXT", constraints: ["NOT NULL"] },
      { name: "timestamp", type: "TEXT", constraints: ["NOT NULL"] },
    ],
  },
];

function TableCard({ table }: { table: TableDef }) {
  return (
    <div className="border rounded-md bg-card shadow-sm overflow-hidden">
      <div className="bg-slate-900 text-white px-3 py-1.5">
        <span className="text-xs font-semibold tracking-wide">
          {table.name}
        </span>
      </div>
      <div className="divide-y divide-border/50">
        {table.columns.map((col) => (
          <div
            key={col.name}
            className="flex items-center gap-2 px-3 py-1 text-[11px]"
          >
            <span
              className={`font-mono flex-1 ${col.constraints.includes("PK") ? "font-bold" : ""} ${col.fk ? "text-blue-600" : ""}`}
            >
              {col.name}
            </span>
            <span className="text-muted-foreground font-mono">{col.type}</span>
            <div className="flex gap-0.5">
              {col.constraints.includes("PK") && (
                <Badge
                  variant="secondary"
                  className="text-[9px] px-1 py-0 h-4 bg-amber-100 text-amber-800 border-amber-200"
                >
                  PK
                </Badge>
              )}
              {col.constraints.includes("FK") && (
                <Badge
                  variant="secondary"
                  className="text-[9px] px-1 py-0 h-4 bg-blue-100 text-blue-700 border-blue-200"
                >
                  FK
                </Badge>
              )}
              {col.constraints.includes("NOT NULL") && (
                <Badge
                  variant="outline"
                  className="text-[9px] px-1 py-0 h-4"
                >
                  NN
                </Badge>
              )}
              {col.constraints.includes("UNIQUE") && (
                <Badge
                  variant="outline"
                  className="text-[9px] px-1 py-0 h-4"
                >
                  UQ
                </Badge>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SchemaPage() {
  return (
    <div className="px-4 py-3 max-w-7xl mx-auto space-y-4">
      <div>
        <h1 className="text-base font-semibold">Database Schema</h1>
        <p className="text-xs text-muted-foreground">
          Entity-relationship diagram of the SQLite database powering the deal
          closing workflow.
        </p>
      </div>

      {/* ER Diagram — 3-column grid layout */}
      <div className="grid grid-cols-3 gap-4">
        {/* Left column: users */}
        <div className="space-y-4">
          <TableCard table={tables[0]} />
        </div>

        {/* Center column: deals, suggestions */}
        <div className="space-y-4">
          <TableCard table={tables[1]} />
          <TableCard table={tables[3]} />
        </div>

        {/* Right column: documents, audit_logs, notifications, chat_messages */}
        <div className="space-y-4">
          <TableCard table={tables[2]} />
          <TableCard table={tables[4]} />
          <TableCard table={tables[5]} />
          <TableCard table={tables[6]} />
        </div>
      </div>

      {/* Foreign Key Legend */}
      <div className="border rounded-md bg-card p-4 space-y-3">
        <h2 className="text-sm font-semibold">Foreign Key Relationships</h2>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-mono text-blue-600">deals.created_by</span>
            <span className="text-muted-foreground">&rarr;</span>
            <span className="font-mono">users.id</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-blue-600">
              deals.assigned_approver
            </span>
            <span className="text-muted-foreground">&rarr;</span>
            <span className="font-mono">users.id</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-blue-600">
              audit_logs.deal_id
            </span>
            <span className="text-muted-foreground">&rarr;</span>
            <span className="font-mono">deals.id</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-blue-600">
              audit_logs.user_id
            </span>
            <span className="text-muted-foreground">&rarr;</span>
            <span className="font-mono">users.id</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-blue-600">
              audit_logs.document_id
            </span>
            <span className="text-muted-foreground">&rarr;</span>
            <span className="font-mono">documents.id</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-blue-600">
              suggestions.deal_id
            </span>
            <span className="text-muted-foreground">&rarr;</span>
            <span className="font-mono">deals.id</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-blue-600">
              suggestions.document_id
            </span>
            <span className="text-muted-foreground">&rarr;</span>
            <span className="font-mono">documents.id</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-blue-600">
              documents.deal_id
            </span>
            <span className="text-muted-foreground">&rarr;</span>
            <span className="font-mono">deals.id</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-blue-600">
              documents.uploaded_by
            </span>
            <span className="text-muted-foreground">&rarr;</span>
            <span className="font-mono">users.id</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-blue-600">
              notifications.user_id
            </span>
            <span className="text-muted-foreground">&rarr;</span>
            <span className="font-mono">users.id</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-blue-600">
              notifications.deal_id
            </span>
            <span className="text-muted-foreground">&rarr;</span>
            <span className="font-mono">deals.id</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-blue-600">
              chat_messages.deal_id
            </span>
            <span className="text-muted-foreground">&rarr;</span>
            <span className="font-mono">deals.id</span>
          </div>
        </div>
      </div>

      {/* Audit Trail Flow Explanation */}
      <div className="border rounded-md bg-card p-4 space-y-3">
        <h2 className="text-sm font-semibold">
          How Status & Audit Trail Connect
        </h2>
        <div className="text-xs text-muted-foreground space-y-2">
          <p>
            <strong className="text-foreground">deals.status</strong> holds the
            current workflow state of a deal:{" "}
            <code className="bg-muted px-1 rounded">entry</code> &rarr;{" "}
            <code className="bg-muted px-1 rounded">pending_approval</code>{" "}
            &rarr;{" "}
            <code className="bg-muted px-1 rounded">approved</code> or{" "}
            <code className="bg-muted px-1 rounded">rejected</code>.
          </p>
          <p>
            <strong className="text-foreground">audit_logs</strong> records
            every state transition and field change. Each row links to{" "}
            <strong className="text-foreground">users</strong> via{" "}
            <code className="bg-muted px-1 rounded">user_id</code>, providing
            full accountability for who did what and when.
          </p>
          <p>
            The <code className="bg-muted px-1 rounded">action</code> column
            tracks the type of change: <code>CREATED</code>,{" "}
            <code>FIELD_UPDATED</code>, <code>AGENT_SUGGESTED</code>,{" "}
            <code>AGENT_EXTRACTED</code>, <code>SUBMITTED</code>,{" "}
            <code>APPROVED</code>, <code>REJECTED</code>.
          </p>
          <p>
            <strong className="text-foreground">suggestions</strong> stages
            AI-proposed values before they are accepted into the deal. When
            accepted, an <code>AGENT_EXTRACTED</code> audit entry is created,
            linking the accepted value back to the source{" "}
            <strong className="text-foreground">document</strong> and page
            number.
          </p>
          <p>
            <strong className="text-foreground">documents</strong> links to
            audit_logs via{" "}
            <code className="bg-muted px-1 rounded">document_id</code>,
            providing traceability from any field value back to its source
            document and page.
          </p>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Add "Database Schema" to nav bar**

In `src/components/nav-bar.tsx`, update the `navItems` array to add the new route between "Snowflake Integration" and "Admin":

```typescript
const navItems = [
  { label: "Deals", href: "/deals" },
  { label: "My Tasks", href: "/my-tasks" },
  { label: "Snowflake Integration", href: "/snowflake" },
  { label: "Database Schema", href: "/schema" },
  { label: "Admin", href: "/admin" },
];
```

**Step 3: Verify build**

Run: `cd "/Users/leopoldhaex/LEHA/LGT/AI - Application/Deal Closing" && npx next build 2>&1 | tail -5`

Expected: Build succeeds.

**Step 4: Commit**

```bash
git add src/app/schema/page.tsx src/components/nav-bar.tsx
git commit -m "feat: add Database Schema page with ER diagram and audit trail explanation"
```

---

### Task 7: Smoke test the full flow

**Step 1: Restart dev server and verify pages load**

Run: `cd "/Users/leopoldhaex/LEHA/LGT/AI - Application/Deal Closing" && npx next build 2>&1 | tail -5`

Expected: Build succeeds with no errors.

**Step 2: Test suggestions API**

Run curl tests:
```bash
# Get suggestions for a deal (should return empty array)
curl -s http://localhost:3000/api/deals/<test-deal-id>/suggestions | head

# Test schema page loads
curl -s http://localhost:3000/schema | head -20
```

**Step 3: Commit (if any fixups needed)**

```bash
git add -A
git commit -m "fix: smoke test fixes"
```
