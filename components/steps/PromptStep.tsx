"use client";

import { useState } from "react";
import {
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Layers,
  Settings2,
  Sparkles,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  SegmentMask,
  GenerationSettings,
  AppState,
  SEGMENT_COLORS,
  STYLE_PRESETS,
} from "@/lib/types";

interface PromptStepProps {
  uploadedImage: AppState["uploadedImage"];
  segments: SegmentMask[];
  selectedSegmentId: string | null;
  generationSettings: GenerationSettings;
  onSelectSegment: (id: string | null) => void;
  onUpdateSegment: (id: string, updates: Partial<SegmentMask>) => void;
  onUpdateSettings: (updates: Partial<GenerationSettings>) => void;
  advancedMode: boolean;
  onNext: () => void;
  onBack: () => void;
}

export function PromptStep({
  uploadedImage,
  segments,
  selectedSegmentId,
  generationSettings,
  onSelectSegment,
  onUpdateSegment,
  onUpdateSettings,
  advancedMode,
  onNext,
  onBack,
}: PromptStepProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>("global");

  const toggleSection = (id: string) =>
    setExpandedSection((prev) => (prev === id ? null : id));

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-5 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground">Configure Prompts</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Set per-segment prompts and global generation settings
        </p>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: main settings */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Style Presets */}
          <CollapsibleSection
            id="presets"
            title="Style Preset"
            icon={<Sparkles className="h-4 w-4" />}
            expanded={expandedSection === "presets"}
            onToggle={() => toggleSection("presets")}
          >
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {[{ id: null, name: "None", globalPrompt: "", negativePrompt: "" }, ...STYLE_PRESETS].map((preset) => {
                const isSelected = generationSettings.stylePreset === preset.id;
                return (
                  <button
                    key={preset.id ?? "none"}
                    onClick={() => {
                      onUpdateSettings({
                        stylePreset: preset.id,
                        globalPrompt: preset.globalPrompt || generationSettings.globalPrompt,
                        negativePrompt: preset.negativePrompt || generationSettings.negativePrompt,
                      });
                    }}
                    className={cn(
                      "rounded-lg border px-3 py-2.5 text-left transition-all",
                      isSelected
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card hover:border-primary/40 hover:bg-accent/30 text-foreground"
                    )}
                  >
                    <div className="text-xs font-medium">{preset.name}</div>
                    {preset.id && (
                      <div className="text-xs text-muted-foreground mt-0.5 truncate">
                        {preset.globalPrompt.slice(0, 40)}...
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </CollapsibleSection>

          {/* Global Prompt */}
          <CollapsibleSection
            id="global"
            title="Global Prompt"
            icon={<Settings2 className="h-4 w-4" />}
            expanded={expandedSection === "global"}
            onToggle={() => toggleSection("global")}
          >
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Positive Prompt</Label>
                <textarea
                  value={generationSettings.globalPrompt}
                  onChange={(e) =>
                    onUpdateSettings({ globalPrompt: e.target.value })
                  }
                  rows={3}
                  placeholder="architectural visualization, photorealistic..."
                  className="w-full rounded-lg border border-input bg-muted/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Negative Prompt</Label>
                <textarea
                  value={generationSettings.negativePrompt}
                  onChange={(e) =>
                    onUpdateSettings({ negativePrompt: e.target.value })
                  }
                  rows={2}
                  placeholder="cartoon, anime, low quality..."
                  className="w-full rounded-lg border border-input bg-muted/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>
          </CollapsibleSection>

          {/* Per-segment prompts */}
          {segments.length > 0 && (
            <CollapsibleSection
              id="segments"
              title="Per-Segment Prompts"
              icon={<Layers className="h-4 w-4" />}
              expanded={expandedSection === "segments"}
              onToggle={() => toggleSection("segments")}
              badge={`${segments.length}`}
            >
              <div className="space-y-3">
                {segments.map((seg) => {
                  const color = SEGMENT_COLORS[seg.label] ?? "#6366f1";
                  const isSelected = seg.id === selectedSegmentId;
                  return (
                    <div
                      key={seg.id}
                      className={cn(
                        "rounded-lg border p-3 transition-all",
                        isSelected ? "border-primary/50 bg-primary/5" : "border-border"
                      )}
                      onClick={() => onSelectSegment(isSelected ? null : seg.id)}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-sm font-medium text-foreground">{seg.label}</span>
                        <Badge variant="outline" className="text-xs ml-auto">
                          Region
                        </Badge>
                      </div>
                      <textarea
                        value={seg.prompt}
                        onChange={(e) =>
                          onUpdateSegment(seg.id, { prompt: e.target.value })
                        }
                        onClick={(e) => e.stopPropagation()}
                        rows={2}
                        placeholder={`Describe the ${seg.label.toLowerCase()}...`}
                        className="w-full rounded border border-input bg-muted/20 px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    </div>
                  );
                })}
              </div>
            </CollapsibleSection>
          )}

          {/* ControlNet */}
          <CollapsibleSection
            id="controlnet"
            title="ControlNet"
            icon={<Settings2 className="h-4 w-4" />}
            expanded={expandedSection === "controlnet"}
            onToggle={() => toggleSection("controlnet")}
          >
            <div className="space-y-4">
              {/* Depth */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="depth-switch"
                      checked={generationSettings.controlNet.depthEnabled}
                      onCheckedChange={(v) =>
                        onUpdateSettings({
                          controlNet: {
                            ...generationSettings.controlNet,
                            depthEnabled: v,
                          },
                        })
                      }
                    />
                    <Label htmlFor="depth-switch" className="text-sm cursor-pointer">
                      Depth Map
                    </Label>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {Math.round(generationSettings.controlNet.depthStrength * 100)}%
                  </span>
                </div>
                {generationSettings.controlNet.depthEnabled && (
                  <Slider
                    value={[generationSettings.controlNet.depthStrength]}
                    onValueChange={([v]) =>
                      onUpdateSettings({
                        controlNet: {
                          ...generationSettings.controlNet,
                          depthStrength: v,
                        },
                      })
                    }
                    min={0}
                    max={1}
                    step={0.05}
                    className="w-full"
                  />
                )}
              </div>

              <Separator />

              {/* Lineart */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="lineart-switch"
                      checked={generationSettings.controlNet.lineartEnabled}
                      onCheckedChange={(v) =>
                        onUpdateSettings({
                          controlNet: {
                            ...generationSettings.controlNet,
                            lineartEnabled: v,
                          },
                        })
                      }
                    />
                    <Label htmlFor="lineart-switch" className="text-sm cursor-pointer">
                      Line Art
                    </Label>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {Math.round(generationSettings.controlNet.lineartStrength * 100)}%
                  </span>
                </div>
                {generationSettings.controlNet.lineartEnabled && (
                  <Slider
                    value={[generationSettings.controlNet.lineartStrength]}
                    onValueChange={([v]) =>
                      onUpdateSettings({
                        controlNet: {
                          ...generationSettings.controlNet,
                          lineartStrength: v,
                        },
                      })
                    }
                    min={0}
                    max={1}
                    step={0.05}
                    className="w-full"
                  />
                )}
              </div>
            </div>
          </CollapsibleSection>

          {/* Advanced settings */}
          {advancedMode && (
            <CollapsibleSection
              id="advanced"
              title="Advanced Settings"
              icon={<Settings2 className="h-4 w-4" />}
              expanded={expandedSection === "advanced"}
              onToggle={() => toggleSection("advanced")}
            >
              <div className="space-y-4">
                <SliderField
                  label="Steps"
                  value={generationSettings.steps}
                  min={10}
                  max={50}
                  step={1}
                  onChange={(v) => onUpdateSettings({ steps: v })}
                />
                <SliderField
                  label="Guidance Scale"
                  value={generationSettings.guidanceScale}
                  min={1}
                  max={20}
                  step={0.5}
                  onChange={(v) => onUpdateSettings({ guidanceScale: v })}
                  decimals={1}
                />
                <SliderField
                  label="Strength"
                  value={generationSettings.strength}
                  min={0.1}
                  max={1}
                  step={0.05}
                  onChange={(v) => onUpdateSettings({ strength: v })}
                  decimals={2}
                />
                <SliderField
                  label="Variations"
                  value={generationSettings.numVariations}
                  min={1}
                  max={4}
                  step={1}
                  onChange={(v) => onUpdateSettings({ numVariations: v })}
                />
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Seed (blank = random)</Label>
                  <input
                    type="number"
                    value={generationSettings.seed ?? ""}
                    onChange={(e) =>
                      onUpdateSettings({
                        seed: e.target.value ? parseInt(e.target.value) : null,
                      })
                    }
                    placeholder="Random"
                    className="w-full rounded-lg border border-input bg-muted/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              </div>
            </CollapsibleSection>
          )}
        </div>

        {/* Right panel: image preview with segments highlighted */}
        <div className="w-56 flex flex-col border-l border-border bg-card/50">
          <div className="px-3 py-3 border-b border-border">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Preview
            </span>
          </div>
          <div className="flex-1 p-2 flex items-start">
            {uploadedImage && (
              <div className="w-full space-y-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={uploadedImage.url}
                  alt="Model"
                  className="w-full rounded-md border border-border object-contain"
                />
                <div className="space-y-1">
                  {segments.map((seg) => {
                    const color = SEGMENT_COLORS[seg.label] ?? "#6366f1";
                    return (
                      <button
                        key={seg.id}
                        onClick={() =>
                          onSelectSegment(
                            seg.id === selectedSegmentId ? null : seg.id
                          )
                        }
                        className={cn(
                          "w-full flex items-center gap-2 rounded px-2 py-1 text-left text-xs transition-colors",
                          seg.id === selectedSegmentId
                            ? "bg-primary/10 text-primary"
                            : "hover:bg-accent/40 text-muted-foreground"
                        )}
                      >
                        <div
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        <span className="truncate">{seg.label}</span>
                        {seg.prompt && (
                          <Info className="h-3 w-3 ml-auto shrink-0 text-primary" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer nav */}
      <div className="px-6 py-4 border-t border-border flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div className="flex-1" />
        <Button onClick={onNext} className="gap-2">
          Continue to Generate
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

/* ---- Helpers ---- */

interface CollapsibleSectionProps {
  id: string;
  title: string;
  icon: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  badge?: string;
}

function CollapsibleSection({
  title,
  icon,
  expanded,
  onToggle,
  children,
  badge,
}: CollapsibleSectionProps) {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-accent/20 transition-colors"
      >
        <span className="text-muted-foreground">{icon}</span>
        <span className="text-sm font-medium text-foreground flex-1">{title}</span>
        {badge && (
          <Badge variant="outline" className="text-xs mr-2">
            {badge}
          </Badge>
        )}
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-border/60">
          {children}
        </div>
      )}
    </div>
  );
}

interface SliderFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  decimals?: number;
}

function SliderField({
  label,
  value,
  min,
  max,
  step,
  onChange,
  decimals = 0,
}: SliderFieldProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <span className="text-xs font-mono text-foreground">
          {decimals > 0 ? value.toFixed(decimals) : value}
        </span>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={min}
        max={max}
        step={step}
        className="w-full"
      />
    </div>
  );
}
