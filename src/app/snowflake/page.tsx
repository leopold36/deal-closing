import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function SnowflakePage() {
  return (
    <div className="px-4 py-3 max-w-5xl mx-auto space-y-4">
      <div>
        <h1 className="text-base font-semibold">Snowflake Integration</h1>
        <p className="text-xs text-muted-foreground">
          How approved deal data flows into the Snowflake data warehouse.
        </p>
      </div>

      {/* Pipeline Diagram */}
      <Card>
        <CardHeader>
          <CardTitle>Data Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center gap-4 py-6">
            <div className="text-center">
              <div className="border rounded-md p-3 bg-blue-50">
                <p className="text-sm font-medium">App Database</p>
                <p className="text-xs text-muted-foreground">SQLite</p>
              </div>
            </div>
            <div className="text-lg text-muted-foreground">&rarr;</div>
            <div className="text-center">
              <div className="border rounded-md p-3 bg-yellow-50">
                <p className="text-sm font-medium">ETL / Sync</p>
                <p className="text-xs text-muted-foreground">Scheduled or event-driven</p>
              </div>
            </div>
            <div className="text-lg text-muted-foreground">&rarr;</div>
            <div className="text-center">
              <div className="border rounded-md p-3 bg-cyan-50">
                <p className="text-sm font-medium">Snowflake</p>
                <p className="text-xs text-muted-foreground">Data Warehouse</p>
              </div>
            </div>
            <div className="text-lg text-muted-foreground">&rarr;</div>
            <div className="text-center">
              <div className="border rounded-md p-3 bg-green-50">
                <p className="text-sm font-medium">Analytics</p>
                <p className="text-xs text-muted-foreground">Reporting & Compliance</p>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Approved deals with full audit trail are synced to Snowflake,
            including who entered and who approved each data point.
          </p>
        </CardContent>
      </Card>

      {/* Target Schema */}
      <Card>
        <CardHeader>
          <CardTitle>Snowflake Target Schema</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-sm font-medium mb-1.5 flex items-center gap-2">
              <Badge>Table</Badge> DEAL_CLOSING.DEALS
            </h3>
            <div className="bg-muted rounded-md p-3 font-mono text-[11px] leading-relaxed overflow-x-auto">
              <pre>{`CREATE TABLE DEAL_CLOSING.DEALS (
  DEAL_ID        VARCHAR(36)  PRIMARY KEY,
  DEAL_NAME      VARCHAR(255) NOT NULL,
  COUNTERPARTY   VARCHAR(255),
  EQUITY_TICKER  VARCHAR(20),
  INVESTMENT_AMT NUMBER(18,2),
  DEAL_DATE      DATE,
  SETTLEMENT_DT  DATE,
  NOTES          TEXT,
  STATUS         VARCHAR(20)  NOT NULL,
  CREATED_BY     VARCHAR(255),
  APPROVED_BY    VARCHAR(255),
  CREATED_AT     TIMESTAMP_NTZ,
  UPDATED_AT     TIMESTAMP_NTZ,
  APPROVED_AT    TIMESTAMP_NTZ
);`}</pre>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="text-sm font-medium mb-1.5 flex items-center gap-2">
              <Badge>Table</Badge> DEAL_CLOSING.AUDIT_LOG
            </h3>
            <div className="bg-muted rounded-md p-3 font-mono text-[11px] leading-relaxed overflow-x-auto">
              <pre>{`CREATE TABLE DEAL_CLOSING.AUDIT_LOG (
  LOG_ID         VARCHAR(36)  PRIMARY KEY,
  DEAL_ID        VARCHAR(36)  REFERENCES DEALS(DEAL_ID),
  USER_EMAIL     VARCHAR(255) NOT NULL,
  USER_NAME      VARCHAR(255),
  ACTION         VARCHAR(50)  NOT NULL,
  FIELD_NAME     VARCHAR(100),
  OLD_VALUE      TEXT,
  NEW_VALUE      TEXT,
  SOURCE         VARCHAR(10),
  DOCUMENT_REF   VARCHAR(255),
  DOCUMENT_PAGE  INTEGER,
  COMMENT        TEXT,
  TIMESTAMP      TIMESTAMP_NTZ NOT NULL
);`}</pre>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="text-sm font-medium mb-1.5 flex items-center gap-2">
              <Badge>Table</Badge> DEAL_CLOSING.APPROVALS
            </h3>
            <div className="bg-muted rounded-md p-3 font-mono text-[11px] leading-relaxed overflow-x-auto">
              <pre>{`CREATE TABLE DEAL_CLOSING.APPROVALS (
  APPROVAL_ID    VARCHAR(36)  PRIMARY KEY,
  DEAL_ID        VARCHAR(36)  REFERENCES DEALS(DEAL_ID),
  APPROVER_EMAIL VARCHAR(255) NOT NULL,
  APPROVER_NAME  VARCHAR(255),
  STATUS         VARCHAR(20)  NOT NULL,
  COMMENT        TEXT,
  APPROVED_AT    TIMESTAMP_NTZ NOT NULL
);`}</pre>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sample Queries */}
      <Card>
        <CardHeader>
          <CardTitle>Sample Queries</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-xs font-medium mb-1.5">All deals approved by a specific user in the last 30 days</h3>
            <div className="bg-muted rounded-md p-3 font-mono text-[11px] leading-relaxed overflow-x-auto">
              <pre>{`SELECT d.DEAL_ID, d.DEAL_NAME, d.COUNTERPARTY,
       d.INVESTMENT_AMT, a.APPROVED_AT
FROM DEAL_CLOSING.DEALS d
JOIN DEAL_CLOSING.APPROVALS a ON d.DEAL_ID = a.DEAL_ID
WHERE a.APPROVER_EMAIL = 'maria.jones@lgt.com'
  AND a.APPROVED_AT >= DATEADD(day, -30, CURRENT_TIMESTAMP())
  AND a.STATUS = 'approved'
ORDER BY a.APPROVED_AT DESC;`}</pre>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="text-xs font-medium mb-1.5">Full audit trail for a specific deal</h3>
            <div className="bg-muted rounded-md p-3 font-mono text-[11px] leading-relaxed overflow-x-auto">
              <pre>{`SELECT al.TIMESTAMP, al.USER_EMAIL, al.ACTION,
       al.FIELD_NAME, al.OLD_VALUE, al.NEW_VALUE,
       al.SOURCE, al.DOCUMENT_REF, al.DOCUMENT_PAGE
FROM DEAL_CLOSING.AUDIT_LOG al
WHERE al.DEAL_ID = '<deal-id>'
ORDER BY al.TIMESTAMP ASC;`}</pre>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="text-xs font-medium mb-1.5">Compliance report: all field changes with approver sign-off</h3>
            <div className="bg-muted rounded-md p-3 font-mono text-[11px] leading-relaxed overflow-x-auto">
              <pre>{`SELECT d.DEAL_NAME,
       al.FIELD_NAME, al.OLD_VALUE, al.NEW_VALUE,
       al.USER_EMAIL AS changed_by, al.SOURCE,
       a.APPROVER_EMAIL AS approved_by, a.APPROVED_AT
FROM DEAL_CLOSING.AUDIT_LOG al
JOIN DEAL_CLOSING.DEALS d ON al.DEAL_ID = d.DEAL_ID
LEFT JOIN DEAL_CLOSING.APPROVALS a ON al.DEAL_ID = a.DEAL_ID
  AND a.STATUS = 'approved'
WHERE al.ACTION IN ('FIELD_UPDATED', 'AGENT_EXTRACTED')
ORDER BY d.DEAL_NAME, al.TIMESTAMP;`}</pre>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Integration Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Integration Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          <div>
            <h3 className="text-sm font-medium">Sync Strategy</h3>
            <p className="text-muted-foreground">Two options depending on volume and latency requirements:</p>
            <ul className="list-disc list-inside text-muted-foreground mt-1 space-y-1">
              <li><strong>Scheduled batch:</strong> A cron job runs every N minutes, queries for newly approved deals, and bulk-loads them into Snowflake via COPY INTO.</li>
              <li><strong>Event-driven:</strong> On deal approval, an event is emitted (webhook/queue) that triggers an immediate sync of that deal and its audit log to Snowflake.</li>
            </ul>
          </div>
          <Separator />
          <div>
            <h3 className="text-sm font-medium">Data Format</h3>
            <p className="text-muted-foreground">The primary artifact is the <strong>audit log</strong> — every field change paired with the person who made it and the person who approved it. This provides a complete, tamper-evident record of the data lineage from entry to approval.</p>
          </div>
          <Separator />
          <div>
            <h3 className="text-sm font-medium">Schema Mapping</h3>
            <p className="text-muted-foreground">The app's SQLite tables map directly to Snowflake tables. Field names are converted from camelCase to UPPER_SNAKE_CASE. User IDs are resolved to email addresses for human readability in the warehouse. Timestamps are stored as TIMESTAMP_NTZ (UTC).</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
