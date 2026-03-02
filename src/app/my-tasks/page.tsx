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
      (d.status === "entry" || d.status === "rejected")
  );

  const myApprovalDeals = deals.filter(
    (d) =>
      d.assignedApprover === currentUser.id && d.status === "pending_approval"
  );

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">My Tasks</h1>

      {myEntryDeals.length === 0 && myApprovalDeals.length === 0 && (
        <p className="text-muted-foreground">No tasks assigned to you.</p>
      )}

      {myEntryDeals.length > 0 && (
        <div>
          <h2 className="text-lg font-medium mb-3">Data Entry</h2>
          <div className="grid gap-3">
            {myEntryDeals.map((deal) => (
              <Link key={deal.id} href={`/deals/${deal.id}`}>
                <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-medium">{deal.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {deal.counterparty || "No counterparty set"}
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className={
                        deal.status === "rejected"
                          ? "bg-red-100 text-red-800"
                          : "bg-blue-100 text-blue-800"
                      }
                    >
                      {deal.status === "rejected" ? "Rejected — needs revision" : "In progress"}
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
          <h2 className="text-lg font-medium mb-3">Pending Your Approval</h2>
          <div className="grid gap-3">
            {myApprovalDeals.map((deal) => (
              <Link key={deal.id} href={`/deals/${deal.id}`}>
                <Card className="hover:bg-accent/50 transition-colors cursor-pointer border-yellow-200">
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-medium">{deal.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {deal.counterparty || "No counterparty set"}
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className="bg-yellow-100 text-yellow-800"
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
