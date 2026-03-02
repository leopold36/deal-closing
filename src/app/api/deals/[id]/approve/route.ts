import { NextResponse } from "next/server";
import { db } from "@/db";
import { deals, auditLogs, notifications, fieldApprovals } from "@/db/schema";
import { eq } from "drizzle-orm";
import { DEAL_FIELDS } from "@/lib/types";
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

  await db
    .update(deals)
    .set({ status: "approved", updatedAt: now })
    .where(eq(deals.id, id));

  await db.insert(auditLogs).values({
    id: uuid(),
    dealId: id,
    userId,
    action: "APPROVED",
    source: "manual",
    timestamp: now,
  });

  // Bulk-insert field approvals for all fields
  await db.delete(fieldApprovals).where(eq(fieldApprovals.dealId, id));
  await db.insert(fieldApprovals).values(
    DEAL_FIELDS.map((f) => ({
      id: uuid(),
      dealId: id,
      fieldName: f.key,
      approvedBy: userId,
      approvedAt: now,
    }))
  );

  if (deal.createdBy) {
    await db.insert(notifications).values({
      id: uuid(),
      userId: deal.createdBy,
      dealId: id,
      message: `Your deal has been approved`,
      createdAt: now,
    });
  }

  return NextResponse.json({ status: "approved" });
}
