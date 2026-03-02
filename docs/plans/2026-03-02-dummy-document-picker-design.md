# Dummy Document Picker Design

## Problem

The upload button opens the native OS file picker, but for demos and testing there are no sample documents available. Users need pre-made documents with realistic deal data to test the document reading and field extraction flow.

## Solution

Replace the native file picker with a **shadcn Dialog** that shows 4 sample documents (one per demo deal, one per supported format) plus an "Upload your own file" option.

## Document Mapping

| Deal | Filename | Format | Content Type |
|------|----------|--------|-------------|
| Acme Corp Series B | `Acme_Corp_Term_Sheet.pdf` | PDF | Term sheet: $25M Series B, ticker ACME, dates 2026-03-15/22 |
| Nova Energy Convertible Note | `Nova_Energy_Note_Agreement.docx` | DOCX | Convertible note: $10M, 20% discount, $500M cap, NOVA, dates 2026-04-01/08 |
| Meridian Health Growth Equity | `Meridian_Health_Deal_Summary.txt` | TXT | Deal memo: $50M growth equity, MHSI, 3x revenue, dates 2026-03-20/28 |
| Atlas Robotics Pre-IPO | `Atlas_Robotics_Cap_Table.csv` | CSV | Cap table: $75M pre-IPO, ATLR, 200+ clients, dates 2026-04-10/17 |

Each document contains enough text for the agent to extract all 7 deal fields.

## Architecture

### Data Flow

1. User clicks Upload button in chat panel
2. Dialog opens showing 4 sample document cards + "Upload your own" button
3. User clicks a sample doc card
4. Frontend calls `POST /api/sample-documents/upload` with `{ sampleId, dealId, userId }`
5. API generates the file on disk (in `uploads/{dealId}/`), creates a `documents` DB record
6. Frontend receives doc record, sends message to agent with doc ID
7. Agent reads document, lists extractable fields, user clicks to extract

### No New DB Tables

Sample document definitions live in code (`src/lib/sample-documents.ts`). Files are generated on demand and stored using the existing `documents` table and `uploads/` filesystem — identical to real uploads.

## Dialog UI

```
┌─────────────────────────────────────────┐
│  Upload Document                     [X] │
│─────────────────────────────────────────│
│  SAMPLE DOCUMENTS                       │
│  ┌─────────────────────────────────┐    │
│  │ [icon] Acme Corp Term Sheet PDF │    │
│  │        Series B equity term...  │    │
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │ [icon] Nova Energy Note    DOCX │    │
│  │        Convertible note agr...  │    │
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │ [icon] Meridian Health Sum. TXT │    │
│  │        Growth equity deal memo  │    │
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │ [icon] Atlas Robotics Cap   CSV │    │
│  │        Pre-IPO cap table        │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ─────────── OR ───────────             │
│                                         │
│  [ Upload your own file ]               │
└─────────────────────────────────────────┘
```

## Files

| File | Change |
|------|--------|
| `src/lib/sample-documents.ts` | **New** — sample doc definitions with content templates |
| `src/app/api/sample-documents/upload/route.ts` | **New** — API to generate file + create document record |
| `src/components/chat-panel.tsx` | Replace file input click with dialog; add dialog component |
| `src/components/upload-dialog.tsx` | **New** — shadcn Dialog with sample doc cards + upload own |

## PDF/DOCX Generation

- **PDF**: Use a lightweight library (e.g., `pdfkit`) to generate a real PDF from the text content at upload time
- **DOCX**: Use `docx` library to generate a real DOCX file
- **TXT/CSV**: Direct `fs.writeFile` with text content

These libraries are only needed server-side for sample document generation.
