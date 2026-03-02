import { NextResponse } from "next/server";
import { db } from "@/db";
import { documents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { supabase, DOCUMENTS_BUCKET } from "@/lib/supabase";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const { docId } = await params;

  const [doc] = await db
    .select()
    .from(documents)
    .where(eq(documents.id, docId));

  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const ext = doc.filename.split(".").pop()?.toLowerCase();

  // For PDF, return the public Supabase URL — the client will use an iframe
  if (ext === "pdf") {
    const { data } = supabase.storage
      .from(DOCUMENTS_BUCKET)
      .getPublicUrl(doc.filepath);
    return NextResponse.json({ type: "pdf", url: data.publicUrl });
  }

  // For other formats, download and return content
  const { data: blob, error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .download(doc.filepath);

  if (error || !blob) {
    return NextResponse.json(
      { error: "Failed to download document" },
      { status: 500 }
    );
  }

  const buffer = Buffer.from(await blob.arrayBuffer());

  if (ext === "docx") {
    const mammoth = await import("mammoth");
    const result = await mammoth.convertToHtml({ buffer });
    return NextResponse.json({ type: "html", content: result.value });
  }

  // TXT, CSV — plain text
  return NextResponse.json({
    type: "text",
    content: buffer.toString("utf-8"),
  });
}
