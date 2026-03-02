"use client";

import { useState, useCallback } from "react";
import useSWR, { mutate } from "swr";
import { useUser } from "@/lib/user-context";
import { Deal, AuditLog, DEAL_FIELDS } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FieldAuditChip } from "./field-audit-chip";
import { AuditTimeline } from "./audit-timeline";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const statusLabels: Record<string, string> = {
  entry: "Data Entry",
  pending_approval: "Pending Approval",
  approved: "Approved",
  rejected: "Rejected",
};

const statusColors: Record<string, string> = {
  entry: "bg-blue-100 text-blue-800",
  pending_approval: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">{deal.name}</h2>
        </div>
        <Badge className={statusColors[deal.status]} variant="secondary">
          {statusLabels[deal.status]}
        </Badge>
      </div>

      <div className="space-y-4">
        {DEAL_FIELDS.map((field) => {
          const value = String((deal as Record<string, unknown>)[field.key] ?? "");
          return (
            <div key={field.key} className="grid grid-cols-[180px_1fr_200px] gap-3 items-start">
              <Label className="pt-2 text-sm font-medium">{field.label}</Label>
              <div>
                {field.type === "textarea" ? (
                  <Textarea
                    defaultValue={value}
                    disabled={!isEditable}
                    onBlur={(e) => handleFieldBlur(field.key, e.target.value)}
                    className="min-h-[80px]"
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
                  <span className="text-xs text-muted-foreground">Saving...</span>
                )}
              </div>
              <FieldAuditChip fieldName={field.key} auditLogs={auditLogs} />
            </div>
          );
        })}
      </div>

      <div className="flex gap-3 pt-4 border-t">
        {deal.status === "entry" && (
          <Button onClick={handleSubmitForApproval}>Submit for Approval</Button>
        )}
        {deal.status === "pending_approval" && (
          <>
            <Button onClick={handleApprove} variant="default">
              Approve
            </Button>
            <Button onClick={handleReject} variant="destructive">
              Reject
            </Button>
          </>
        )}
        {deal.status === "approved" && (
          <p className="text-sm text-green-600 font-medium">
            This deal has been approved.
          </p>
        )}
      </div>

      <AuditTimeline logs={auditLogs} />
    </div>
  );
}
