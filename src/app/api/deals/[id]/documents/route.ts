import { NextResponse } from "next/server";
import { db } from "@/db";
import { documents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { supabase, DOCUMENTS_BUCKET } from "@/lib/supabase";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const docs = await db
    .select()
    .from(documents)
    .where(eq(documents.dealId, id));
  return NextResponse.json(docs);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const formData = await req.formData();
  const file = formData.get("file") as File;
  const userId = formData.get("userId") as string;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const filename = file.name;
  const storagePath = `${id}/${filename}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    console.error("Supabase upload error:", uploadError.message);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }

  const docId = uuid();
  await db.insert(documents).values({
    id: docId,
    dealId: id,
    filename,
    filepath: storagePath,
    mimeType: file.type,
    uploadedBy: userId,
    uploadedAt: new Date().toISOString(),
  });

  const [doc] = await db
    .select()
    .from(documents)
    .where(eq(documents.id, docId));
  return NextResponse.json(doc, { status: 201 });
}
