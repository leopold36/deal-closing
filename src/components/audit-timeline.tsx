"use client";

import { useState } from "react";
import { AuditLog } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Pencil, Bot, Check, X, Send, Plus } from "lucide-react";

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
  const [expanded, setExpanded] = useState(false);

  if (logs.length === 0) return null;

  const displayed = expanded ? logs : logs.slice(0, 3);

  return (
    <div className="border-t pt-2">
      <Button
        variant="ghost"
        size="sm"
        className="h-6 text-xs flex items-center gap-1.5 mb-2"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        Audit Trail ({logs.length} entries)
      </Button>
      <div className="space-y-1">
        {displayed.map((log) => {
          const Icon = actionIcons[log.action] || Pencil;
          return (
            <div key={log.id} className="flex items-start gap-2 text-xs">
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
                <div className="text-xs text-muted-foreground">
                  by {log.userEmail} &middot; {new Date(log.timestamp).toLocaleString()}
                  {log.source === "agent" && " \u00B7 via Agent"}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {logs.length > 3 && !expanded && (
        <Button
          variant="link"
          className="text-[11px] mt-0.5"
          onClick={() => setExpanded(true)}
        >
          Show {logs.length - 3} more entries
        </Button>
      )}
    </div>
  );
}
