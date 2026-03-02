"use client";

import * as React from "react";
import { Checkbox as RadixCheckbox } from "radix-ui";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type CheckboxProps = React.ComponentPropsWithoutRef<typeof RadixCheckbox.Root>;

function Checkbox({ className, ...props }: CheckboxProps) {
  return (
    <RadixCheckbox.Root
      className={cn(
        "peer h-4 w-4 shrink-0 rounded-sm border border-slate-700 shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-slate-700 data-[state=checked]:text-white",
        className
      )}
      {...props}
    >
      <RadixCheckbox.Indicator className="flex items-center justify-center text-current">
        <Check className="h-3 w-3" />
      </RadixCheckbox.Indicator>
    </RadixCheckbox.Root>
  );
}

export { Checkbox };
