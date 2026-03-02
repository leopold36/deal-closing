"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check, X, CheckCircle2, Trash2, FlaskConical } from "lucide-react";

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
  const router = useRouter();
  const { currentUser, users, setCurrentUser } = useUser();
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

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this deal? This cannot be undone.")) return;
    await fetch(`/api/deals/${dealId}`, { method: "DELETE" });
    router.push("/deals");
  };

  const dummyDataSets = [
    {
      label: "Acme Corp — Series B",
      data: {
        name: "Acme Corp Series B",
        counterparty: "Acme Corporation",
        equityTicker: "ACME",
        investmentAmount: "25000000",
        dealDate: "2026-03-15",
        settlementDate: "2026-03-22",
        notes: "Series B equity investment. Lead investor position with board seat. Strong revenue growth at 140% YoY.",
      },
    },
    {
      label: "Nova Energy — Convertible Note",
      data: {
        name: "Nova Energy Convertible Note",
        counterparty: "Nova Energy Inc.",
        equityTicker: "NOVA",
        investmentAmount: "10000000",
        dealDate: "2026-04-01",
        settlementDate: "2026-04-08",
        notes: "Convertible note with 20% discount and $500M cap. Co-investing alongside Greenfield Partners.",
      },
    },
  ];

  const handleLoadDummy = async (data: Record<string, string>) => {
    // Always use the entry user for data entry
    const entryUser = users.find((u) => u.role === "entry");
    if (!entryUser) return;

    // Switch to entry user
    setCurrentUser(entryUser);

    for (const [field, value] of Object.entries(data)) {
      await fetch(`/api/deals/${dealId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          field,
          value: value || null,
          userId: entryUser.id,
          source: "manual",
        }),
      });
    }

    // Submit for approval as entry user
    await fetch(`/api/deals/${dealId}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: entryUser.id }),
    });

    // Switch to approver user
    const approverUser = users.find((u) => u.role === "approver");
    if (approverUser) {
      setCurrentUser(approverUser);
    }

    mutateDeal();
    mutate(`/api/deals/${dealId}/audit`);
  };

  if (!deal) return <p className="text-muted-foreground">Loading...</p>;

  const isEditable = deal.status === "entry" || deal.status === "rejected" || deal.status === "pending_approval";

  const getSuggestionForField = (fieldName: string) =>
    pendingSuggestions.find((s) => s.fieldName === fieldName);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold">{deal.name}</h2>
          {isEditable && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-6 text-[11px] gap-1 px-2">
                  <FlaskConical className="h-3 w-3" />
                  Load Demo Data
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {dummyDataSets.map((set) => (
                  <DropdownMenuItem
                    key={set.label}
                    onClick={() => handleLoadDummy(set.data)}
                    className="text-xs"
                  >
                    {set.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        <Badge
          className={`${statusColors[deal.status]} text-[11px] font-medium border px-1.5 py-0`}
          variant="secondary"
        >
          {statusLabels[deal.status]}
        </Badge>
      </div>

      {/* Status banner */}
      {deal.status === "entry" && (
        <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
          <span className="font-semibold">Data Entry Mode</span> — Fill in the deal fields below. Once complete, submit for approval by the Portfolio Manager.
        </div>
      )}
      {deal.status === "pending_approval" && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <span className="font-semibold">Pending Approval</span> — This deal is awaiting review by the Portfolio Manager.
        </div>
      )}
      {deal.status === "approved" && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          <span className="font-semibold">Approved</span> — This deal has been approved by the Portfolio Manager.
        </div>
      )}
      {deal.status === "rejected" && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
          <span className="font-semibold">Rejected</span> — This deal was sent back for revision. Update the fields and resubmit.
        </div>
      )}

      {/* Column headers */}
      <div className="grid grid-cols-[140px_160px_1fr_28px_180px] gap-2 items-center">
        <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
          Field
        </span>
        <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
          AI Suggestion
        </span>
        <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
          Value
        </span>
        <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground text-center" title="Stored in database">
          DB
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
          const hasStoredValue = value !== "";
          return (
            <div
              key={field.key}
              className="grid grid-cols-[140px_160px_1fr_28px_180px] gap-2 items-start"
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

              {/* Value input — key includes deal.updatedAt so inputs remount with fresh values */}
              <div>
                {field.type === "textarea" ? (
                  <Textarea
                    key={`${field.key}-${deal.updatedAt}`}
                    defaultValue={value}
                    disabled={!isEditable}
                    onBlur={(e) => handleFieldBlur(field.key, e.target.value)}
                    className="min-h-[60px]"
                  />
                ) : (
                  <Input
                    key={`${field.key}-${deal.updatedAt}`}
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

              {/* Stored in DB indicator */}
              <div className="pt-1.5 flex justify-center">
                {hasStoredValue ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                ) : (
                  <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/20" />
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
            className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4"
          >
            Submit for Approval of Portfolio Manager
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
        <div className="ml-auto">
          <Button
            onClick={handleDelete}
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground hover:text-red-600"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            Delete
          </Button>
        </div>
      </div>

      <AuditTimeline logs={auditLogs} />
    </div>
  );
}
