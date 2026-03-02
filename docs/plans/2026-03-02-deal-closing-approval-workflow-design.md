# Deal Closing Approval Workflow — Design Document

**Date:** 2026-03-02
**Status:** Approved

## Overview

A deal closing workflow app that tracks approval flow of deal data. Uses AI (Claude Agent SDK) to extract information from uploaded documents, supports manual data entry, and enforces a two-stage approval workflow with full audit trail. Designed with future Snowflake data warehouse integration in mind.

## Architecture

**Approach:** Monolithic Next.js application with Agent SDK running in API routes.

- **Framework:** Next.js 15 (App Router)
- **UI:** Tailwind CSS + shadcn/ui
- **Database:** SQLite via Drizzle ORM
- **Agent:** Claude Agent SDK (TypeScript), running in Next.js API routes
- **Streaming:** Server-Sent Events for chat
- **Data fetching:** SWR
- **File storage:** Local filesystem (`/uploads` directory)

## App Structure & Navigation

Four main views via top navigation:

| View | Purpose |
|------|---------|
| **Deals** | List of all deals with current stage. Click to open deal form + chat panel. |
| **My Tasks** | Deals assigned to the current user for entry or approval. |
| **Snowflake Integration** | Documentation view: data schema, pipeline diagram, sample queries. |
| **Admin / Settings** | Manage dummy users, impersonation switcher, workflow config. |

**Top bar:** Current user (impersonation dropdown), notification bell, stage indicator inside a deal.

## Deal Form + Chat Panel

Split-screen layout when viewing a deal:

**Left (~65%): Deal Form**

Form fields in a three-column layout:

| Field Label | Field Value (input) | Last Action (audit chip) |
|-------------|---------------------|--------------------------|
| Deal Name | text input | "Entered by j.smith@lgt.com" |
| Counterparty | text input | "Extracted by Agent, confirmed by j.smith@lgt.com" |
| Equity Ticker | text input | chip with icon |
| Investment Amount | currency input | chip with icon |
| Deal Date | date picker | chip with icon |
| Settlement Date | date picker | chip with icon |
| Notes | textarea | chip with icon |

Audit chip icons:
- Pencil icon = manual entry
- Robot icon = agent extraction
- Checkmark icon = approved

Clicking a chip opens a popover showing the full change history for that field, including document source and page number.

**Action buttons (stage-dependent):**
- Entry stage: "Submit for Approval"
- Approval stage: "Approve" / "Reject" (with comment)

**Right (~35%): Chat Panel**

- Chat interface with Claude agent
- File upload (drag & drop or click)
- Agent extracts data and proposes field values for user confirmation
- Chat history persisted per deal

## Workflow

```
[Entry] ──Submit──> [Pending Approval] ──Approve──> [Completed]
                          │
                        Reject
                          │
                          v
                      [Entry] (with rejection reason)
```

- Submit: locks form, assigns to approver, sends in-app notification
- Approve: marks deal complete, logs approval with approver identity
- Reject: sends back to entry stage with comment, notifies original enterer

## Audit Trail

Every action recorded in `audit_logs`:

| Column | Description |
|--------|-------------|
| timestamp | When |
| user_email | Who |
| user_name | Display name |
| action | CREATED, FIELD_UPDATED, AGENT_EXTRACTED, SUBMITTED, APPROVED, REJECTED |
| field_name | Which field (for updates) |
| old_value | Previous value |
| new_value | New value |
| source | manual or agent |
| document_id | Source document (if agent-extracted) |
| document_page | Page number in source document |
| comment | Optional (e.g., rejection reason) |

Displayed as:
1. Per-field audit chips on the form (click for full field history)
2. Collapsible timeline at the bottom of the deal view (full deal history)

## Agent Design (Claude Agent SDK)

Runs as Next.js API route (`/api/agent/chat`) using TypeScript Agent SDK.

**Tools:**

| Tool | Purpose |
|------|---------|
| `extract_from_document` | Parse uploaded file, extract structured deal data with page references |
| `update_deal_field` | Update a form field (requires user confirmation in chat) |
| `get_deal_status` | Return current deal state and field values |
| `send_notification` | Create in-app notification for a user |

**Behavior:**
- On document upload: extract data, propose values one by one, user confirms each
- Every agent action logged to audit trail with `source: 'agent'`
- Responses streamed via SSE

## Data Model

```sql
-- Users (dummy users for prototype, impersonation-based)
users (
  id          TEXT PRIMARY KEY,  -- uuid
  name        TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  role        TEXT NOT NULL      -- 'entry' | 'approver' | 'admin'
)

-- Deals
deals (
  id                  TEXT PRIMARY KEY,
  name                TEXT NOT NULL,
  counterparty        TEXT,
  equity_ticker       TEXT,
  investment_amount   REAL,
  deal_date           TEXT,       -- ISO date
  settlement_date     TEXT,       -- ISO date
  notes               TEXT,
  status              TEXT NOT NULL DEFAULT 'entry',  -- entry | pending_approval | approved | rejected
  created_by          TEXT REFERENCES users(id),
  assigned_approver   TEXT REFERENCES users(id),
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL
)

-- Uploaded documents
documents (
  id            TEXT PRIMARY KEY,
  deal_id       TEXT REFERENCES deals(id),
  filename      TEXT NOT NULL,
  filepath      TEXT NOT NULL,     -- local path in /uploads
  mime_type     TEXT,
  uploaded_by   TEXT REFERENCES users(id),
  uploaded_at   TEXT NOT NULL
)

-- Audit log
audit_logs (
  id              TEXT PRIMARY KEY,
  deal_id         TEXT REFERENCES deals(id),
  user_id         TEXT REFERENCES users(id),
  action          TEXT NOT NULL,   -- CREATED | FIELD_UPDATED | AGENT_EXTRACTED | SUBMITTED | APPROVED | REJECTED
  field_name      TEXT,
  old_value       TEXT,
  new_value       TEXT,
  source          TEXT,            -- manual | agent
  document_id     TEXT REFERENCES documents(id),
  document_page   INTEGER,
  comment         TEXT,
  timestamp       TEXT NOT NULL
)

-- In-app notifications
notifications (
  id          TEXT PRIMARY KEY,
  user_id     TEXT REFERENCES users(id),
  deal_id     TEXT REFERENCES deals(id),
  message     TEXT NOT NULL,
  read        INTEGER DEFAULT 0,
  created_at  TEXT NOT NULL
)

-- Chat messages (per deal)
chat_messages (
  id          TEXT PRIMARY KEY,
  deal_id     TEXT REFERENCES deals(id),
  role        TEXT NOT NULL,       -- user | assistant
  content     TEXT NOT NULL,
  timestamp   TEXT NOT NULL
)
```

## Authentication (Prototype)

- No real login system
- Admin view to add/edit dummy users
- Impersonation dropdown in top bar to switch active user
- Current user stored in cookie/localStorage
- All actions attributed to the impersonated user

## Snowflake Integration View

Documentation-only tab showing:

1. **Data Schema Diagram** — visual representation of Snowflake target tables (DEALS, DEAL_AUDIT_LOG, APPROVALS)
2. **Pipeline Diagram** — App DB (SQLite) → ETL/Sync → Snowflake → Analytics
3. **Sample Queries** — pre-written SQL examples for compliance and audit reporting
4. **Integration Notes** — sync strategy (batch vs event-driven), data format, schema mapping

## Notifications (Prototype)

- In-app notification system only
- Bell icon in top bar with unread count
- Notification panel showing pending actions
- Agent logs what would be sent externally (Slack, email) for future integration
