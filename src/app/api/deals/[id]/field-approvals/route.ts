import { NextResponse } from "next/server";
import { db } from "@/db";
import { fieldApprovals } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuid } from "uuid";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const approvals = await db
    .select()
    .from(fieldApprovals)
    .where(eq(fieldApprovals.dealId, id));
  return NextResponse.json(approvals);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { fieldName, userId } = await req.json();
  const now = new Date().toISOString();

  // Check if approval already exists for this field
  const [existing] = await db
    .select()
    .from(fieldApprovals)
    .where(
      and(
        eq(fieldApprovals.dealId, id),
        eq(fieldApprovals.fieldName, fieldName)
      )
    );

  if (existing) {
    // Toggle off — remove approval
    await db.delete(fieldApprovals).where(eq(fieldApprovals.id, existing.id));
  } else {
    // Toggle on — insert approval
    await db.insert(fieldApprovals).values({
      id: uuid(),
      dealId: id,
      fieldName,
      approvedBy: userId,
      approvedAt: now,
    });
  }

  // Return updated list
  const approvals = await db
    .select()
    .from(fieldApprovals)
    .where(eq(fieldApprovals.dealId, id));
  return NextResponse.json(approvals);
}
