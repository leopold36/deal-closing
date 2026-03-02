# Database Schema View & AI Suggestion Column — Design

**Goal:** Add two features: (1) a Database Schema page with an interactive ER diagram showing all tables and their relationships, and (2) an AI suggestion staging column in the deal form so agent-extracted values require explicit human acceptance before writing to the deal record.

---

## Feature 1: Database Schema View

### Architecture

New page at `/schema` with a CSS/SVG-based ER diagram. No external diagramming libraries.

### Components

- **Page:** `src/app/schema/page.tsx` — renders the ER diagram
- **Nav:** Add "Database Schema" tab to nav bar between "Snowflake Integration" and "Admin"

### ER Diagram Design

Each of the 6 SQLite tables (`users`, `deals`, `documents`, `audit_logs`, `notifications`, `chat_messages`) rendered as a styled card:
- Dark header with table name
- Column rows showing name, type, and constraint badges (PK, FK, NOT NULL)
- Foreign key lines drawn with SVG connecting FK columns to referenced table PKs

### Audit Trail Flow Callout

Below the diagram, a highlighted section explains the status-to-user audit chain:
- `deals.status` holds the current state
- `audit_logs` records every transition (CREATED → FIELD_UPDATED → SUBMITTED → APPROVED/REJECTED)
- Each audit row links to `users` via `user_id`, providing full accountability
- `documents` links to `audit_logs` via `document_id` for source traceability

---

## Feature 2: AI Suggestion Column

### Data Model

New `suggestions` table:

```
suggestions
  id           TEXT PK
  dealId       TEXT FK → deals.id
  fieldName    TEXT NOT NULL
  suggestedValue TEXT NOT NULL
  documentId   TEXT FK → documents.id (nullable)
  documentPage INTEGER (nullable)
  status       TEXT (pending | accepted | dismissed) DEFAULT 'pending'
  createdAt    TEXT NOT NULL
```

New audit log action: `AGENT_SUGGESTED` (added to the existing enum).

### Agent Tool Change

`update_deal_field` → `suggest_deal_field`:
- Writes to `suggestions` table with status `pending` instead of directly to `deals`
- Creates an `AGENT_SUGGESTED` audit log entry
- Returns confirmation that the suggestion was created (not applied)

### Form Layout Change

Current: `[140px label | 1fr input | 180px audit]`
New: `[140px label | 160px suggestion | 1fr input | 180px audit]`

- **Suggestion column:** Shows latest pending suggestion for that field. Amber/yellow background cell with the suggested value, green check (accept) and red X (dismiss) buttons. Empty/muted when no pending suggestion.
- **Input column:** Real form field, editable as before during entry/rejected status.
- **Audit column:** Unchanged.

### Accept Flow

1. User clicks green check on a pending suggestion
2. POST `/api/suggestions/[id]/accept` is called
3. Backend: writes `suggestedValue` into the deal field via PATCH, sets suggestion status to `accepted`, creates `AGENT_EXTRACTED` audit log entry with `source: "agent"` and document reference
4. Frontend: SWR revalidates deal + audit + suggestions

### Dismiss Flow

1. User clicks red X on a pending suggestion
2. POST `/api/suggestions/[id]/dismiss` is called
3. Backend: sets suggestion status to `dismissed`, no value written to deal
4. Frontend: SWR revalidates suggestions

### API Endpoints

- `GET /api/deals/[id]/suggestions` — returns pending suggestions for a deal
- `POST /api/suggestions/[id]/accept` — accept a suggestion
- `POST /api/suggestions/[id]/dismiss` — dismiss a suggestion
