# Document Viewer Modal + Source Column Design

**Goal:** Allow users to view uploaded documents in a modal, and show a "Source" column in the deal form linking each field to the document it was extracted from.

## Document Viewer Modal

**Trigger:** Click any document row in the Documents section.

**Viewing by format:**
- **PDF:** `<iframe>` with Supabase public URL. Browser's built-in PDF viewer handles pages.
- **TXT / CSV:** Fetch text from `GET /api/deals/[id]/documents/[docId]/content`, display in `<pre>` with monospace font in a scroll area.
- **DOCX:** Same endpoint extracts text via `mammoth` server-side, returned as HTML, rendered in a scroll area.

**Modal layout:**
- shadcn Dialog, `max-w-4xl`, `h-[85vh]`
- Header: filename + format badge + close X
- Body: iframe for PDF, scroll area for text/DOCX

## Source Column

- New column in deal form grid after "Last Edit": **"Source"**
- For each field, find the most recent audit log entry with `source === "agent"` and a non-null `documentId`
- If found: clickable document icon with truncated filename — opens document viewer modal
- If not found: "—"
- Data comes from existing `auditLogs` SWR fetch — no new endpoint needed

## Files

| File | Change |
|------|--------|
| `src/components/document-viewer.tsx` | **New** — Dialog with iframe/text rendering |
| `src/components/deal-form.tsx` | Add Source column, make document rows clickable, integrate viewer |
| `src/app/api/deals/[id]/documents/[docId]/content/route.ts` | **New** — serves text/HTML content for TXT/CSV/DOCX |
