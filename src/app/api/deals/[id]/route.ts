import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  deals,
  auditLogs,
  suggestions,
  documents,
  notifications,
  chatMessages,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const deal = db.select().from(deals).where(eq(deals.id, id)).get();
  if (!deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }
  return NextResponse.json(deal);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { field, value, userId, source = "manual" } = body;

  const deal = db.select().from(deals).where(eq(deals.id, id)).get();
  if (!deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  const oldValue = (deal as Record<string, unknown>)[field];
  const now = new Date().toISOString();

  db.update(deals)
    .set({ [field]: value, updatedAt: now })
    .where(eq(deals.id, id))
    .run();

  db.insert(auditLogs)
    .values({
      id: uuid(),
      dealId: id,
      userId,
      action: source === "agent" ? "AGENT_EXTRACTED" : "FIELD_UPDATED",
      fieldName: field,
      oldValue: oldValue != null ? String(oldValue) : null,
      newValue: value != null ? String(value) : null,
      source,
      timestamp: now,
    })
    .run();

  const updated = db.select().from(deals).where(eq(deals.id, id)).get();
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const deal = db.select().from(deals).where(eq(deals.id, id)).get();
  if (!deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  // Delete related rows first (no FK cascade in SQLite by default)
  db.delete(chatMessages).where(eq(chatMessages.dealId, id)).run();
  db.delete(notifications).where(eq(notifications.dealId, id)).run();
  db.delete(suggestions).where(eq(suggestions.dealId, id)).run();
  db.delete(auditLogs).where(eq(auditLogs.dealId, id)).run();
  db.delete(documents).where(eq(documents.dealId, id)).run();
  db.delete(deals).where(eq(deals.id, id)).run();

  return NextResponse.json({ success: true });
}
