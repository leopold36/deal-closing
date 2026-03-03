"use client";

import { use, useState } from "react";
import { DealForm } from "@/components/deal-form";
import { ChatPanel } from "@/components/chat-panel";
import { Button } from "@/components/ui/button";
import { Bot, X } from "lucide-react";

export default function DealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div className="flex h-[calc(100vh-2.5rem)]">
      <div className="flex-1 overflow-y-auto p-4 transition-all duration-300 relative">
        {!chatOpen && (
          <Button
            variant="outline"
            size="sm"
            className="absolute top-4 right-4 h-7 text-[11px] gap-1.5 z-10"
            onClick={() => setChatOpen(true)}
          >
            <Bot className="h-3.5 w-3.5" />
            Deal Assistant
          </Button>
        )}
        <DealForm dealId={id} />
      </div>
      <div
        className={`flex flex-col bg-muted/20 border-l transition-all duration-300 overflow-hidden ${
          chatOpen ? "w-[340px]" : "w-0 border-l-0"
        }`}
      >
        <div className="flex items-center justify-between p-2 border-b bg-muted/30 shrink-0">
          <div className="flex items-center gap-2">
            <Bot className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">Deal Assistant</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={() => setChatOpen(false)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
        <div className="flex-1 min-w-[340px] min-h-0 overflow-hidden">
          <ChatPanel dealId={id} />
        </div>
      </div>
    </div>
  );
}
