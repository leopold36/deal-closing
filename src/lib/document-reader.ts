import path from "path";
import { supabase, DOCUMENTS_BUCKET } from "@/lib/supabase";

const MAX_CHARS = 50_000;

async function downloadFromSupabase(storagePath: string): Promise<Buffer> {
  const { data, error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .download(storagePath);

  if (error || !data) {
    throw new Error(`Failed to download from Supabase: ${error?.message}`);
  }

  return Buffer.from(await data.arrayBuffer());
}

export async function readDocumentAsText(filepath: string): Promise<string> {
  const buffer = await downloadFromSupabase(filepath);
  const ext = path.extname(filepath).toLowerCase();
  let text: string;

  switch (ext) {
    case ".pdf": {
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: new Uint8Array(buffer) });
      const result = await parser.getText();
      text = result.text;
      await parser.destroy();
      break;
    }
    case ".docx": {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
      break;
    }
    case ".txt":
    case ".csv": {
      text = buffer.toString("utf-8");
      break;
    }
    default:
      throw new Error(`Unsupported file type: ${ext}`);
  }

  if (text.length > MAX_CHARS) {
    text = text.slice(0, MAX_CHARS) + "\n\n[Truncated at 50,000 characters]";
  }

  return text;
}
