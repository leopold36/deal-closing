import { NextResponse } from "next/server";
import { db } from "@/db";
import { documents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { supabase, DOCUMENTS_BUCKET } from "@/lib/supabase";
import { SAMPLE_DOCUMENTS } from "@/lib/sample-documents";

// ---------------------------------------------------------------------------
// PDF generation using pdfkit
// ---------------------------------------------------------------------------
async function generatePdf(content: string): Promise<Buffer> {
  const PDFDocument = (await import("pdfkit")).default;
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const lines = content.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        doc.moveDown(0.5);
        continue;
      }
      if (
        trimmed === trimmed.toUpperCase() &&
        trimmed.length > 3 &&
        /[A-Z]/.test(trimmed)
      ) {
        doc.font("Helvetica-Bold").fontSize(12).text(trimmed);
      } else if (/^\d+\./.test(trimmed)) {
        doc.font("Helvetica-Bold").fontSize(10).text(trimmed);
      } else {
        doc.font("Helvetica").fontSize(10).text(trimmed);
      }
    }
    doc.end();
  });
}

// ---------------------------------------------------------------------------
// DOCX generation using docx library
// ---------------------------------------------------------------------------
async function generateDocx(content: string): Promise<Buffer> {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel } =
    await import("docx");
  const paragraphs = content.split("\n").map((line) => {
    const trimmed = line.trim();
    if (!trimmed) return new Paragraph({ text: "" });
    if (
      trimmed === trimmed.toUpperCase() &&
      trimmed.length > 3 &&
      /[A-Z]/.test(trimmed)
    ) {
      return new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun({ text: trimmed, bold: true })],
      });
    }
    if (/^\d+\./.test(trimmed)) {
      return new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: trimmed, bold: true })],
      });
    }
    return new Paragraph({ children: [new TextRun({ text: trimmed })] });
  });
  const doc = new Document({ sections: [{ children: paragraphs }] });
  return Buffer.from(await Packer.toBuffer(doc));
}

// ---------------------------------------------------------------------------
// POST /api/sample-documents/upload
// ---------------------------------------------------------------------------
export async function POST(req: Request) {
  const body = await req.json();
  const { sampleId, dealId, userId } = body as {
    sampleId: string;
    dealId: string;
    userId: string;
  };

  if (!sampleId || !dealId || !userId) {
    return NextResponse.json(
      { error: "sampleId, dealId, and userId are required" },
      { status: 400 }
    );
  }

  const sample = SAMPLE_DOCUMENTS.find((s) => s.id === sampleId);
  if (!sample) {
    return NextResponse.json(
      { error: `Sample document not found: ${sampleId}` },
      { status: 404 }
    );
  }

  // Generate file buffer based on format
  let buffer: Buffer;
  switch (sample.format) {
    case "PDF":
      buffer = await generatePdf(sample.content);
      break;
    case "DOCX":
      buffer = await generateDocx(sample.content);
      break;
    case "TXT":
    case "CSV":
      buffer = Buffer.from(sample.content, "utf-8");
      break;
    default:
      return NextResponse.json(
        { error: `Unsupported format: ${sample.format}` },
        { status: 400 }
      );
  }

  // Upload to Supabase Storage
  const storagePath = `${dealId}/${sample.filename}`;
  const { error: uploadError } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .upload(storagePath, buffer, {
      contentType: sample.mimeType,
      upsert: true,
    });

  if (uploadError) {
    console.error("Supabase upload error:", uploadError.message);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }

  // Insert document record into DB
  const docId = uuid();
  await db.insert(documents).values({
    id: docId,
    dealId,
    filename: sample.filename,
    filepath: storagePath,
    mimeType: sample.mimeType,
    uploadedBy: userId,
    uploadedAt: new Date().toISOString(),
  });

  const [doc] = await db
    .select()
    .from(documents)
    .where(eq(documents.id, docId));
  return NextResponse.json(doc, { status: 201 });
}
