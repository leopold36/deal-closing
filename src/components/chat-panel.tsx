"use client";

import { useState, useRef, useEffect } from "react";
import { useUser } from "@/lib/user-context";
import useSWR, { mutate } from "swr";
import { ChatMessage } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Upload, Bot, User, RotateCcw, FileText } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { UploadDialog } from "@/components/upload-dialog";
import { SampleDocument } from "@/lib/sample-documents";

const FIELD_LABELS: Record<string, string> = {
  name: "Deal Name",
  counterparty: "Counterparty",
  equityTicker: "Equity Ticker",
  investmentAmount: "Investment Amount",
  dealDate: "Deal Date",
  settlementDate: "Settlement Date",
  notes: "Notes",
};

const FIELD_MARKER_RE = /\[FIELD:(\w+)\]\s*[^\n]*/g;

function parseFieldMarkers(text: string) {
  const fields: string[] = [];
  let match;
  while ((match = FIELD_MARKER_RE.exec(text)) !== null) {
    fields.push(match[1]);
  }
  FIELD_MARKER_RE.lastIndex = 0;
  return fields;
}

function stripFieldMarkers(text: string) {
  return text.replace(/\[FIELD:\w+\]\s*[^\n]*/g, "").trim();
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type Props = {
  dealId: string;
};

export function ChatPanel({ dealId }: Props) {
  const { currentUser } = useUser();
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: messages = [], mutate: mutateMessages } = useSWR<
    ChatMessage[]
  >(`/api/agent/messages?dealId=${dealId}`, fetcher);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || !currentUser || streaming) return;

    setInput("");
    setStreaming(true);
    setStreamingText("");

    const tempMessage: ChatMessage = {
      id: "temp",
      dealId,
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };
    mutateMessages([...messages, tempMessage], false);

    try {
      const response = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          dealId,
          userId: currentUser.id,
        }),
      });

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));

        for (const line of lines) {
          const data = line.slice(6);
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.text) {
              accumulated += parsed.text;
              setStreamingText(accumulated);
            }
          } catch {
            // ignore parse errors for incomplete chunks
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
    }

    setStreaming(false);
    setStreamingText("");
    mutateMessages();
    mutate(`/api/deals/${dealId}`);
    mutate(`/api/deals/${dealId}/audit`);
    mutate(`/api/deals/${dealId}/suggestions`);
    mutate(`/api/deals/${dealId}/documents`);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    // Reset file input so the same file can be re-uploaded
    e.target.value = "";

    const formData = new FormData();
    formData.append("file", file);
    formData.append("userId", currentUser.id);

    try {
      const res = await fetch(`/api/deals/${dealId}/documents`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Upload failed" }));
        console.error("Document upload failed:", err);
        await sendMessage(
          `I tried to upload "${file.name}" but the upload failed. Please try again.`
        );
        return;
      }

      const doc = await res.json();

      if (!doc.id) {
        console.error("Upload response missing document ID:", doc);
        await sendMessage(
          `I tried to upload "${file.name}" but something went wrong. Please try again.`
        );
        return;
      }

      mutate(`/api/deals/${dealId}/documents`);

      await sendMessage(
        `I've uploaded a document: "${file.name}" (document ID: ${doc.id}). Please read it and tell me which deal fields you can extract from it.`
      );
    } catch (error) {
      console.error("Document upload error:", error);
      await sendMessage(
        `I tried to upload "${file.name}" but encountered an error. Please try again.`
      );
    }
  };

  const handleSelectSample = async (sample: SampleDocument) => {
    if (!currentUser) return;

    try {
      const res = await fetch("/api/sample-documents/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sampleId: sample.id,
          dealId,
          userId: currentUser.id,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Upload failed" }));
        console.error("Sample upload failed:", err);
        await sendMessage(
          `I tried to upload the sample document "${sample.filename}" but the upload failed. Please try again.`
        );
        return;
      }

      const doc = await res.json();

      if (!doc.id) {
        console.error("Sample upload response missing document ID:", doc);
        return;
      }

      mutate(`/api/deals/${dealId}/documents`);

      await sendMessage(
        `I've uploaded a document: "${sample.filename}" (document ID: ${doc.id}). Please read it and tell me which deal fields you can extract from it.`
      );
    } catch (error) {
      console.error("Sample upload error:", error);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-3 space-y-3">
            {messages.length === 0 && !streaming && (
              <div className="text-center text-muted-foreground text-xs py-6">
                <Bot className="h-6 w-6 mx-auto mb-2 opacity-50" />
                <p>
                  Upload a document or ask me to help fill in deal information.
                </p>
              </div>
            )}
            {messages.map((msg) => {
              const fields =
                msg.role === "assistant"
                  ? parseFieldMarkers(msg.content)
                  : [];
              const cleanContent =
                fields.length > 0
                  ? stripFieldMarkers(msg.content)
                  : msg.content;

              return (
                <div
                  key={msg.id}
                  className={`flex gap-2 ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {msg.role === "assistant" && (
                    <div className="mt-0.5 p-1 rounded bg-muted shrink-0">
                      <Bot className="h-3 w-3" />
                    </div>
                  )}
                  <div
                    className={`rounded-md px-2.5 py-1.5 max-w-[85%] ${
                      msg.role === "user"
                        ? "bg-slate-700 text-white whitespace-pre-wrap text-xs"
                        : "bg-white border chat-markdown"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      <>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{cleanContent}</ReactMarkdown>
                        {fields.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {fields.map((f) => (
                              <button
                                key={f}
                                onClick={() =>
                                  sendMessage(
                                    `Please extract the value for: ${FIELD_LABELS[f] ?? f}`
                                  )
                                }
                                disabled={streaming}
                                className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[11px] font-medium text-blue-700 hover:bg-blue-100 transition-colors disabled:opacity-50"
                              >
                                <FileText className="h-3 w-3" />
                                {FIELD_LABELS[f] ?? f}
                              </button>
                            ))}
                            <button
                              onClick={() => sendMessage("Please extract all fields you found.")}
                              disabled={streaming}
                              className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                            >
                              Extract All
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      msg.content
                    )}
                  </div>
                  {msg.role === "user" && (
                    <div className="mt-0.5 p-1 rounded bg-slate-700 shrink-0">
                      <User className="h-3 w-3 text-white" />
                    </div>
                  )}
                </div>
              );
            })}
            {streaming && streamingText && (
              <div className="flex gap-2 justify-start">
                <div className="mt-0.5 p-1 rounded bg-muted shrink-0">
                  <Bot className="h-3 w-3" />
                </div>
                <div className="rounded-md px-2.5 py-1.5 max-w-[85%] bg-white border chat-markdown">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{streamingText}</ReactMarkdown>
                </div>
              </div>
            )}
            {streaming && !streamingText && (
              <div className="flex gap-2 justify-start">
                <div className="mt-0.5 p-1 rounded bg-muted shrink-0">
                  <Bot className="h-3 w-3" />
                </div>
                <div className="rounded-md px-2.5 py-1.5 text-xs bg-white border text-muted-foreground">
                  Thinking...
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>
      </div>

      <div className="p-2 border-t bg-muted/30">
        <div className="flex gap-1.5">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={handleUpload}
            accept=".pdf,.doc,.docx,.txt,.csv,.xlsx"
          />
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => setUploadDialogOpen(true)}
            disabled={streaming}
          >
            <Upload className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={async () => {
              await fetch(`/api/agent/messages?dealId=${dealId}`, { method: "DELETE" });
              mutateMessages([], false);
            }}
            disabled={streaming || messages.length === 0}
            title="Clear chat"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about this deal..."
            onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
            disabled={streaming}
            className="h-7 text-xs"
          />
          <Button
            size="icon"
            className="h-7 w-7 bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || streaming}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <UploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onSelectSample={handleSelectSample}
        onUploadOwn={() => fileInputRef.current?.click()}
        disabled={streaming}
      />
    </div>
  );
}
