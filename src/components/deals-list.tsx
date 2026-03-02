"use client";

import Link from "next/link";
import useSWR from "swr";
import { Deal } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const statusColors: Record<string, string> = {
  entry: "bg-blue-100 text-blue-800",
  pending_approval: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
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
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Deal Name</TableHead>
          <TableHead>Counterparty</TableHead>
          <TableHead>Ticker</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Updated</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {deals.map((deal) => (
          <TableRow key={deal.id} className="cursor-pointer hover:bg-accent/50">
            <TableCell>
              <Link
                href={`/deals/${deal.id}`}
                className="font-medium text-primary hover:underline"
              >
                {deal.name}
              </Link>
            </TableCell>
            <TableCell>{deal.counterparty || "—"}</TableCell>
            <TableCell>{deal.equityTicker || "—"}</TableCell>
            <TableCell>
              {deal.investmentAmount
                ? `$${deal.investmentAmount.toLocaleString()}`
                : "—"}
            </TableCell>
            <TableCell>
              <Badge className={statusColors[deal.status]} variant="secondary">
                {statusLabels[deal.status]}
              </Badge>
            </TableCell>
            <TableCell className="text-muted-foreground text-sm">
              {new Date(deal.updatedAt).toLocaleDateString()}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
