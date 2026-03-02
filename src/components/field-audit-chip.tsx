"use client";

import { AuditLog } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Pencil, Bot, Check, Lightbulb } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

type Props = {
  fieldName: string;
  auditLogs: AuditLog[];
};

export function FieldAuditChip({ fieldName, auditLogs }: Props) {
  const fieldLogs = auditLogs.filter((l) => l.fieldName === fieldName);
  const lastLog = fieldLogs[0];

  if (!lastLog) return <span className="text-xs text-muted-foreground">—</span>;

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

  const label =
    lastLog.action === "AGENT_SUGGESTED"
      ? "AI suggested"
      : lastLog.source === "agent"
        ? `Agent, confirmed by ${lastLog.userEmail}`
        : `${lastLog.userEmail}`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Badge
          variant="outline"
          className="cursor-pointer text-[10px] gap-0.5 font-normal max-w-[180px] truncate h-5 px-1.5"
        >
          {icon}
          {label}
        </Badge>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <h4 className="font-medium text-sm mb-2">
          History: {fieldName}
        </h4>
        <ScrollArea className="max-h-48">
          <div className="space-y-2">
            {fieldLogs.map((log) => (
              <div key={log.id} className="text-xs border-l-2 pl-2 py-1">
                <div className="font-medium">
                  {log.action === "AGENT_SUGGESTED"
                    ? "AI suggested"
                    : log.source === "agent"
                      ? "Agent extracted"
                      : "Manual update"}{" "}
                  by{" "}
                  {log.userEmail}
                </div>
                {log.oldValue && (
                  <div className="text-muted-foreground">
                    From: {log.oldValue}
                  </div>
                )}
                <div>To: {log.newValue}</div>
                {log.documentPage && (
                  <div className="text-muted-foreground">
                    Source: page {log.documentPage}
                  </div>
                )}
                <div className="text-muted-foreground">
                  {new Date(log.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
