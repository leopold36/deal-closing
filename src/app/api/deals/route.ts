import { NextResponse } from "next/server";
import { db } from "@/db";
import { deals, auditLogs } from "@/db/schema";
import { v4 as uuid } from "uuid";
import { desc, eq } from "drizzle-orm";

export async function GET() {
  const allDeals = await db.select().from(deals).orderBy(desc(deals.createdAt));
  return NextResponse.json(allDeals);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { name, userId } = body;

  const now = new Date().toISOString();
  const dealId = uuid();

  await db.insert(deals).values({
    id: dealId,
    name,
    status: "entry",
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
  });

  await db.insert(auditLogs).values({
    id: uuid(),
    dealId,
    userId,
    action: "CREATED",
    source: "manual",
    timestamp: now,
  });

  const [deal] = await db.select().from(deals).where(eq(deals.id, dealId));
  return NextResponse.json(deal, { status: 201 });
}
