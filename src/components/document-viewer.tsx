"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";
import { Document } from "@/lib/types";

type Props = {
  document: Document | null;
  dealId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type ContentData =
  | { type: "pdf"; url: string }
  | { type: "html"; content: string }
  | { type: "text"; content: string };

const FORMAT_COLORS: Record<string, string> = {
  pdf: "bg-red-100 text-red-700 border-red-200",
  docx: "bg-blue-100 text-blue-700 border-blue-200",
  txt: "bg-gray-100 text-gray-700 border-gray-200",
  csv: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

export function DocumentViewer({ document: doc, dealId, open, onOpenChange }: Props) {
  const [content, setContent] = useState<ContentData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !doc) {
      setContent(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    fetch(`/api/deals/${dealId}/documents/${doc.id}/content`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load document");
        return res.json();
      })
      .then((data: ContentData) => setContent(data))
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));
  }, [open, doc, dealId]);

  const ext = doc?.filename.split(".").pop()?.toLowerCase() ?? "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-4 py-3 border-b shrink-0">
          <div className="flex items-center gap-2">
            <DialogTitle className="text-sm truncate">
              {doc?.filename}
            </DialogTitle>
            <Badge
              variant="outline"
              className={`text-[9px] px-1.5 py-0 h-4 font-mono uppercase ${FORMAT_COLORS[ext] ?? ""}`}
            >
              {ext}
            </Badge>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {loading && (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center h-full text-sm text-red-500">
              {error}
            </div>
          )}

          {content?.type === "pdf" && (
            <iframe
              src={content.url}
              className="w-full h-full border-0"
              title={doc?.filename}
            />
          )}

          {content?.type === "html" && (
            <ScrollArea className="h-full">
              <div
                className="p-6 prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: content.content }}
              />
            </ScrollArea>
          )}

          {content?.type === "text" && (
            <ScrollArea className="h-full">
              <pre className="p-6 text-xs font-mono whitespace-pre-wrap">
                {content.content}
              </pre>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
