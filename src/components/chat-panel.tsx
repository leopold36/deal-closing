"use client";

import { useState, useRef, useEffect } from "react";
import { useUser } from "@/lib/user-context";
import useSWR, { mutate } from "swr";
import { ChatMessage } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Upload, Bot, User } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type Props = {
  dealId: string;
};

export function ChatPanel({ dealId }: Props) {
  const { currentUser } = useUser();
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: messages = [], mutate: mutateMessages } = useSWR<
    ChatMessage[]
  >(`/api/agent/messages?dealId=${dealId}`, fetcher);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
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
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("userId", currentUser.id);

    await fetch(`/api/deals/${dealId}/documents`, {
      method: "POST",
      body: formData,
    });

    await sendMessage(
      `I've uploaded a document: "${file.name}". Please extract any relevant deal information from it.`
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b flex items-center gap-2">
        <Bot className="h-4 w-4" />
        <span className="text-sm font-medium">Deal Assistant</span>
      </div>

      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div ref={scrollRef} className="p-4 space-y-4">
            {messages.length === 0 && !streaming && (
              <div className="text-center text-muted-foreground text-sm py-8">
                <Bot className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>
                  Upload a document or ask me to help fill in deal information.
                </p>
              </div>
            )}
            {messages.map((msg) => (
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
                  className={`rounded-lg px-3 py-2 max-w-[80%] text-sm whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  {msg.content}
                </div>
                {msg.role === "user" && (
                  <div className="mt-0.5 p-1 rounded bg-primary shrink-0">
                    <User className="h-3 w-3 text-primary-foreground" />
                  </div>
                )}
              </div>
            ))}
            {streaming && streamingText && (
              <div className="flex gap-2 justify-start">
                <div className="mt-0.5 p-1 rounded bg-muted shrink-0">
                  <Bot className="h-3 w-3" />
                </div>
                <div className="rounded-lg px-3 py-2 max-w-[80%] text-sm bg-muted whitespace-pre-wrap">
                  {streamingText}
                </div>
              </div>
            )}
            {streaming && !streamingText && (
              <div className="flex gap-2 justify-start">
                <div className="mt-0.5 p-1 rounded bg-muted shrink-0">
                  <Bot className="h-3 w-3" />
                </div>
                <div className="rounded-lg px-3 py-2 text-sm bg-muted text-muted-foreground">
                  Thinking...
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      <div className="p-3 border-t">
        <div className="flex gap-2">
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
            onClick={() => fileInputRef.current?.click()}
            disabled={streaming}
          >
            <Upload className="h-4 w-4" />
          </Button>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about this deal..."
            onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
            disabled={streaming}
          />
          <Button
            size="icon"
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || streaming}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
