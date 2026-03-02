"use client";

import useSWR from "swr";
import { Badge } from "@/components/ui/badge";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type EnrichedDeal = {
  id: string;
  name: string;
  counterparty: string | null;
  equityTicker: string | null;
  investmentAmount: number | null;
  dealDate: string | null;
  settlementDate: string | null;
  notes: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  createdByName: string | null;
  createdByEmail: string | null;
  approvedByName: string | null;
  approvedByEmail: string | null;
  approvedAt: string | null;
};

const statusColors: Record<string, string> = {
  entry: "bg-blue-500/10 text-blue-700 border-blue-200",
  pending_approval: "bg-amber-500/10 text-amber-700 border-amber-200",
  approved: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  rejected: "bg-red-500/10 text-red-700 border-red-200",
};

const statusLabels: Record<string, string> = {
  entry: "Entry",
  pending_approval: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

export default function SnowflakeDataPage() {
  const { data: deals = [], isLoading } = useSWR<EnrichedDeal[]>(
    "/api/snowflake-data",
    fetcher,
    { refreshInterval: 3000 }
  );

  return (
    <div className="px-4 py-3 max-w-[1400px] mx-auto space-y-4">
      <div>
        <h1 className="text-base font-semibold">Snowflake Data</h1>
        <p className="text-xs text-muted-foreground">
          Live view of the deals tables as they would appear in Snowflake.
          Auto-refreshes every 3 seconds.
        </p>
      </div>

      {/* Table 1: Deal Cloud Source — Deal Names */}
      <div>
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
          Deal Cloud <span className="font-normal text-muted-foreground/70">— Source System</span>
        </h2>
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-2 py-1 font-mono font-semibold text-muted-foreground whitespace-nowrap">DEAL_NAME</th>
                <th className="text-left px-2 py-1 font-mono font-semibold text-muted-foreground whitespace-nowrap">STATUS</th>
                <th className="text-left px-2 py-1 font-mono font-semibold text-muted-foreground whitespace-nowrap">CREATED_AT</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={3} className="px-2 py-3 text-center text-muted-foreground">Loading...</td></tr>
              )}
              {!isLoading && deals.length === 0 && (
                <tr><td colSpan={3} className="px-2 py-3 text-center text-muted-foreground">No deals yet.</td></tr>
              )}
              {deals.map((deal) => (
                <tr key={deal.id} className="border-b border-border/30 hover:bg-muted/30">
                  <td className="px-2 py-1 font-medium whitespace-nowrap">{deal.name}</td>
                  <td className="px-2 py-1">
                    <Badge className={`${statusColors[deal.status]} text-[9px] font-medium border px-1 py-0`} variant="secondary">
                      {statusLabels[deal.status]}
                    </Badge>
                  </td>
                  <td className="px-2 py-1 font-mono text-muted-foreground tabular-nums whitespace-nowrap">
                    {new Date(deal.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Table 2: Deal Closing App — Enrichments */}
      <div>
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
          Deal Closing App <span className="font-normal text-muted-foreground/70">— Enrichments</span>
        </h2>
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-2 py-1 font-mono font-semibold text-muted-foreground whitespace-nowrap">DEAL_NAME</th>
                <th className="text-left px-2 py-1 font-mono font-semibold text-muted-foreground whitespace-nowrap">COUNTERPARTY</th>
                <th className="text-left px-2 py-1 font-mono font-semibold text-muted-foreground whitespace-nowrap">EQUITY_TICKER</th>
                <th className="text-right px-2 py-1 font-mono font-semibold text-muted-foreground whitespace-nowrap">INVESTMENT_AMT</th>
                <th className="text-left px-2 py-1 font-mono font-semibold text-muted-foreground whitespace-nowrap">DEAL_DATE</th>
                <th className="text-left px-2 py-1 font-mono font-semibold text-muted-foreground whitespace-nowrap">SETTLEMENT_DATE</th>
                <th className="text-left px-2 py-1 font-mono font-semibold text-muted-foreground whitespace-nowrap">UPDATED_AT</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={7} className="px-2 py-3 text-center text-muted-foreground">Loading...</td></tr>
              )}
              {!isLoading && deals.length === 0 && (
                <tr><td colSpan={7} className="px-2 py-3 text-center text-muted-foreground">No deals yet.</td></tr>
              )}
              {deals.map((deal) => (
                <tr key={deal.id} className="border-b border-border/30 hover:bg-muted/30">
                  <td className="px-2 py-1 font-medium whitespace-nowrap">{deal.name}</td>
                  <td className="px-2 py-1 text-muted-foreground whitespace-nowrap">{deal.counterparty || "\u2014"}</td>
                  <td className="px-2 py-1 font-mono text-muted-foreground">{deal.equityTicker || "\u2014"}</td>
                  <td className="px-2 py-1 text-right font-mono tabular-nums">
                    {deal.investmentAmount != null ? `$${deal.investmentAmount.toLocaleString()}` : "\u2014"}
                  </td>
                  <td className="px-2 py-1 font-mono text-muted-foreground tabular-nums">{deal.dealDate || "\u2014"}</td>
                  <td className="px-2 py-1 font-mono text-muted-foreground tabular-nums">{deal.settlementDate || "\u2014"}</td>
                  <td className="px-2 py-1 font-mono text-muted-foreground tabular-nums whitespace-nowrap">
                    {new Date(deal.updatedAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Table 3: Approval Workflow */}
      <div>
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
          Deal Closing App <span className="font-normal text-muted-foreground/70">— Approval Workflow</span>
        </h2>
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-2 py-1 font-mono font-semibold text-muted-foreground whitespace-nowrap">DEAL_NAME</th>
                <th className="text-left px-2 py-1 font-mono font-semibold text-muted-foreground whitespace-nowrap">CREATED_BY</th>
                <th className="text-left px-2 py-1 font-mono font-semibold text-muted-foreground whitespace-nowrap">APPROVED_BY</th>
                <th className="text-left px-2 py-1 font-mono font-semibold text-muted-foreground whitespace-nowrap">APPROVED_AT</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={4} className="px-2 py-3 text-center text-muted-foreground">Loading...</td></tr>
              )}
              {!isLoading && deals.length === 0 && (
                <tr><td colSpan={4} className="px-2 py-3 text-center text-muted-foreground">No deals yet.</td></tr>
              )}
              {deals.map((deal) => (
                <tr key={deal.id} className="border-b border-border/30 hover:bg-muted/30">
                  <td className="px-2 py-1 font-medium whitespace-nowrap">{deal.name}</td>
                  <td className="px-2 py-1 text-muted-foreground whitespace-nowrap">{deal.createdByName || "\u2014"}</td>
                  <td className="px-2 py-1 text-muted-foreground whitespace-nowrap">{deal.approvedByName || "\u2014"}</td>
                  <td className="px-2 py-1 font-mono text-muted-foreground tabular-nums whitespace-nowrap">
                    {deal.approvedAt ? new Date(deal.approvedAt).toLocaleString() : "\u2014"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
