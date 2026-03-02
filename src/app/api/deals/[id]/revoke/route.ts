import { NextResponse } from "next/server";
import { db } from "@/db";
import { deals, auditLogs, fieldApprovals, notifications } from "@/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { userId } = await req.json();
  const now = new Date().toISOString();

  const [deal] = await db.select().from(deals).where(eq(deals.id, id));
  if (!deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  if (deal.status !== "approved") {
    return NextResponse.json(
      { error: "Only approved deals can be revoked" },
      { status: 400 }
    );
  }

  // Set back to pending_approval
  await db
    .update(deals)
    .set({ status: "pending_approval", updatedAt: now })
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

  // Notify entry user
  if (deal.createdBy) {
    await db.insert(notifications).values({
      id: uuid(),
      userId: deal.createdBy,
      dealId: id,
      message: "Deal approval has been revoked and is back under review",
      createdAt: now,
    });
  }

  return NextResponse.json({ status: "pending_approval" });
}
