import { Badge } from "@/components/ui/badge";

type Column = {
  name: string;
  type: string;
  constraints: string[];
  fk?: string;
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
      { name: "assigned_approver", type: "TEXT", constraints: ["FK"], fk: "users.id" },
      { name: "created_at", type: "TEXT", constraints: ["NOT NULL"] },
      { name: "updated_at", type: "TEXT", constraints: ["NOT NULL"] },
    ],
  },
  {
    name: "documents",
    columns: [
      { name: "id", type: "TEXT", constraints: ["PK"] },
      { name: "deal_id", type: "TEXT", constraints: ["FK"], fk: "deals.id" },
      { name: "filename", type: "TEXT", constraints: ["NOT NULL"] },
      { name: "filepath", type: "TEXT", constraints: ["NOT NULL"] },
      { name: "mime_type", type: "TEXT", constraints: [] },
      { name: "uploaded_by", type: "TEXT", constraints: ["FK"], fk: "users.id" },
      { name: "uploaded_at", type: "TEXT", constraints: ["NOT NULL"] },
    ],
  },
  {
    name: "suggestions",
    columns: [
      { name: "id", type: "TEXT", constraints: ["PK"] },
      { name: "deal_id", type: "TEXT", constraints: ["FK"], fk: "deals.id" },
      { name: "field_name", type: "TEXT", constraints: ["NOT NULL"] },
      { name: "suggested_value", type: "TEXT", constraints: ["NOT NULL"] },
      { name: "document_id", type: "TEXT", constraints: ["FK"], fk: "documents.id" },
      { name: "document_page", type: "INTEGER", constraints: [] },
      { name: "status", type: "TEXT", constraints: ["NOT NULL"] },
      { name: "created_at", type: "TEXT", constraints: ["NOT NULL"] },
    ],
  },
  {
    name: "audit_logs",
    columns: [
      { name: "id", type: "TEXT", constraints: ["PK"] },
      { name: "deal_id", type: "TEXT", constraints: ["FK"], fk: "deals.id" },
      { name: "user_id", type: "TEXT", constraints: ["FK"], fk: "users.id" },
      { name: "action", type: "TEXT", constraints: ["NOT NULL"] },
      { name: "field_name", type: "TEXT", constraints: [] },
      { name: "old_value", type: "TEXT", constraints: [] },
      { name: "new_value", type: "TEXT", constraints: [] },
      { name: "source", type: "TEXT", constraints: [] },
      { name: "document_id", type: "TEXT", constraints: ["FK"], fk: "documents.id" },
      { name: "document_page", type: "INTEGER", constraints: [] },
      { name: "comment", type: "TEXT", constraints: [] },
      { name: "timestamp", type: "TEXT", constraints: ["NOT NULL"] },
    ],
  },
  {
    name: "notifications",
    columns: [
      { name: "id", type: "TEXT", constraints: ["PK"] },
      { name: "user_id", type: "TEXT", constraints: ["FK"], fk: "users.id" },
      { name: "deal_id", type: "TEXT", constraints: ["FK"], fk: "deals.id" },
      { name: "message", type: "TEXT", constraints: ["NOT NULL"] },
      { name: "read", type: "INTEGER", constraints: [] },
      { name: "created_at", type: "TEXT", constraints: ["NOT NULL"] },
    ],
  },
  {
    name: "chat_messages",
    columns: [
      { name: "id", type: "TEXT", constraints: ["PK"] },
      { name: "deal_id", type: "TEXT", constraints: ["FK"], fk: "deals.id" },
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
        <span className="text-xs font-semibold tracking-wide">{table.name}</span>
      </div>
      <div className="divide-y divide-border/50">
        {table.columns.map((col) => (
          <div key={col.name} className="flex items-center gap-2 px-3 py-1 text-[11px]">
            <span className={`font-mono flex-1 ${col.constraints.includes("PK") ? "font-bold" : ""} ${col.fk ? "text-blue-600" : ""}`}>
              {col.name}
            </span>
            <span className="text-muted-foreground font-mono">{col.type}</span>
            <div className="flex gap-0.5">
              {col.constraints.includes("PK") && (
                <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 bg-amber-100 text-amber-800 border-amber-200">PK</Badge>
              )}
              {col.constraints.includes("FK") && (
                <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 bg-blue-100 text-blue-700 border-blue-200">FK</Badge>
              )}
              {col.constraints.includes("NOT NULL") && (
                <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">NN</Badge>
              )}
              {col.constraints.includes("UNIQUE") && (
                <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">UQ</Badge>
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
          Entity-relationship diagram of the SQLite database powering the deal closing workflow.
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
            <span className="font-mono text-blue-600">deals.assigned_approver</span>
            <span className="text-muted-foreground">&rarr;</span>
            <span className="font-mono">users.id</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-blue-600">audit_logs.deal_id</span>
            <span className="text-muted-foreground">&rarr;</span>
            <span className="font-mono">deals.id</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-blue-600">audit_logs.user_id</span>
            <span className="text-muted-foreground">&rarr;</span>
            <span className="font-mono">users.id</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-blue-600">audit_logs.document_id</span>
            <span className="text-muted-foreground">&rarr;</span>
            <span className="font-mono">documents.id</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-blue-600">suggestions.deal_id</span>
            <span className="text-muted-foreground">&rarr;</span>
            <span className="font-mono">deals.id</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-blue-600">suggestions.document_id</span>
            <span className="text-muted-foreground">&rarr;</span>
            <span className="font-mono">documents.id</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-blue-600">documents.deal_id</span>
            <span className="text-muted-foreground">&rarr;</span>
            <span className="font-mono">deals.id</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-blue-600">documents.uploaded_by</span>
            <span className="text-muted-foreground">&rarr;</span>
            <span className="font-mono">users.id</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-blue-600">notifications.user_id</span>
            <span className="text-muted-foreground">&rarr;</span>
            <span className="font-mono">users.id</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-blue-600">notifications.deal_id</span>
            <span className="text-muted-foreground">&rarr;</span>
            <span className="font-mono">deals.id</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-blue-600">chat_messages.deal_id</span>
            <span className="text-muted-foreground">&rarr;</span>
            <span className="font-mono">deals.id</span>
          </div>
        </div>
      </div>

      {/* Audit Trail Flow Explanation */}
      <div className="border rounded-md bg-card p-4 space-y-3">
        <h2 className="text-sm font-semibold">How Status & Audit Trail Connect</h2>
        <div className="text-xs text-muted-foreground space-y-2">
          <p>
            <strong className="text-foreground">deals.status</strong> holds the current workflow state of a deal:{" "}
            <code className="bg-muted px-1 rounded">entry</code> &rarr;{" "}
            <code className="bg-muted px-1 rounded">pending_approval</code> &rarr;{" "}
            <code className="bg-muted px-1 rounded">approved</code> or{" "}
            <code className="bg-muted px-1 rounded">rejected</code>.
          </p>
          <p>
            <strong className="text-foreground">audit_logs</strong> records every state transition and field change. Each row links to{" "}
            <strong className="text-foreground">users</strong> via{" "}
            <code className="bg-muted px-1 rounded">user_id</code>, providing full accountability for who did what and when.
          </p>
          <p>
            The <code className="bg-muted px-1 rounded">action</code> column tracks the type of change:{" "}
            <code>CREATED</code>, <code>FIELD_UPDATED</code>, <code>AGENT_SUGGESTED</code>,{" "}
            <code>AGENT_EXTRACTED</code>, <code>SUBMITTED</code>, <code>APPROVED</code>, <code>REJECTED</code>.
          </p>
          <p>
            <strong className="text-foreground">suggestions</strong> stages AI-proposed values before they are accepted into the deal. When accepted, an <code>AGENT_EXTRACTED</code> audit entry is created, linking the accepted value back to the source{" "}
            <strong className="text-foreground">document</strong> and page number.
          </p>
          <p>
            <strong className="text-foreground">documents</strong> links to audit_logs via{" "}
            <code className="bg-muted px-1 rounded">document_id</code>, providing traceability from any field value back to its source document and page.
          </p>
        </div>
      </div>
    </div>
  );
}
