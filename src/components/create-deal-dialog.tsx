"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/user-context";
import { DEMO_DEALS } from "@/lib/demo-deals";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, FlaskConical, Loader2 } from "lucide-react";
import { mutate } from "swr";

export function CreateDealDialog() {
  const [open, setOpen] = useState(false);
  const [customName, setCustomName] = useState("");
  const [selectedDemo, setSelectedDemo] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const { currentUser } = useUser();
  const router = useRouter();

  const createDeal = async (name: string, demoData?: Record<string, string>) => {
    if (!name.trim() || !currentUser || creating) return;
    setCreating(true);

    const res = await fetch("/api/deals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), userId: currentUser.id }),
    });
    const deal = await res.json();

    if (demoData) {
      for (const [field, value] of Object.entries(demoData)) {
        await fetch(`/api/deals/${deal.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            field,
            value: value || null,
            userId: currentUser.id,
            source: "manual",
          }),
        });
      }
    }

    setCustomName("");
    setSelectedDemo(null);
    setCreating(false);
    setOpen(false);
    mutate("/api/deals");
    router.push(`/deals/${deal.id}`);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold">
          <Plus className="h-3 w-3 mr-1.5" />
          New Deal
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Deal</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <FlaskConical className="h-3 w-3" />
              Demo deals (pre-filled with sample data)
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_DEALS.map((demo, idx) => (
                <button
                  key={demo.name}
                  onClick={() => { setSelectedDemo(idx); setCustomName(""); }}
                  disabled={creating}
                  className={`text-left rounded-md border px-3 py-2 text-xs transition-colors disabled:opacity-50 ${
                    selectedDemo === idx
                      ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500"
                      : "hover:bg-muted/50 hover:border-primary/30"
                  }`}
                >
                  <span className="font-medium">{demo.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-background px-2 text-muted-foreground">or enter your own</span>
            </div>
          </div>
          <div className="space-y-2">
            <Input
              value={customName}
              onChange={(e) => { setCustomName(e.target.value); setSelectedDemo(null); }}
              placeholder="e.g., Acme Corp Acquisition"
              onKeyDown={(e) => {
                if (e.key === "Enter" && customName.trim()) createDeal(customName);
              }}
              disabled={creating}
              className="text-xs"
            />
            <Button
              onClick={() => {
                if (selectedDemo !== null) {
                  const demo = DEMO_DEALS[selectedDemo];
                  createDeal(demo.name, demo.data);
                } else {
                  createDeal(customName);
                }
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              disabled={(!customName.trim() && selectedDemo === null) || creating}
            >
              {creating && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              {creating ? "Creating..." : "Create Deal"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
