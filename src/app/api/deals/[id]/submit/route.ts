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

  // Only entry users can submit deals
  const [submitter] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId));

  if (!submitter || submitter.role !== "entry") {
    return NextResponse.json(
      { error: "Only data entry users can submit deals" },
      { status: 403 }
    );
  }

  const [approver] = await db
    .select()
    .from(users)
    .where(eq(users.role, "approver"));

  if (!approver) {
    return NextResponse.json(
      { error: "No approver available" },
      { status: 400 }
    );
  }

  await db
    .update(deals)
    .set({
      status: "pending_approval",
      assignedApprover: approver.id,
      updatedAt: now,
    })
    .where(eq(deals.id, id));

  await db.insert(auditLogs).values({
    id: uuid(),
    dealId: id,
    userId,
    action: "SUBMITTED",
    source: "manual",
    timestamp: now,
  });

  await db.insert(notifications).values({
    id: uuid(),
    userId: approver.id,
    dealId: id,
    message: `Deal requires your approval`,
    createdAt: now,
  });

  return NextResponse.json({ status: "submitted" });
}
