import { NextResponse } from "next/server";
import { db } from "@/db";
import { documents, auditLogs, suggestions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { supabase, DOCUMENTS_BUCKET } from "@/lib/supabase";

export async function DELETE(
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

  // Delete from Supabase Storage
  const { error: storageError } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .remove([doc.filepath]);

  if (storageError) {
    console.error("Supabase delete error:", storageError.message);
  }

  // Clear foreign key references before deleting
  await db
    .update(auditLogs)
    .set({ documentId: null, documentPage: null })
    .where(eq(auditLogs.documentId, docId));

  await db
    .update(suggestions)
    .set({ documentId: null, documentPage: null })
    .where(eq(suggestions.documentId, docId));

  // Delete from DB
  await db.delete(documents).where(eq(documents.id, docId));

  return NextResponse.json({ ok: true });
}
