"use client";

import { use } from "react";
import { DealForm } from "@/components/deal-form";
import { ChatPanel } from "@/components/chat-panel";

export default function DealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      <div className="flex-[2] overflow-y-auto p-6 border-r">
        <DealForm dealId={id} />
      </div>
      <div className="flex-1 flex flex-col">
        <ChatPanel dealId={id} />
      </div>
    </div>
  );
}
