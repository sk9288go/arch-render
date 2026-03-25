"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import {
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Layers,
  MousePointer,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { cn, generateId } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  SegmentMask,
  SegmentLabel,
  AppState,
  SEGMENT_COLORS,
} from "@/lib/types";

interface SegmentStepProps {
  uploadedImage: AppState["uploadedImage"];
  segments: SegmentMask[];
  selectedSegmentId: string | null;
  isSegmenting: boolean;
  onAddSegment: (segment: SegmentMask) => void;
  onUpdateSegment: (id: string, updates: Partial<SegmentMask>) => void;
  onRemoveSegment: (id: string) => void;
  onSelectSegment: (id: string | null) => void;
  onNext: () => void;
  onBack: () => void;
}

const LABEL_OPTIONS: SegmentLabel[] = [
  "Building",
  "Windows",
  "Landscape",
  "Sky",
  "Road",
  "Background",
  "Custom",
];

export function SegmentStep({
  uploadedImage,
  segments,
  selectedSegmentId,
  onAddSegment,
  onUpdateSegment,
  onRemoveSegment,
  onSelectSegment,
  onNext,
  onBack,
}: SegmentStepProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });
  const [isClickLoading, setIsClickLoading] = useState(false);
  const [hoverPoint, setHoverPoint] = useState<{ x: number; y: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMock, setIsMock] = useState(false);

  // Compute canvas display size keeping aspect ratio
  useEffect(() => {
    if (!uploadedImage || !containerRef.current) return;
    const container = containerRef.current;
    const ro = new ResizeObserver(() => {
      const { clientWidth, clientHeight } = container;
      const ar = uploadedImage.width / uploadedImage.height;
      let w = clientWidth;
      let h = w / ar;
      if (h > clientHeight) {
        h = clientHeight;
        w = h * ar;
      }
      setCanvasSize({ w: Math.floor(w), h: Math.floor(h) });
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, [uploadedImage]);

  // Draw image + segment overlays onto canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !uploadedImage || canvasSize.w === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvasSize.w;
    canvas.height = canvasSize.h;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (imageRef.current) {
        ctx.drawImage(imageRef.current, 0, 0, canvas.width, canvas.height);
      }
      // Draw segment overlays
      segments.forEach((seg) => {
        if (!seg.visible) return;
        const isSelected = seg.id === selectedSegmentId;
        const color = SEGMENT_COLORS[seg.label] ?? "#6366f1";

        // Draw click point circle
        const px = seg.clickPoint.x * canvas.width;
        const py = seg.clickPoint.y * canvas.height;
        ctx.beginPath();
        ctx.arc(px, py, isSelected ? 10 : 7, 0, Math.PI * 2);
        ctx.fillStyle = color + (isSelected ? "cc" : "88");
        ctx.fill();
        ctx.lineWidth = isSelected ? 2 : 1.5;
        ctx.strokeStyle = color;
        ctx.stroke();

        // Small label tag
        ctx.font = "bold 11px Inter, sans-serif";
        ctx.fillStyle = color;
        const labelText = seg.label;
        const tw = ctx.measureText(labelText).width;
        ctx.fillStyle = "rgba(10,12,18,0.75)";
        ctx.beginPath();
        ctx.roundRect(px + 12, py - 10, tw + 10, 18, 4);
        ctx.fill();
        ctx.fillStyle = color;
        ctx.fillText(labelText, px + 17, py + 3);
      });

      // Hover crosshair
      if (hoverPoint) {
        ctx.strokeStyle = "rgba(255,255,255,0.6)";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(hoverPoint.x, 0);
        ctx.lineTo(hoverPoint.x, canvas.height);
        ctx.moveTo(0, hoverPoint.y);
        ctx.lineTo(canvas.width, hoverPoint.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    };

    if (!imageRef.current || imageRef.current.src !== uploadedImage.url) {
      const img = new Image();
      img.src = uploadedImage.url;
      img.onload = () => {
        imageRef.current = img;
        draw();
      };
    } else {
      draw();
    }
  }, [segments, selectedSegmentId, canvasSize, uploadedImage, hoverPoint]);

  const getRelativePoint = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top) / rect.height,
      };
    },
    []
  );

  const handleCanvasClick = useCallback(
    async (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!uploadedImage || isClickLoading) return;
      const point = getRelativePoint(e);
      if (!point) return;

      setIsClickLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/segment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: uploadedImage.base64,
            point: {
              x: Math.round(point.x * uploadedImage.width),
              y: Math.round(point.y * uploadedImage.height),
            },
            label: 1,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error ?? "Segmentation failed");
        }

        setIsMock(data.isMock ?? false);

        const best = data.masks?.[0];
        if (!best) throw new Error("No mask returned");

        const newSeg: SegmentMask = {
          id: generateId(),
          label: "Building",
          color: SEGMENT_COLORS["Building"],
          maskData: best.maskData,
          clickPoint: point,
          prompt: "",
          negativePrompt: "",
          visible: true,
          locked: false,
          score: best.score,
        };
        onAddSegment(newSeg);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Segmentation failed");
      } finally {
        setIsClickLoading(false);
      }
    },
    [uploadedImage, isClickLoading, getRelativePoint, onAddSegment]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      setHoverPoint({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    },
    []
  );

  if (!uploadedImage) return null;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-5 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Segment Regions</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Click on the image to define architectural zones
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isMock && (
            <Badge variant="outline" className="text-amber-500 border-amber-500/30 text-xs">
              Demo Mode
            </Badge>
          )}
          <Badge variant="outline" className="text-xs">
            {segments.length} segment{segments.length !== 1 ? "s" : ""}
          </Badge>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Canvas area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Instruction bar */}
          <div className="px-4 py-2 border-b border-border bg-muted/20 flex items-center gap-2">
            {isClickLoading ? (
              <>
                <div className="h-3.5 w-3.5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                <span className="text-xs text-muted-foreground">Segmenting region...</span>
              </>
            ) : (
              <>
                <MousePointer className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  Click on any region to add a segment
                </span>
              </>
            )}
          </div>

          {/* Canvas */}
          <div
            ref={containerRef}
            className="flex-1 flex items-center justify-center p-4 overflow-hidden bg-muted/10 canvas-grid"
          >
            <canvas
              ref={canvasRef}
              width={canvasSize.w}
              height={canvasSize.h}
              onClick={handleCanvasClick}
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setHoverPoint(null)}
              className={cn(
                "rounded-lg border border-border shadow-lg transition-all",
                isClickLoading
                  ? "cursor-wait opacity-80"
                  : "cursor-crosshair hover:shadow-xl"
              )}
              style={{ width: canvasSize.w, height: canvasSize.h }}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="mx-4 mb-2 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2">
              <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}
        </div>

        {/* Segments panel */}
        <div className="w-64 flex flex-col border-l border-border bg-card/50">
          <div className="px-3 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Segments</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {segments.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 px-4 text-center">
                <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center">
                  <MousePointer className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground">
                  Click regions on the image to segment them
                </p>
              </div>
            ) : (
              <div className="p-2 space-y-1.5">
                {segments.map((seg) => {
                  const color = SEGMENT_COLORS[seg.label] ?? "#6366f1";
                  const isSelected = seg.id === selectedSegmentId;
                  return (
                    <div
                      key={seg.id}
                      onClick={() => onSelectSegment(isSelected ? null : seg.id)}
                      className={cn(
                        "group rounded-lg border p-2.5 cursor-pointer transition-all",
                        isSelected
                          ? "border-primary/50 bg-primary/5"
                          : "border-border bg-card hover:border-border/80 hover:bg-accent/30"
                      )}
                    >
                      {/* Top row */}
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className="h-3 w-3 rounded-full shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        <select
                          value={seg.label}
                          onChange={(e) =>
                            onUpdateSegment(seg.id, {
                              label: e.target.value as SegmentLabel,
                              color: SEGMENT_COLORS[e.target.value as SegmentLabel],
                            })
                          }
                          onClick={(e) => e.stopPropagation()}
                          className="flex-1 text-xs bg-transparent text-foreground border-none outline-none cursor-pointer"
                        >
                          {LABEL_OPTIONS.map((l) => (
                            <option key={l} value={l} className="bg-card text-foreground">
                              {l}
                            </option>
                          ))}
                        </select>
                        {seg.score !== undefined && (
                          <span className="text-xs text-muted-foreground">
                            {Math.round(seg.score * 100)}%
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpdateSegment(seg.id, { visible: !seg.visible });
                          }}
                          className={cn(
                            "flex h-6 w-6 items-center justify-center rounded transition-colors",
                            "hover:bg-accent text-muted-foreground hover:text-foreground"
                          )}
                          title={seg.visible ? "Hide" : "Show"}
                        >
                          {seg.visible ? (
                            <Eye className="h-3 w-3" />
                          ) : (
                            <EyeOff className="h-3 w-3" />
                          )}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpdateSegment(seg.id, { locked: !seg.locked });
                          }}
                          className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-accent text-muted-foreground hover:text-foreground"
                          title={seg.locked ? "Unlock" : "Lock"}
                        >
                          {seg.locked ? (
                            <Lock className="h-3 w-3" />
                          ) : (
                            <Unlock className="h-3 w-3" />
                          )}
                        </button>
                        <div className="flex-1" />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveSegment(seg.id);
                          }}
                          className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-destructive/20 text-muted-foreground hover:text-destructive"
                          title="Remove"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Hint */}
          {segments.length > 0 && (
            <div className="px-3 py-2 border-t border-border">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CheckCircle2 className="h-3 w-3 text-primary" />
                <span>Assign labels before proceeding</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer nav */}
      <div className="px-6 py-4 border-t border-border flex items-center justify-between gap-3">
        <Button variant="outline" size="sm" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div className="flex-1" />
        <Button
          onClick={onNext}
          disabled={segments.length === 0}
          className="gap-2"
        >
          Continue to Prompt
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
