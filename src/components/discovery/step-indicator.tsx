"use client";

import { cn } from "~/lib/utils";

interface StepIndicatorProps {
  totalSteps: number;
  currentStep: number;
}

const STEP_LABELS = [
  "Languages",
  "Experience",
  "Interests",
  "Repo Size",
  "Review",
];

export function StepIndicator({ totalSteps, currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-3">
      {Array.from({ length: totalSteps }, (_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="flex flex-col items-center gap-1.5">
            <div
              className={cn(
                "h-2.5 w-2.5 rounded-full transition-all duration-300",
                i === currentStep
                  ? "bg-primary scale-125"
                  : i < currentStep
                    ? "bg-primary/60"
                    : "bg-muted-foreground/25",
              )}
            />
            <span
              className={cn(
                "hidden text-xs transition-colors duration-300 sm:block",
                i === currentStep
                  ? "text-foreground font-medium"
                  : "text-muted-foreground",
              )}
            >
              {STEP_LABELS[i]}
            </span>
          </div>
          {i < totalSteps - 1 && (
            <div
              className={cn(
                "mb-5 hidden h-[2px] w-8 transition-colors duration-300 sm:block",
                i < currentStep ? "bg-primary/60" : "bg-muted-foreground/25",
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}
