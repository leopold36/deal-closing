import { NextResponse } from "next/server";
import { db } from "@/db";
import { fieldApprovals } from "@/db/schema";
import { sql } from "drizzle-orm";

export async function GET() {
  const rows = await db
    .select({
      dealId: fieldApprovals.dealId,
      count: sql<number>`count(*)`.as("count"),
    })
    .from(fieldApprovals)
    .groupBy(fieldApprovals.dealId);

  const counts: Record<string, number> = {};
  for (const row of rows) {
    if (row.dealId) counts[row.dealId] = Number(row.count);
  }

  return NextResponse.json(counts);
}
