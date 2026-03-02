import { NextResponse } from "next/server";
import { db } from "@/db";
import { suggestions } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const rows = db
    .select()
    .from(suggestions)
    .where(and(eq(suggestions.dealId, id), eq(suggestions.status, "pending")))
    .all();
  return NextResponse.json(rows);
}
