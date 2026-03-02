"use client";

import Link from "next/link";
import useSWR from "swr";
import { Deal } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const statusColors: Record<string, string> = {
  entry: "bg-blue-500/10 text-blue-700 border-blue-200",
  pending_approval: "bg-amber-500/10 text-amber-700 border-amber-200",
  approved: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  rejected: "bg-red-500/10 text-red-700 border-red-200",
};

const statusLabels: Record<string, string> = {
  entry: "Entry",
  pending_approval: "Pending Approval",
  approved: "Approved",
  rejected: "Rejected",
};

export function DealsList() {
  const { data: deals = [], isLoading } = useSWR<Deal[]>("/api/deals", fetcher);

  if (isLoading) {
    return <p className="text-muted-foreground">Loading deals...</p>;
  }

  if (deals.length === 0) {
    return (
      <p className="text-muted-foreground">
        No deals yet. Create your first deal to get started.
      </p>
    );
  }

  return (
    <table className="w-full financial-table">
      <thead>
        <tr className="border-b bg-muted/30">
          <th className="text-left px-3 py-2">Deal Name</th>
          <th className="text-left px-3 py-2">Counterparty</th>
          <th className="text-left px-3 py-2">Ticker</th>
          <th className="text-right px-3 py-2">Amount</th>
          <th className="text-left px-3 py-2">Status</th>
          <th className="text-right px-3 py-2">Updated</th>
        </tr>
      </thead>
      <tbody>
        {deals.map((deal) => (
          <tr key={deal.id} className="cursor-pointer">
            <td className="px-3">
              <Link
                href={`/deals/${deal.id}`}
                className="font-medium text-primary hover:underline"
              >
                {deal.name}
              </Link>
            </td>
            <td className="px-3 text-muted-foreground">{deal.counterparty || "\u2014"}</td>
            <td className="px-3 font-mono text-muted-foreground">{deal.equityTicker || "\u2014"}</td>
            <td className="px-3 text-right font-mono tabular-nums">
              {deal.investmentAmount
                ? `$${deal.investmentAmount.toLocaleString()}`
                : "\u2014"}
            </td>
            <td className="px-3">
              <Badge className={`${statusColors[deal.status]} text-[11px] font-medium border px-1.5 py-0`} variant="secondary">
                {statusLabels[deal.status]}
              </Badge>
            </td>
            <td className="px-3 text-right text-muted-foreground font-mono tabular-nums">
              {new Date(deal.updatedAt).toLocaleDateString()}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
