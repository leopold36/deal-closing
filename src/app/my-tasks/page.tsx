"use client";

import { useUser } from "@/lib/user-context";
import useSWR from "swr";
import { Deal } from "@/lib/types";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function MyTasksPage() {
  const { currentUser } = useUser();
  const { data: deals = [] } = useSWR<Deal[]>("/api/deals", fetcher);

  if (!currentUser) return null;

  const myEntryDeals = deals.filter(
    (d) =>
      d.createdBy === currentUser.id &&
      (d.status === "entry" || d.status === "rejected" || d.status === "recalled")
  );

  const myApprovalDeals = deals.filter(
    (d) =>
      d.assignedApprover === currentUser.id && d.status === "pending_approval"
  );

  return (
    <div className="px-4 py-3 space-y-4">
      <h1 className="text-base font-semibold">My Tasks</h1>

      {myEntryDeals.length === 0 && myApprovalDeals.length === 0 && (
        <p className="text-muted-foreground">No tasks assigned to you.</p>
      )}

      {myEntryDeals.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-2 uppercase tracking-wider text-muted-foreground">Data Entry</h2>
          <div className="grid gap-2">
            {myEntryDeals.map((deal) => (
              <Link key={deal.id} href={`/deals/${deal.id}`}>
                <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                  <CardContent className="flex items-center justify-between p-3">
                    <div>
                      <p className="text-sm font-medium">{deal.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {deal.counterparty || "No counterparty set"}
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className={`text-[11px] ${
                        deal.status === "rejected"
                          ? "bg-red-500/10 text-red-700 border-red-200"
                          : deal.status === "recalled"
                          ? "bg-violet-500/10 text-violet-700 border-violet-200"
                          : "bg-blue-500/10 text-blue-700 border-blue-200"
                      }`}
                    >
                      {deal.status === "rejected"
                        ? "Rejected — needs revision"
                        : deal.status === "recalled"
                        ? "Recalled — ready to resubmit"
                        : "In progress"}
                    </Badge>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {myApprovalDeals.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-2 uppercase tracking-wider text-muted-foreground">Pending Your Approval</h2>
          <div className="grid gap-2">
            {myApprovalDeals.map((deal) => (
              <Link key={deal.id} href={`/deals/${deal.id}`}>
                <Card className="hover:bg-accent/50 transition-colors cursor-pointer border-yellow-200">
                  <CardContent className="flex items-center justify-between p-3">
                    <div>
                      <p className="text-sm font-medium">{deal.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {deal.counterparty || "No counterparty set"}
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className="text-[11px] bg-amber-500/10 text-amber-700 border-amber-200"
                    >
                      Awaiting your approval
                    </Badge>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
