import { NextResponse } from "next/server";
import { db } from "@/db";
import { deals, users, auditLogs } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function GET() {
  const allDeals = db.select().from(deals).orderBy(desc(deals.createdAt)).all();

  const allUsers = db.select().from(users).all();
  const userMap = new Map(allUsers.map((u) => [u.id, u]));

  // Get APPROVED audit entries to find approver info
  const approvedLogs = db
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.action, "APPROVED"))
    .orderBy(desc(auditLogs.timestamp))
    .all();

  const approverByDeal = new Map(
    approvedLogs.map((log) => [
      log.dealId,
      { userId: log.userId, timestamp: log.timestamp },
    ])
  );

  const enriched = allDeals.map((deal) => {
    const creator = deal.createdBy ? userMap.get(deal.createdBy) : null;
    const approval = approverByDeal.get(deal.id);
    const approver = approval?.userId ? userMap.get(approval.userId) : null;

    return {
      ...deal,
      createdByName: creator?.name ?? null,
      createdByEmail: creator?.email ?? null,
      approvedByName: approver?.name ?? null,
      approvedByEmail: approver?.email ?? null,
      approvedAt: approval?.timestamp ?? null,
    };
  });

  return NextResponse.json(enriched);
}
