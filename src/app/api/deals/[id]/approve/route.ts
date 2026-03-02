import { NextResponse } from "next/server";
import { db } from "@/db";
import { deals, auditLogs, notifications } from "@/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { userId } = await req.json();
  const now = new Date().toISOString();

  const deal = db.select().from(deals).where(eq(deals.id, id)).get();
  if (!deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  db.update(deals)
    .set({ status: "approved", updatedAt: now })
    .where(eq(deals.id, id))
    .run();

  db.insert(auditLogs)
    .values({
      id: uuid(),
      dealId: id,
      userId,
      action: "APPROVED",
      source: "manual",
      timestamp: now,
    })
    .run();

  if (deal.createdBy) {
    db.insert(notifications)
      .values({
        id: uuid(),
        userId: deal.createdBy,
        dealId: id,
        message: `Your deal has been approved`,
        createdAt: now,
      })
      .run();
  }

  return NextResponse.json({ status: "approved" });
}
