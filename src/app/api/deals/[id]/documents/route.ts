import { NextResponse } from "next/server";
import { db } from "@/db";
import { documents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const docs = db
    .select()
    .from(documents)
    .where(eq(documents.dealId, id))
    .all();
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

  const uploadDir = path.join(process.cwd(), "uploads", id);
  await mkdir(uploadDir, { recursive: true });

  const filename = file.name;
  const filepath = path.join(uploadDir, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filepath, buffer);

  const docId = uuid();
  db.insert(documents)
    .values({
      id: docId,
      dealId: id,
      filename,
      filepath: `uploads/${id}/${filename}`,
      mimeType: file.type,
      uploadedBy: userId,
      uploadedAt: new Date().toISOString(),
    })
    .run();

  const doc = db.select().from(documents).where(eq(documents.id, docId)).get();
  return NextResponse.json(doc, { status: 201 });
}
