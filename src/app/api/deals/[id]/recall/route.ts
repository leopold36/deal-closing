import { NextResponse } from "next/server";
import { db } from "@/db";
import { deals, auditLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { userId } = await req.json();
  const now = new Date().toISOString();

  await db
    .update(deals)
    .set({
      status: "entry",
      assignedApprover: null,
      updatedAt: now,
    })
    .where(eq(deals.id, id));

  await db.insert(auditLogs).values({
    id: uuid(),
    dealId: id,
    userId,
    action: "RECALLED",
    source: "manual",
    timestamp: now,
  });

  return NextResponse.json({ status: "recalled" });
}
