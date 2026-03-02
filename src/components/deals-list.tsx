"use client";

import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Deal } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Trash2, ChevronRight } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const statusColors: Record<string, string> = {
  entry: "bg-blue-500/10 text-blue-700 border-blue-200",
  pending_approval: "bg-amber-500/10 text-amber-700 border-amber-200",
  approved: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  rejected: "bg-red-500/10 text-red-700 border-red-200",
  recalled: "bg-violet-500/10 text-violet-700 border-violet-200",
};

const statusLabels: Record<string, string> = {
  entry: "Entry",
  pending_approval: "Pending Approval",
  approved: "Approved",
  rejected: "Rejected",
  recalled: "Recalled",
};

export function DealsList() {
  const router = useRouter();
  const { data: deals = [], isLoading, mutate: mutateDeals } = useSWR<Deal[]>("/api/deals", fetcher);

  const handleDelete = async (e: React.MouseEvent, dealId: string) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this deal? This cannot be undone.")) return;
    mutateDeals(deals.filter((d) => d.id !== dealId), false);
    await fetch(`/api/deals/${dealId}`, { method: "DELETE" });
    mutateDeals();
  };

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
    <table className="w-full financial-table text-[12px]">
      <thead>
        <tr className="border-b bg-muted/30">
          <th className="text-left px-3 py-1.5">Deal Name</th>
          <th className="text-left px-3 py-1.5">Status</th>
          <th className="text-right px-3 py-1.5">Updated</th>
          <th className="px-3 py-1.5 w-10"></th>
          <th className="px-3 py-1.5 w-8"></th>
        </tr>
      </thead>
      <tbody>
        {deals.map((deal) => (
          <tr
            key={deal.id}
            onClick={() => router.push(`/deals/${deal.id}`)}
            className="cursor-pointer hover:bg-muted/50 transition-colors"
          >
            <td className="px-3 font-medium">
              {deal.name}
            </td>
            <td className="px-3">
              <Badge className={`${statusColors[deal.status]} text-[11px] font-medium border px-1.5 py-0`} variant="secondary">
                {statusLabels[deal.status]}
              </Badge>
            </td>
            <td className="px-3 text-right text-muted-foreground font-mono tabular-nums">
              {new Date(deal.updatedAt).toLocaleDateString()}
            </td>
            <td className="px-3 text-center">
              <button
                onClick={(e) => handleDelete(e, deal.id)}
                className="p-1 rounded hover:bg-red-50 text-muted-foreground/40 hover:text-red-600 transition-colors"
                title="Delete deal"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </td>
            <td className="px-1 text-muted-foreground/40">
              <ChevronRight className="h-4 w-4" />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
