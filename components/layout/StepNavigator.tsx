"use client";

import { Upload, Layers, Type, Sparkles, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { AppStep } from "@/lib/types";

interface StepConfig {
  id: AppStep;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const STEPS: StepConfig[] = [
  {
    id: "upload",
    label: "Upload",
    description: "Import model image",
    icon: Upload,
  },
  {
    id: "segment",
    label: "Segment",
    description: "Define regions",
    icon: Layers,
  },
  {
    id: "prompt",
    label: "Prompt",
    description: "Configure generation",
    icon: Type,
  },
  {
    id: "generate",
    label: "Generate",
    description: "Create renders",
    icon: Sparkles,
  },
];

interface StepNavigatorProps {
  currentStep: AppStep;
  completedSteps: Set<AppStep>;
  onStepClick: (step: AppStep) => void;
}

export function StepNavigator({
  currentStep,
  completedSteps,
  onStepClick,
}: StepNavigatorProps) {
  const stepOrder: AppStep[] = ["upload", "segment", "prompt", "generate"];

  const isAccessible = (step: AppStep) => {
    const idx = stepOrder.indexOf(step);
    const currentIdx = stepOrder.indexOf(currentStep);
    return idx <= currentIdx || completedSteps.has(step);
  };

  return (
    <nav className="flex flex-col gap-1 px-3 py-4">
      {STEPS.map((step) => {
        const Icon = step.icon;
        const isCurrent = currentStep === step.id;
        const isCompleted = completedSteps.has(step.id);
        const accessible = isAccessible(step.id);

        return (
          <button
            key={step.id}
            onClick={() => accessible && onStepClick(step.id)}
            disabled={!accessible}
            className={cn(
              "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all duration-200",
              isCurrent
                ? "bg-primary/15 text-primary"
                : isCompleted
                ? "hover:bg-accent text-foreground cursor-pointer"
                : accessible
                ? "hover:bg-accent text-muted-foreground hover:text-foreground cursor-pointer"
                : "text-muted-foreground/40 cursor-not-allowed opacity-50"
            )}
          >
            {/* Step number / icon */}
            <div
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200",
                isCurrent
                  ? "border-primary bg-primary/10 text-primary"
                  : isCompleted
                  ? "border-primary/50 bg-primary/5 text-primary"
                  : "border-border bg-muted/50 text-muted-foreground"
              )}
            >
              {isCompleted && !isCurrent ? (
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                <Icon className="h-4 w-4" />
              )}
            </div>

            {/* Label */}
            <div className="flex-1 min-w-0">
              <div
                className={cn(
                  "text-sm font-medium",
                  isCurrent ? "text-primary" : ""
                )}
              >
                {step.label}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {step.description}
              </div>
            </div>

            {/* Arrow for current */}
            {isCurrent && (
              <ChevronRight className="h-4 w-4 text-primary shrink-0" />
            )}

            {/* Active indicator line */}
            {isCurrent && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-primary rounded-r-full" />
            )}
          </button>
        );
      })}
    </nav>
  );
}
