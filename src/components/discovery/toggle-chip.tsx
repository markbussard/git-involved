"use client";

import { cn } from "~/lib/utils";

interface ToggleChipProps {
  label: string;
  selected: boolean;
  onToggle: () => void;
}

export function ToggleChip({ label, selected, onToggle }: ToggleChipProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200",
        "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
        selected
          ? "border-primary bg-primary text-primary-foreground shadow-sm"
          : "border-border bg-secondary text-secondary-foreground hover:bg-secondary/80",
      )}
    >
      {label}
    </button>
  );
}
