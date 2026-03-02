import { NextResponse } from "next/server";
import { db } from "@/db";
import { deals, auditLogs, notifications, fieldApprovals } from "@/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { userId, comment } = await req.json();
  const now = new Date().toISOString();

  const [deal] = await db.select().from(deals).where(eq(deals.id, id));
  if (!deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  await db
    .update(deals)
    .set({ status: "entry", assignedApprover: null, updatedAt: now })
    .where(eq(deals.id, id));

  // Clear all field approvals
  await db.delete(fieldApprovals).where(eq(fieldApprovals.dealId, id));

  await db.insert(auditLogs).values({
    id: uuid(),
    dealId: id,
    userId,
    action: "REJECTED",
    source: "manual",
    comment,
    timestamp: now,
  });

  if (deal.createdBy) {
    await db.insert(notifications).values({
      id: uuid(),
      userId: deal.createdBy,
      dealId: id,
      message: `Your deal was rejected: ${comment}`,
      createdAt: now,
    });
  }

  return NextResponse.json({ status: "rejected" });
}
