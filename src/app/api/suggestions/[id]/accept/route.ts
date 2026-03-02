import { NextResponse } from "next/server";
import { db } from "@/db";
import { suggestions, deals, auditLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { userId } = await req.json();

  const suggestion = db
    .select()
    .from(suggestions)
    .where(eq(suggestions.id, id))
    .get();
  if (!suggestion) {
    return NextResponse.json(
      { error: "Suggestion not found" },
      { status: 404 }
    );
  }

  if (!suggestion.dealId) {
    return NextResponse.json(
      { error: "Suggestion has no associated deal" },
      { status: 400 }
    );
  }

  const deal = db
    .select()
    .from(deals)
    .where(eq(deals.id, suggestion.dealId))
    .get();
  if (!deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  const now = new Date().toISOString();
  const oldValue = (deal as Record<string, unknown>)[suggestion.fieldName];
  const fieldValue =
    suggestion.fieldName === "investmentAmount"
      ? parseFloat(suggestion.suggestedValue)
      : suggestion.suggestedValue;

  // Update the deal field
  db.update(deals)
    .set({ [suggestion.fieldName]: fieldValue, updatedAt: now })
    .where(eq(deals.id, suggestion.dealId))
    .run();

  // Mark suggestion as accepted
  db.update(suggestions)
    .set({ status: "accepted" })
    .where(eq(suggestions.id, id))
    .run();

  // Create audit log
  db.insert(auditLogs)
    .values({
      id: uuid(),
      dealId: suggestion.dealId,
      userId,
      action: "AGENT_EXTRACTED",
      fieldName: suggestion.fieldName,
      oldValue: oldValue != null ? String(oldValue) : null,
      newValue: suggestion.suggestedValue,
      source: "agent",
      documentId: suggestion.documentId,
      documentPage: suggestion.documentPage,
      timestamp: now,
    })
    .run();

  return NextResponse.json({ success: true });
}
