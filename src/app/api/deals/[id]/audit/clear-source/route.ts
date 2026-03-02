import { NextResponse } from "next/server";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { fieldName } = await req.json();

  if (!fieldName) {
    return NextResponse.json(
      { error: "fieldName is required" },
      { status: 400 }
    );
  }

  // Clear documentId from all audit logs for this field on this deal
  await db
    .update(auditLogs)
    .set({ documentId: null, documentPage: null })
    .where(
      and(eq(auditLogs.dealId, id), eq(auditLogs.fieldName, fieldName))
    );

  return NextResponse.json({ ok: true });
}
