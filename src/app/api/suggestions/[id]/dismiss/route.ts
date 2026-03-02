import { NextResponse } from "next/server";
import { db } from "@/db";
import { suggestions } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const [suggestion] = await db
    .select()
    .from(suggestions)
    .where(eq(suggestions.id, id));
  if (!suggestion) {
    return NextResponse.json(
      { error: "Suggestion not found" },
      { status: 404 }
    );
  }

  await db
    .update(suggestions)
    .set({ status: "dismissed" })
    .where(eq(suggestions.id, id));

  return NextResponse.json({ success: true });
}
