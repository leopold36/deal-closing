import { AuditLog } from "@/lib/types";
import { Pencil, Bot, Check, X, Send, Plus } from "lucide-react";

const actionIcons: Record<string, typeof Pencil> = {
  CREATED: Plus,
  FIELD_UPDATED: Pencil,
  AGENT_EXTRACTED: Bot,
  SUBMITTED: Send,
  APPROVED: Check,
  REJECTED: X,
};

const actionLabels: Record<string, string> = {
  CREATED: "Deal created",
  FIELD_UPDATED: "Field updated",
  AGENT_EXTRACTED: "Agent extracted data",
  SUBMITTED: "Submitted for approval",
  APPROVED: "Deal approved",
  REJECTED: "Deal rejected",
};

export function AuditTimeline({ logs }: { logs: AuditLog[] }) {
  if (logs.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-4 text-center">
        No audit entries yet.
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      {logs.map((log) => {
        const Icon = actionIcons[log.action] || Pencil;
        return (
          <div key={log.id} className="flex items-start gap-2 text-[11px]">
            <div className="mt-0.5 p-0.5 rounded bg-muted/70">
              <Icon className="h-2.5 w-2.5" />
            </div>
            <div className="flex-1">
              <span className="font-medium">{actionLabels[log.action]}</span>
              {log.fieldName && (
                <span className="text-muted-foreground">
                  {" "}&mdash; {log.fieldName}: {log.oldValue ?? "empty"} &rarr; {log.newValue}
                </span>
              )}
              {log.comment && (
                <span className="text-muted-foreground"> &mdash; &ldquo;{log.comment}&rdquo;</span>
              )}
              <div className="text-[10px] text-muted-foreground">
                by {log.userEmail} &middot; {new Date(log.timestamp).toLocaleString()}
                {log.source === "agent" && " \u00B7 via Agent"}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
