import { NextResponse } from "next/server";
import { db } from "@/db";
import { deals, auditLogs, notifications, users, fieldApprovals } from "@/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { userId } = await req.json();
  const now = new Date().toISOString();

  // Get the deal to find assigned approver before clearing it
  const [deal] = await db.select().from(deals).where(eq(deals.id, id));
  const approverId = deal?.assignedApprover;

  await db
    .update(deals)
    .set({
      status: "recalled",
      assignedApprover: null,
      updatedAt: now,
    })
    .where(eq(deals.id, id));

  // Clear all field approvals
  await db.delete(fieldApprovals).where(eq(fieldApprovals.dealId, id));

  await db.insert(auditLogs).values({
    id: uuid(),
    dealId: id,
    userId,
    action: "RECALLED",
    source: "manual",
    timestamp: now,
  });

  // Notify the approver that the deal was recalled
  if (approverId) {
    await db.insert(notifications).values({
      id: uuid(),
      userId: approverId,
      dealId: id,
      message: `Deal "${deal.name}" was recalled to data entry`,
      createdAt: now,
    });
  }

  return NextResponse.json({ status: "recalled" });
}
