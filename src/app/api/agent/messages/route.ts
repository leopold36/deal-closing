import { NextResponse } from "next/server";
import { db } from "@/db";
import { chatMessages } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const dealId = url.searchParams.get("dealId");

  if (!dealId) {
    return NextResponse.json([]);
  }

  const messages = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.dealId, dealId))
    .orderBy(asc(chatMessages.timestamp));

  return NextResponse.json(messages);
}

export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const dealId = url.searchParams.get("dealId");

  if (!dealId) {
    return NextResponse.json({ error: "dealId required" }, { status: 400 });
  }

  await db.delete(chatMessages).where(eq(chatMessages.dealId, dealId));

  return NextResponse.json({ success: true });
}
