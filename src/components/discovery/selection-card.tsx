"use client";

import { Check } from "lucide-react";
import { cn } from "~/lib/utils";

interface SelectionCardProps {
  title: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
}

export function SelectionCard({
  title,
  description,
  selected,
  onSelect,
}: SelectionCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group relative flex w-full flex-col gap-1 rounded-xl border-2 p-5 text-left transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        selected
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-border bg-card hover:border-primary/40 hover:bg-accent/50"
      )}
    >
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "text-base font-semibold transition-colors",
            selected ? "text-primary" : "text-card-foreground"
          )}
        >
          {title}
        </span>
        <div
          className={cn(
            "flex h-5 w-5 items-center justify-center rounded-full transition-all duration-200",
            selected
              ? "bg-primary text-primary-foreground"
              : "border border-muted-foreground/30"
          )}
        >
          {selected && <Check className="h-3 w-3" />}
        </div>
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
    </button>
  );
}
