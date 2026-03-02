const tables = [
  {
    name: "users",
    purpose: "People who can enter or approve deals",
    fields: ["id", "name", "email", "role"],
  },
  {
    name: "deals",
    purpose: "The deal record with all field values and current status",
    fields: [
      "id", "name", "counterparty", "equity_ticker", "investment_amount",
      "deal_date", "settlement_date", "notes", "status", "created_by",
      "assigned_approver", "created_at", "updated_at",
    ],
  },
  {
    name: "suggestions",
    purpose: "AI-proposed values waiting for human accept/dismiss",
    fields: [
      "id", "deal_id", "field_name", "suggested_value",
      "document_id", "document_page", "status", "created_at",
    ],
  },
  {
    name: "audit_logs",
    purpose: "Every change to every field — who, when, what, and why",
    fields: [
      "id", "deal_id", "user_id", "action", "field_name",
      "old_value", "new_value", "source", "document_id",
      "document_page", "comment", "timestamp",
    ],
  },
  {
    name: "documents",
    purpose: "Uploaded files linked to deals",
    fields: ["id", "deal_id", "filename", "filepath", "uploaded_by", "uploaded_at"],
  },
  {
    name: "notifications",
    purpose: "In-app alerts for users when action is needed",
    fields: ["id", "user_id", "deal_id", "message", "read", "created_at"],
  },
  {
    name: "chat_messages",
    purpose: "Conversation history between users and the AI assistant",
    fields: ["id", "deal_id", "role", "content", "timestamp"],
  },
];

const relationships = [
  { from: "deals", to: "users", description: "Tracks who created and who approves each deal" },
  { from: "audit_logs", to: "deals, users, documents", description: "Links every change to a deal, a person, and optionally a source document" },
  { from: "suggestions", to: "deals, documents", description: "Ties each AI suggestion to a deal and the document it came from" },
  { from: "documents", to: "deals, users", description: "Links uploaded files to a deal and the person who uploaded them" },
  { from: "notifications", to: "deals, users", description: "Connects alerts to the relevant deal and recipient" },
  { from: "chat_messages", to: "deals", description: "Associates conversation messages with a deal" },
];

export default function SchemaPage() {
  return (
    <div className="px-4 py-3 max-w-5xl mx-auto space-y-4">
      <div>
        <h1 className="text-base font-semibold">Database Schema</h1>
        <p className="text-xs text-muted-foreground">
          How deal data is stored, audited, and approved.
        </p>
      </div>

      {/* How it works — 3 cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="border rounded-md bg-card p-3 space-y-1">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded bg-blue-100 flex items-center justify-center shrink-0">
              <span className="text-blue-700 text-[10px] font-bold">1</span>
            </div>
            <p className="text-xs font-semibold">Data Entry</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Values are stored in the <strong className="text-foreground">deals</strong> table. Every change &mdash; manual or AI &mdash; is logged in <strong className="text-foreground">audit_logs</strong> with who made it, when, and the old &amp; new value.
          </p>
        </div>

        <div className="border rounded-md bg-card p-3 space-y-1">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded bg-amber-100 flex items-center justify-center shrink-0">
              <span className="text-amber-700 text-[10px] font-bold">2</span>
            </div>
            <p className="text-xs font-semibold">AI Suggestions</p>
          </div>
          <p className="text-xs text-muted-foreground">
            AI-proposed values go into a <strong className="text-foreground">suggestions</strong> staging table first &mdash; they never touch the deal directly. You accept or dismiss each one. Even dismissed suggestions are kept for the record.
          </p>
        </div>

        <div className="border rounded-md bg-card p-3 space-y-1">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded bg-emerald-100 flex items-center justify-center shrink-0">
              <span className="text-emerald-700 text-[10px] font-bold">3</span>
            </div>
            <p className="text-xs font-semibold">Approval</p>
          </div>
          <p className="text-xs text-muted-foreground">
            When submitted, an approver reviews all fields. Approval (or rejection) is recorded in the audit log with the approver&apos;s identity and timestamp. The deal status updates accordingly.
          </p>
        </div>
      </div>

      {/* The bottom line */}
      <div className="border rounded-md bg-muted/30 px-4 py-3">
        <p className="text-xs text-muted-foreground">
          <strong className="text-foreground">The bottom line:</strong> for any field on any deal, you can always answer <em>who set this value, when, whether it was manual or AI-driven, and if AI-driven, which document and page it came from</em>.
        </p>
      </div>

      {/* Tables at a glance */}
      <div className="border rounded-md bg-card overflow-hidden">
        <div className="bg-slate-900 text-white px-4 py-2">
          <span className="text-xs font-semibold">Tables at a Glance</span>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left text-[11px] uppercase tracking-wider font-semibold text-muted-foreground px-4 py-2">Table</th>
              <th className="text-left text-[11px] uppercase tracking-wider font-semibold text-muted-foreground px-4 py-2">Purpose</th>
              <th className="text-left text-[11px] uppercase tracking-wider font-semibold text-muted-foreground px-4 py-2">Fields</th>
            </tr>
          </thead>
          <tbody>
            {tables.map((t) => (
              <tr key={t.name} className="border-b border-border/50 hover:bg-muted/50">
                <td className="px-4 py-1.5 text-xs font-mono font-semibold align-top whitespace-nowrap">{t.name}</td>
                <td className="px-4 py-1.5 text-xs text-muted-foreground align-top">{t.purpose}</td>
                <td className="px-4 py-1.5 text-[11px] text-muted-foreground font-mono align-top">{t.fields.join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Relationships */}
      <div className="border rounded-md bg-card p-4 space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Relationships</h2>
        <div className="space-y-1.5">
          {relationships.map((r) => (
            <div key={r.from} className="flex gap-2 text-xs">
              <span className="font-mono font-semibold shrink-0 w-28">{r.from}</span>
              <span className="text-muted-foreground">&rarr;</span>
              <span className="font-mono text-blue-600 shrink-0 w-44">{r.to}</span>
              <span className="text-muted-foreground">{r.description}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
