"use client";

import { useState, useCallback } from "react";
import useSWR, { mutate } from "swr";
import { useUser } from "@/lib/user-context";
import { Deal, AuditLog, Suggestion, FieldApproval, DEAL_FIELDS } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldAuditChip } from "./field-audit-chip";
import { AuditTimeline } from "./audit-timeline";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, X, Undo2, Lightbulb, Loader2, History } from "lucide-react";
import { cn } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const statusLabels: Record<string, string> = {
  entry: "Data Entry",
  pending_approval: "Pending Approval",
  approved: "Approved",
  rejected: "Rejected",
  recalled: "Recalled",
};

const statusColors: Record<string, string> = {
  entry: "bg-blue-500/10 text-blue-700 border-blue-200",
  pending_approval: "bg-amber-500/10 text-amber-700 border-amber-200",
  approved: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  rejected: "bg-red-500/10 text-red-700 border-red-200",
  recalled: "bg-violet-500/10 text-violet-700 border-violet-200",
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

  // Field approvals — only fetch when relevant
  const shouldFetchApprovals =
    deal?.status === "pending_approval" || deal?.status === "approved";
  const { data: fieldApprovals = [], mutate: mutateFieldApprovals } = useSWR<
    FieldApproval[]
  >(
    shouldFetchApprovals ? `/api/deals/${dealId}/field-approvals` : null,
    fetcher
  );

  const fieldApprovalsSet = new Set(fieldApprovals.map((fa) => fa.fieldName));

  const [saving, setSaving] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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
      mutateFieldApprovals();
      setSaving(null);
    },
    [deal, currentUser, dealId, mutateDeal, mutateFieldApprovals]
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
    setActionLoading("submit");
    await fetch(`/api/deals/${dealId}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: currentUser.id }),
    });
    mutateDeal();
    mutate(`/api/deals/${dealId}/audit`);
    setActionLoading(null);
  };

  const handleApprove = async () => {
    if (!currentUser) return;
    setActionLoading("approve");
    await fetch(`/api/deals/${dealId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: currentUser.id }),
    });
    mutateDeal();
    mutate(`/api/deals/${dealId}/audit`);
    mutateFieldApprovals();
    setActionLoading(null);
  };

  const handleReject = async () => {
    const comment = prompt("Rejection reason:");
    if (!comment || !currentUser) return;
    setActionLoading("reject");
    await fetch(`/api/deals/${dealId}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: currentUser.id, comment }),
    });
    mutateDeal();
    mutate(`/api/deals/${dealId}/audit`);
    setActionLoading(null);
  };

  const handleRecall = async () => {
    if (!currentUser) return;
    setActionLoading("recall");
    await fetch(`/api/deals/${dealId}/recall`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: currentUser.id }),
    });
    mutateDeal();
    mutate(`/api/deals/${dealId}/audit`);
    setActionLoading(null);
  };

  const handleToggleFieldApproval = async (fieldName: string) => {
    if (!currentUser) return;
    await fetch(`/api/deals/${dealId}/field-approvals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fieldName, userId: currentUser.id }),
    });
    mutateFieldApprovals();
  };

  if (!deal) return <p className="text-muted-foreground">Loading...</p>;

  const isEntryPhase = deal.status === "entry" || deal.status === "rejected" || deal.status === "recalled";
  const isApprovalPhase = deal.status === "pending_approval";
  const isEditable =
    (isEntryPhase && currentUser?.role !== "approver") ||
    (isApprovalPhase && currentUser?.role === "approver");

  const showApprovalCheckboxes =
    (deal.status === "pending_approval" || deal.status === "approved") &&
    currentUser?.role === "approver";

  const getSuggestionForField = (fieldName: string) =>
    pendingSuggestions.find((s) => s.fieldName === fieldName);

  const approvedCount = fieldApprovalsSet.size;
  const totalFields = DEAL_FIELDS.length;
  const uncheckedCount = totalFields - approvedCount;
  const allChecked = approvedCount === totalFields;

  const gridCols = showApprovalCheckboxes
    ? "grid-cols-[28px_100px_1fr_150px]"
    : "grid-cols-[100px_1fr_150px]";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">{deal.name}</h2>
        <Badge
          className={`${statusColors[deal.status]} text-[11px] font-medium border px-1.5 py-0`}
          variant="secondary"
        >
          {statusLabels[deal.status]}
        </Badge>
      </div>

      {/* Status banner — role-aware messaging */}
      {deal.status === "entry" && (
        <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-[11px] text-blue-800">
          {currentUser?.role === "approver" ? (
            <><span className="font-semibold">Data Entry</span> — This deal is being prepared by the data entry team. Values are read-only until submitted for your approval.</>
          ) : (
            <><span className="font-semibold">Data Entry Mode</span> — Fill in the deal fields below. Once complete, submit for approval by the Portfolio Manager.</>
          )}
        </div>
      )}
      {deal.status === "pending_approval" && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] text-amber-800">
          {currentUser?.role === "approver" ? (
            <><span className="font-semibold">Your Review Required</span> — Please verify all deal values and approve or reject this submission.</>
          ) : (
            <><span className="font-semibold">Pending Approval</span> — This deal has been submitted and is awaiting review by the Portfolio Manager.</>
          )}
        </div>
      )}
      {deal.status === "approved" && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] text-emerald-800">
          {currentUser?.role === "approver" ? (
            <><span className="font-semibold">Approved</span> — You have approved this deal.</>
          ) : (
            <><span className="font-semibold">Approved</span> — This deal has been approved by the Portfolio Manager.</>
          )}
        </div>
      )}
      {deal.status === "rejected" && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-[11px] text-red-800">
          {currentUser?.role === "approver" ? (
            <><span className="font-semibold">Rejected</span> — You have rejected this deal and sent it back for revision.</>
          ) : (
            <><span className="font-semibold">Rejected</span> — This deal was sent back for revision. Update the fields and resubmit.</>
          )}
        </div>
      )}
      {deal.status === "recalled" && (
        <div className="rounded-md border border-violet-200 bg-violet-50 px-3 py-1.5 text-[11px] text-violet-800">
          {currentUser?.role === "approver" ? (
            <><span className="font-semibold">Recalled</span> — This deal was recalled by the entry team and is being revised.</>
          ) : (
            <><span className="font-semibold">Recalled</span> — This deal was recalled from approval. Update the fields and resubmit when ready.</>
          )}
        </div>
      )}

      {/* Approval progress bar */}
      {showApprovalCheckboxes && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Fields verified</span>
            <span className="font-medium tabular-nums">{approvedCount}/{totalFields}</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${(approvedCount / totalFields) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Column headers */}
      <div className={cn("grid gap-2 items-center border-b pb-1.5", gridCols)}>
        {showApprovalCheckboxes && (
          <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground text-center">
            OK
          </span>
        )}
        <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
          Field
        </span>
        <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
          Value
        </span>
        <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
          Last Edit
        </span>
      </div>

      {/* Field rows */}
      <div className="divide-y">
        {DEAL_FIELDS.map((field, index) => {
          const value = String(
            (deal as Record<string, unknown>)[field.key] ?? ""
          );
          const suggestion = getSuggestionForField(field.key);
          const isOddRow = index % 2 === 1;
          const isFieldApproved = fieldApprovalsSet.has(field.key);
          const isCurrency = field.type === "currency";

          return (
            <div
              key={field.key}
              className={cn(
                "grid gap-2 items-start py-1.5",
                gridCols,
                isOddRow && "bg-muted/30",
                isFieldApproved && showApprovalCheckboxes && "bg-emerald-50/40"
              )}
            >
              {/* Checkbox column */}
              {showApprovalCheckboxes && (
                <div className="flex justify-center pt-1.5">
                  <Checkbox
                    checked={isFieldApproved}
                    disabled={deal.status === "approved"}
                    onCheckedChange={() => handleToggleFieldApproval(field.key)}
                  />
                </div>
              )}

              {/* Label */}
              <Label className="pt-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                {field.label}
              </Label>

              {/* Value input + inline AI suggestion */}
              <div>
                {field.type === "textarea" ? (
                  <Textarea
                    key={`${field.key}-${deal.updatedAt}`}
                    defaultValue={value}
                    disabled={!isEditable}
                    onBlur={(e) => handleFieldBlur(field.key, e.target.value)}
                    className={cn(
                      "min-h-[44px] text-[11px]",
                      suggestion && "border-amber-300 ring-1 ring-amber-200/50"
                    )}
                  />
                ) : (
                  <Input
                    key={`${field.key}-${deal.updatedAt}`}
                    type={field.type === "currency" ? "number" : field.type}
                    defaultValue={value}
                    disabled={!isEditable}
                    onBlur={(e) => handleFieldBlur(field.key, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                    className={cn(
                      "h-7 text-[11px]",
                      isCurrency && "font-mono tabular-nums",
                      suggestion && "border-amber-300 ring-1 ring-amber-200/50"
                    )}
                  />
                )}
                {saving === field.key && (
                  <span className="text-[11px] text-muted-foreground">
                    Saving...
                  </span>
                )}
                {/* Inline AI suggestion bar */}
                {suggestion && (
                  <div className="mt-1 flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-2 py-0.5">
                    <Lightbulb className="h-3 w-3 text-amber-500 shrink-0" />
                    <span className="text-[11px] truncate flex-1 text-amber-800 tabular-nums">
                      {suggestion.suggestedValue}
                    </span>
                    <button
                      onClick={() => handleAcceptSuggestion(suggestion)}
                      className="shrink-0 rounded p-0.5 hover:bg-emerald-100 text-emerald-600"
                      title="Accept suggestion"
                    >
                      <Check className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => handleDismissSuggestion(suggestion)}
                      className="shrink-0 rounded p-0.5 hover:bg-red-100 text-red-500"
                      title="Dismiss suggestion"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>

              {/* Audit chip */}
              <FieldAuditChip fieldName={field.key} auditLogs={auditLogs} />
            </div>
          );
        })}
      </div>

      <div className="flex gap-2 pt-3 border-t">
        {(deal.status === "entry" || deal.status === "recalled") && (
          <Button
            onClick={handleSubmitForApproval}
            disabled={actionLoading === "submit"}
            size="sm"
            className="h-7 text-[11px] bg-blue-600 hover:bg-blue-700 text-white font-semibold px-3"
          >
            {actionLoading === "submit" && <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />}
            Submit for Approval of Portfolio Manager
          </Button>
        )}
        {deal.status === "pending_approval" && currentUser?.role === "approver" && (
          <>
            <Button
              onClick={handleApprove}
              disabled={actionLoading === "approve"}
              size="sm"
              className="h-7 text-[11px] bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              {actionLoading === "approve" && <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />}
              {allChecked ? "Approve Deal" : `Approve All (${uncheckedCount} unchecked)`}
            </Button>
            <Button
              onClick={handleReject}
              disabled={actionLoading === "reject"}
              variant="destructive"
              size="sm"
              className="h-7 text-[11px]"
            >
              {actionLoading === "reject" && <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />}
              Reject
            </Button>
          </>
        )}
        {deal.status === "pending_approval" && currentUser?.role === "entry" && (
          <Button
            onClick={handleRecall}
            disabled={actionLoading === "recall"}
            size="sm"
            className="h-7 text-[11px] bg-blue-600 hover:bg-blue-700 text-white font-semibold"
          >
            {actionLoading === "recall" ? (
              <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
            ) : (
              <Undo2 className="h-3 w-3 mr-1.5" />
            )}
            Recall Submission
          </Button>
        )}
        {deal.status === "approved" && (
          <p className="text-[11px] text-emerald-600 font-medium">
            This deal has been approved.
          </p>
        )}
        <div className="ml-auto">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-[11px] text-muted-foreground"
              >
                <History className="h-3.5 w-3.5 mr-1" />
                Audit Trail ({auditLogs.length})
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[400px] sm:max-w-[400px] p-0">
              <SheetHeader className="px-4 pt-4 pb-2 border-b">
                <SheetTitle className="text-sm">Audit Trail</SheetTitle>
              </SheetHeader>
              <ScrollArea className="h-[calc(100vh-4rem)]">
                <div className="p-4">
                  <AuditTimeline logs={auditLogs} />
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </div>
  );
}
