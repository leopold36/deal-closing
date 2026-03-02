"use client";

import { AuditLog } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Pencil, Bot, Check } from "lucide-react";
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
    lastLog.source === "agent" ? (
      <Bot className="h-3 w-3" />
    ) : lastLog.action === "APPROVED" ? (
      <Check className="h-3 w-3" />
    ) : (
      <Pencil className="h-3 w-3" />
    );

  const label =
    lastLog.source === "agent"
      ? `Agent, confirmed by ${lastLog.userEmail}`
      : `${lastLog.userEmail}`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Badge
          variant="outline"
          className="cursor-pointer text-xs gap-1 font-normal max-w-[200px] truncate"
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
                  {log.source === "agent" ? "Agent extracted" : "Manual update"} by{" "}
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
