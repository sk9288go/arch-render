"use client";

import { useState } from "react";
import { Settings, ChevronLeft, ChevronRight, Cpu } from "lucide-react";
import { cn } from "@/lib/utils";
import { AppStep } from "@/lib/types";
import { StepNavigator } from "./StepNavigator";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface SidebarProps {
  currentStep: AppStep;
  completedSteps: Set<AppStep>;
  onStepClick: (step: AppStep) => void;
  advancedMode: boolean;
  onAdvancedModeToggle: (val: boolean) => void;
  isMockMode: boolean;
}

export function Sidebar({
  currentStep,
  completedSteps,
  onStepClick,
  advancedMode,
  onAdvancedModeToggle,
  isMockMode,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "relative flex flex-col border-r border-border bg-card transition-all duration-300 ease-in-out",
        collapsed ? "w-14" : "w-56"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-4 border-b border-border">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
              <Cpu className="h-4 w-4 text-primary" />
            </div>
            <div>
              <span className="text-sm font-bold tracking-tight text-foreground">
                ArchRender
              </span>
              <div className="text-xs text-muted-foreground">v1.0</div>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 mx-auto">
            <Cpu className="h-4 w-4 text-primary" />
          </div>
        )}
      </div>

      {/* Collapse button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-16 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card shadow-md hover:bg-accent transition-colors"
      >
        {collapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </button>

      {/* Navigation */}
      {!collapsed && (
        <>
          <div className="flex-1 overflow-y-auto">
            <StepNavigator
              currentStep={currentStep}
              completedSteps={completedSteps}
              onStepClick={onStepClick}
            />
          </div>

          <div className="mt-auto">
            <Separator />
            <div className="px-3 py-4 space-y-3">
              {/* Mock mode indicator */}
              {isMockMode && (
                <div className="flex items-center gap-2 rounded-md bg-amber-500/10 border border-amber-500/20 px-2 py-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-xs text-amber-500 font-medium">
                    Demo Mode
                  </span>
                </div>
              )}

              {/* Advanced settings toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                  <Label className="text-xs text-muted-foreground cursor-pointer">
                    Advanced
                  </Label>
                </div>
                <Switch
                  checked={advancedMode}
                  onCheckedChange={onAdvancedModeToggle}
                  className="scale-75"
                />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Collapsed state - vertical step indicators */}
      {collapsed && (
        <div className="flex flex-col items-center gap-3 py-4 flex-1">
          {(["upload", "segment", "prompt", "generate"] as AppStep[]).map(
            (step, i) => (
              <button
                key={step}
                onClick={() => onStepClick(step)}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-all",
                  currentStep === step
                    ? "bg-primary text-primary-foreground"
                    : completedSteps.has(step)
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {i + 1}
              </button>
            )
          )}
        </div>
      )}
    </aside>
  );
}
