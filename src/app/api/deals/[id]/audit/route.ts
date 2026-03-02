import { NextResponse } from "next/server";
import { db } from "@/db";
import { auditLogs, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const logs = db
    .select({
      id: auditLogs.id,
      dealId: auditLogs.dealId,
      userId: auditLogs.userId,
      action: auditLogs.action,
      fieldName: auditLogs.fieldName,
      oldValue: auditLogs.oldValue,
      newValue: auditLogs.newValue,
      source: auditLogs.source,
      documentId: auditLogs.documentId,
      documentPage: auditLogs.documentPage,
      comment: auditLogs.comment,
      timestamp: auditLogs.timestamp,
      userName: users.name,
      userEmail: users.email,
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.userId, users.id))
    .where(eq(auditLogs.dealId, id))
    .orderBy(desc(auditLogs.timestamp))
    .all();

  return NextResponse.json(logs);
}
