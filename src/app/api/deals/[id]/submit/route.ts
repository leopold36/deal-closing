import { NextResponse } from "next/server";
import { db } from "@/db";
import { deals, auditLogs, notifications, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { userId } = await req.json();
  const now = new Date().toISOString();

  const approver = db
    .select()
    .from(users)
    .where(eq(users.role, "approver"))
    .get();

  if (!approver) {
    return NextResponse.json(
      { error: "No approver available" },
      { status: 400 }
    );
  }

  db.update(deals)
    .set({
      status: "pending_approval",
      assignedApprover: approver.id,
      updatedAt: now,
    })
    .where(eq(deals.id, id))
    .run();

  db.insert(auditLogs)
    .values({
      id: uuid(),
      dealId: id,
      userId,
      action: "SUBMITTED",
      source: "manual",
      timestamp: now,
    })
    .run();

  db.insert(notifications)
    .values({
      id: uuid(),
      userId: approver.id,
      dealId: id,
      message: `Deal requires your approval`,
      createdAt: now,
    })
    .run();

  return NextResponse.json({ status: "submitted" });
}
