"use client";

import { useState, useCallback } from "react";
import useSWR, { mutate } from "swr";
import { useUser } from "@/lib/user-context";
import { Deal, AuditLog, Suggestion, DEAL_FIELDS } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FieldAuditChip } from "./field-audit-chip";
import { AuditTimeline } from "./audit-timeline";
import { Check, X } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const statusLabels: Record<string, string> = {
  entry: "Data Entry",
  pending_approval: "Pending Approval",
  approved: "Approved",
  rejected: "Rejected",
};

const statusColors: Record<string, string> = {
  entry: "bg-blue-500/10 text-blue-700 border-blue-200",
  pending_approval: "bg-amber-500/10 text-amber-700 border-amber-200",
  approved: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  rejected: "bg-red-500/10 text-red-700 border-red-200",
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
  const { data: pendingSuggestions = [], mutate: mutateSuggestions } = useSWR<
    Suggestion[]
  >(`/api/deals/${dealId}/suggestions`, fetcher);

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

  const handleAcceptSuggestion = async (suggestion: Suggestion) => {
    if (!currentUser) return;
    await fetch(`/api/suggestions/${suggestion.id}/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: currentUser.id }),
    });
    mutateDeal();
    mutateSuggestions();
    mutate(`/api/deals/${dealId}/audit`);
  };

  const handleDismissSuggestion = async (suggestion: Suggestion) => {
    await fetch(`/api/suggestions/${suggestion.id}/dismiss`, {
      method: "POST",
    });
    mutateSuggestions();
  };

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

  const getSuggestionForField = (fieldName: string) =>
    pendingSuggestions.find((s) => s.fieldName === fieldName);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">{deal.name}</h2>
        </div>
        <Badge
          className={`${statusColors[deal.status]} text-[11px] font-medium border px-1.5 py-0`}
          variant="secondary"
        >
          {statusLabels[deal.status]}
        </Badge>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[140px_160px_1fr_180px] gap-2 items-center">
        <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
          Field
        </span>
        <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
          AI Suggestion
        </span>
        <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
          Value
        </span>
        <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
          Audit
        </span>
      </div>

      <div className="space-y-2">
        {DEAL_FIELDS.map((field) => {
          const value = String(
            (deal as Record<string, unknown>)[field.key] ?? ""
          );
          const suggestion = getSuggestionForField(field.key);
          return (
            <div
              key={field.key}
              className="grid grid-cols-[140px_160px_1fr_180px] gap-2 items-start"
            >
              <Label className="pt-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {field.label}
              </Label>

              {/* Suggestion cell */}
              <div className="min-h-[32px]">
                {suggestion ? (
                  <div className="flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-2 py-1">
                    <span className="text-xs truncate flex-1 tabular-nums">
                      {suggestion.suggestedValue}
                    </span>
                    <button
                      onClick={() => handleAcceptSuggestion(suggestion)}
                      className="shrink-0 rounded p-0.5 hover:bg-emerald-100 text-emerald-600"
                      title="Accept suggestion"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDismissSuggestion(suggestion)}
                      className="shrink-0 rounded p-0.5 hover:bg-red-100 text-red-500"
                      title="Dismiss suggestion"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <span className="text-[11px] text-muted-foreground/50 pt-1.5 block">
                    —
                  </span>
                )}
              </div>

              {/* Value input */}
              <div>
                {field.type === "textarea" ? (
                  <Textarea
                    defaultValue={value}
                    disabled={!isEditable}
                    onBlur={(e) => handleFieldBlur(field.key, e.target.value)}
                    className="min-h-[60px]"
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
                  <span className="text-xs text-muted-foreground">
                    Saving...
                  </span>
                )}
              </div>

              {/* Audit chip */}
              <FieldAuditChip fieldName={field.key} auditLogs={auditLogs} />
            </div>
          );
        })}
      </div>

      <div className="flex gap-2 pt-3 border-t">
        {deal.status === "entry" && (
          <Button
            onClick={handleSubmitForApproval}
            size="sm"
            className="h-7 text-xs"
          >
            Submit for Approval
          </Button>
        )}
        {deal.status === "pending_approval" && (
          <>
            <Button
              onClick={handleApprove}
              variant="default"
              size="sm"
              className="h-7 text-xs"
            >
              Approve
            </Button>
            <Button
              onClick={handleReject}
              variant="destructive"
              size="sm"
              className="h-7 text-xs"
            >
              Reject
            </Button>
          </>
        )}
        {deal.status === "approved" && (
          <p className="text-xs text-emerald-600 font-medium">
            This deal has been approved.
          </p>
        )}
      </div>

      <AuditTimeline logs={auditLogs} />
    </div>
  );
}
