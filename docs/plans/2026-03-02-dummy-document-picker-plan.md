# Dummy Document Picker Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the native file picker with a dialog showing 4 pre-made sample documents (one per demo deal, each a different file format) plus an "upload your own" option.

**Architecture:** Sample document metadata and text content are defined in `src/lib/sample-documents.ts`. A new API endpoint generates real files (PDF, DOCX, TXT, CSV) on demand and creates standard `documents` DB records. The chat panel upload button opens a shadcn Dialog instead of the native file picker. Selecting a sample doc triggers the same upload→agent flow as a real file.

**Tech Stack:** Next.js, TypeScript, Tailwind, shadcn/ui Dialog, `pdfkit` (PDF generation), `docx` (DOCX generation), Drizzle ORM, existing `documents` table.

---

### Task 1: Install PDF and DOCX generation libraries

**Files:**
- Modify: `package.json`
- Modify: `next.config.ts`

**Step 1: Install dependencies**

Run:
```bash
npm install pdfkit @types/pdfkit docx
```

**Step 2: Add pdfkit to serverExternalPackages**

In `next.config.ts`, update:

```ts
const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "mammoth", "pdfkit"],
};
```

**Step 3: Commit**

```bash
git add package.json package-lock.json next.config.ts
git commit -m "chore: add pdfkit and docx for sample document generation"
```

---

### Task 2: Create sample documents definition file

**Files:**
- Create: `src/lib/sample-documents.ts`

**Step 1: Create the sample documents definition**

This file defines the 4 sample documents with their metadata and text content. Each document's content is rich enough for the AI agent to extract all 7 deal fields.

```ts
// src/lib/sample-documents.ts

export type SampleDocument = {
  id: string;
  filename: string;
  mimeType: string;
  format: string;       // "PDF" | "DOCX" | "TXT" | "CSV"
  label: string;        // Display label in dialog
  description: string;  // Short description shown in dialog
  dealName: string;     // Which demo deal this matches
  content: string;      // Text content used to generate the file
};

export const SAMPLE_DOCUMENTS: SampleDocument[] = [
  {
    id: "sample-acme-term-sheet",
    filename: "Acme_Corp_Term_Sheet.pdf",
    mimeType: "application/pdf",
    format: "PDF",
    label: "Acme Corp Term Sheet",
    description: "Series B equity term sheet with investment details",
    dealName: "Acme Corp Series B",
    content: `TERM SHEET

SERIES B PREFERRED STOCK FINANCING

Date: March 15, 2026

Company: Acme Corporation
Equity Ticker: ACME

Issuer: Acme Corporation, a Delaware corporation

Investors: LGT Capital Partners (Lead Investor)

Amount of Financing: $25,000,000 (Twenty-Five Million US Dollars)

Type of Security: Series B Preferred Stock

Deal Date: March 15, 2026
Expected Settlement Date: March 22, 2026

Pre-Money Valuation: $200,000,000

Key Terms:
- Lead investor position with one board seat
- Pro-rata rights for future rounds
- Standard information rights and inspection rights
- 1x non-participating liquidation preference

Company Overview:
Acme Corporation is a high-growth enterprise SaaS company with strong revenue growth at 140% year-over-year. The company serves over 500 enterprise customers across financial services and healthcare verticals.

Notes: Series B equity investment. Lead investor position with board seat. Strong revenue growth at 140% YoY.

This term sheet is non-binding and is subject to the execution of definitive agreements.`,
  },
  {
    id: "sample-nova-note",
    filename: "Nova_Energy_Note_Agreement.docx",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    format: "DOCX",
    label: "Nova Energy Note Agreement",
    description: "Convertible note agreement with discount and cap",
    dealName: "Nova Energy Convertible Note",
    content: `CONVERTIBLE PROMISSORY NOTE AGREEMENT

Effective Date: April 1, 2026

PARTIES:
Issuer: Nova Energy Inc. (the "Company")
Equity Ticker: NOVA
Investor: LGT Capital Partners AG (the "Holder")

PRINCIPAL AMOUNT: $10,000,000 (Ten Million US Dollars)

Deal Date: April 1, 2026
Settlement Date: April 8, 2026

1. CONVERSION TERMS

1.1 Discount Rate: 20% discount to the price per share in a Qualified Financing
1.2 Valuation Cap: $500,000,000

2. INTEREST
Interest shall accrue at a rate of 5% per annum, compounded annually.

3. MATURITY
This Note shall mature 24 months from the date of issuance unless earlier converted.

4. QUALIFIED FINANCING
A Qualified Financing means an equity financing resulting in gross proceeds to the Company of at least $15,000,000.

5. CO-INVESTORS
Greenfield Partners has committed to co-invest $5,000,000 under the same terms.

COMPANY OVERVIEW:
Nova Energy Inc. is a renewable energy technology company developing next-generation solar panel systems with 40% higher efficiency than current market leaders.

Notes: Convertible note with 20% discount and $500M cap. Co-investing alongside Greenfield Partners.

IN WITNESS WHEREOF, the parties have executed this Agreement as of the date first written above.`,
  },
  {
    id: "sample-meridian-summary",
    filename: "Meridian_Health_Deal_Summary.txt",
    mimeType: "text/plain",
    format: "TXT",
    label: "Meridian Health Deal Summary",
    description: "Growth equity deal memo with financial details",
    dealName: "Meridian Health Growth Equity",
    content: `DEAL SUMMARY — MERIDIAN HEALTH SYSTEMS GROWTH EQUITY

Deal Name: Meridian Health Growth Equity
Counterparty: Meridian Health Systems
Equity Ticker: MHSI

Investment Amount: $50,000,000 (USD)
Deal Date: March 20, 2026
Settlement Date: March 28, 2026
Transaction Type: Growth Equity

INVESTMENT THESIS:
Meridian Health Systems operates a leading digital health platform serving hospitals and clinics across North America. The company has demonstrated strong unit economics and achieved EBITDA-positive status since Q3 2025.

VALUATION:
- Entry multiple: 3x trailing twelve-month revenue
- Revenue (TTM): $167M
- Enterprise Value: $500M post-money

CO-INVESTORS:
LGT Capital Partners will co-lead this round alongside Sequoia Capital. Combined investment of $100M with equal participation.

KEY METRICS:
- Revenue growth: 85% YoY
- Net revenue retention: 135%
- Gross margin: 72%
- 1,200+ hospital network customers

Notes: Growth equity round in digital health platform. 3x revenue multiple. Co-lead with Sequoia. EBITDA-positive since Q3 2025.`,
  },
  {
    id: "sample-atlas-captable",
    filename: "Atlas_Robotics_Cap_Table.csv",
    mimeType: "text/csv",
    format: "CSV",
    label: "Atlas Robotics Cap Table",
    description: "Pre-IPO cap table with allocation details",
    dealName: "Atlas Robotics Pre-IPO",
    content: `Deal Name,Atlas Robotics Pre-IPO
Counterparty,Atlas Robotics Ltd.
Equity Ticker,ATLR
Deal Date,2026-04-10
Settlement Date,2026-04-17

Investor,Shares,Investment Amount (USD),Share Class,Percentage
LGT Capital Partners,7500000,75000000,Series E Preferred,5.00%
Founders & Management,45000000,,Common,30.00%
Series A (Early Ventures),15000000,,Series A Preferred,10.00%
Series B (Growth Fund),22500000,,Series B Preferred,15.00%
Series C (Tiger Global),30000000,,Series C Preferred,20.00%
Series D (SoftBank Vision),22500000,,Series D Preferred,15.00%
Employee Stock Options,7500000,,Common (Options),5.00%
Total,150000000,,,100.00%

Notes: Pre-IPO allocation. IPO expected Q3 2026 at $4B+ valuation. Warehouse automation leader with 200+ enterprise clients.
Company: Atlas Robotics Ltd. is the global leader in warehouse automation solutions.`,
  },
];
```

**Step 2: Commit**

```bash
git add src/lib/sample-documents.ts
git commit -m "feat: add sample document definitions for 4 demo deals"
```

---

### Task 3: Create the sample document upload API endpoint

**Files:**
- Create: `src/app/api/sample-documents/upload/route.ts`

**Step 1: Create the API route**

This endpoint receives a `sampleId`, `dealId`, and `userId`. It looks up the sample document definition, generates the real file on disk (using pdfkit for PDF, docx for DOCX, or plain write for TXT/CSV), creates a standard `documents` DB record, and returns the document object.

```ts
// src/app/api/sample-documents/upload/route.ts

import { NextResponse } from "next/server";
import { db } from "@/db";
import { documents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { SAMPLE_DOCUMENTS } from "@/lib/sample-documents";

async function generatePdf(content: string): Promise<Buffer> {
  const PDFDocument = (await import("pdfkit")).default;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Simple text layout — split by lines, bold for ALL-CAPS headings
    const lines = content.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        doc.moveDown(0.5);
        continue;
      }
      // Headings: lines that are ALL CAPS or start with section numbers
      if (trimmed === trimmed.toUpperCase() && trimmed.length > 3 && /[A-Z]/.test(trimmed)) {
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

async function generateDocx(content: string): Promise<Buffer> {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import("docx");

  const paragraphs = content.split("\n").map((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      return new Paragraph({ text: "" });
    }
    // ALL-CAPS lines as headings
    if (trimmed === trimmed.toUpperCase() && trimmed.length > 3 && /[A-Z]/.test(trimmed)) {
      return new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun({ text: trimmed, bold: true })],
      });
    }
    // Section numbered lines as subheadings
    if (/^\d+\./.test(trimmed)) {
      return new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: trimmed, bold: true })],
      });
    }
    return new Paragraph({
      children: [new TextRun({ text: trimmed })],
    });
  });

  const doc = new Document({
    sections: [{ children: paragraphs }],
  });

  return Buffer.from(await Packer.toBuffer(doc));
}

export async function POST(req: Request) {
  const { sampleId, dealId, userId } = await req.json();

  const sample = SAMPLE_DOCUMENTS.find((s) => s.id === sampleId);
  if (!sample) {
    return NextResponse.json({ error: "Sample document not found" }, { status: 404 });
  }

  // Generate the file content based on format
  let fileBuffer: Buffer;

  switch (sample.format) {
    case "PDF":
      fileBuffer = await generatePdf(sample.content);
      break;
    case "DOCX":
      fileBuffer = await generateDocx(sample.content);
      break;
    case "TXT":
    case "CSV":
      fileBuffer = Buffer.from(sample.content, "utf-8");
      break;
    default:
      return NextResponse.json({ error: "Unsupported format" }, { status: 400 });
  }

  // Save to disk (same structure as real uploads)
  const uploadDir = path.join(process.cwd(), "uploads", dealId);
  await mkdir(uploadDir, { recursive: true });

  const filepath = path.join(uploadDir, sample.filename);
  await writeFile(filepath, fileBuffer);

  // Create DB record
  const docId = uuid();
  await db.insert(documents).values({
    id: docId,
    dealId,
    filename: sample.filename,
    filepath: `uploads/${dealId}/${sample.filename}`,
    mimeType: sample.mimeType,
    uploadedBy: userId,
    uploadedAt: new Date().toISOString(),
  });

  const [doc] = await db.select().from(documents).where(eq(documents.id, docId));
  return NextResponse.json(doc, { status: 201 });
}
```

**Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/app/api/sample-documents/upload/route.ts
git commit -m "feat: add API endpoint for generating and uploading sample documents"
```

---

### Task 4: Create the upload dialog component

**Files:**
- Create: `src/components/upload-dialog.tsx`

**Step 1: Create the dialog component**

```tsx
// src/components/upload-dialog.tsx

"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, FileSpreadsheet, File, Upload, Loader2 } from "lucide-react";
import { SAMPLE_DOCUMENTS, SampleDocument } from "@/lib/sample-documents";
import { useState } from "react";

const FORMAT_COLORS: Record<string, string> = {
  PDF: "bg-red-100 text-red-700 border-red-200",
  DOCX: "bg-blue-100 text-blue-700 border-blue-200",
  TXT: "bg-gray-100 text-gray-700 border-gray-200",
  CSV: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

const FORMAT_ICONS: Record<string, typeof FileText> = {
  PDF: FileText,
  DOCX: File,
  TXT: File,
  CSV: FileSpreadsheet,
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectSample: (sample: SampleDocument) => Promise<void>;
  onUploadOwn: () => void;
  disabled?: boolean;
};

export function UploadDialog({
  open,
  onOpenChange,
  onSelectSample,
  onUploadOwn,
  disabled,
}: Props) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleSelect = async (sample: SampleDocument) => {
    setLoading(sample.id);
    try {
      await onSelectSample(sample);
      onOpenChange(false);
    } finally {
      setLoading(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm">Upload Document</DialogTitle>
          <DialogDescription className="text-xs">
            Choose a sample document or upload your own file.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
            Sample Documents
          </span>
          {SAMPLE_DOCUMENTS.map((sample) => {
            const Icon = FORMAT_ICONS[sample.format] ?? File;
            const isLoading = loading === sample.id;

            return (
              <button
                key={sample.id}
                onClick={() => handleSelect(sample)}
                disabled={disabled || loading !== null}
                className="w-full flex items-center gap-3 rounded-md border p-2.5 text-left hover:bg-muted/50 transition-colors disabled:opacity-50"
              >
                <div className="shrink-0 p-1.5 rounded bg-muted">
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : (
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium truncate">
                      {sample.label}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-[9px] px-1.5 py-0 h-4 font-mono ${FORMAT_COLORS[sample.format] ?? ""}`}
                    >
                      {sample.format}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {sample.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="relative my-1">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-[10px] uppercase">
            <span className="bg-background px-2 text-muted-foreground">or</span>
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full h-8 text-xs"
          onClick={() => {
            onOpenChange(false);
            onUploadOwn();
          }}
          disabled={disabled || loading !== null}
        >
          <Upload className="h-3.5 w-3.5 mr-2" />
          Upload your own file
        </Button>
      </DialogContent>
    </Dialog>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/upload-dialog.tsx
git commit -m "feat: add upload dialog component with sample document cards"
```

---

### Task 5: Update chat panel to use the upload dialog

**Files:**
- Modify: `src/components/chat-panel.tsx`

**Step 1: Replace the upload button click with dialog**

Changes needed in `chat-panel.tsx`:

1. Import the new components:
```tsx
import { UploadDialog } from "@/components/upload-dialog";
import { SampleDocument } from "@/lib/sample-documents";
```

2. Add dialog open state:
```tsx
const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
```

3. Add a handler for sample document selection:
```tsx
const handleSelectSample = async (sample: SampleDocument) => {
  if (!currentUser) return;

  const res = await fetch("/api/sample-documents/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sampleId: sample.id,
      dealId,
      userId: currentUser.id,
    }),
  });
  const doc = await res.json();

  mutate(`/api/deals/${dealId}/documents`);

  await sendMessage(
    `I've uploaded a document: "${sample.filename}" (document ID: ${doc.id}). Please read it and tell me which deal fields you can extract from it.`
  );
};
```

4. Change the Upload button's `onClick` from `() => fileInputRef.current?.click()` to `() => setUploadDialogOpen(true)`.

5. Add the dialog component just before the closing `</div>` of the component return, passing `onUploadOwn={() => fileInputRef.current?.click()}` to keep the native picker as a fallback.

6. Add the `<UploadDialog>` component to the JSX:
```tsx
<UploadDialog
  open={uploadDialogOpen}
  onOpenChange={setUploadDialogOpen}
  onSelectSample={handleSelectSample}
  onUploadOwn={() => fileInputRef.current?.click()}
  disabled={streaming}
/>
```

**Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/components/chat-panel.tsx
git commit -m "feat: wire upload dialog into chat panel, replacing native file picker"
```

---

### Task 6: Verify the full flow

**Step 1: Start dev server**

Run: `npm run dev`
Expected: App starts without errors

**Step 2: Manual verification checklist**

1. Open a deal page in the browser
2. Click the Upload button in the chat panel → dialog opens with 4 sample docs + "Upload your own"
3. Click "Upload your own" → native file picker opens (existing behavior preserved)
4. Click a sample document (e.g., Meridian Health TXT) → dialog closes, message appears in chat, agent reads it and suggests fields
5. Check `uploads/{dealId}/` directory → file exists on disk
6. Check Documents section below the deal form → newly uploaded sample doc appears
7. Click a field button in chat → agent extracts and suggests the value
8. Accept a suggestion → field updates in the form

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat: dummy document picker with sample docs for all 4 demo deals"
```
