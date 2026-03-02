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
