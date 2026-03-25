"use client";

import { useState, useCallback } from "react";
import {
  Sparkles,
  ArrowLeft,
  Download,
  RefreshCw,
  Check,
  AlertCircle,
  ImageIcon,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { cn, downloadImage } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  GeneratedImage,
  GenerationSettings,
  AppState,
} from "@/lib/types";

interface GenerateStepProps {
  uploadedImage: AppState["uploadedImage"];
  depthMapUrl: string | null;
  lineartUrl: string | null;
  generationSettings: GenerationSettings;
  generatedImages: GeneratedImage[];
  selectedGeneratedId: string | null;
  onSetDepthMapUrl: (url: string | null) => void;
  onSetLineartUrl: (url: string | null) => void;
  onAddGeneratedImage: (image: GeneratedImage) => void;
  onSelectGenerated: (id: string | null) => void;
  onSetIsRendering: (v: boolean) => void;
  onSetIsGeneratingDepth: (v: boolean) => void;
  onSetError: (e: string | null) => void;
  onBack: () => void;
}

type Phase = "idle" | "depth" | "render" | "done" | "error";

/**
 * Resize a data URL (or any img src) to at most maxPx on the longest side,
 * encoding as JPEG at 0.82 quality. Returns a data URL.
 * This keeps the JSON body well under Vercel's 4.5 MB limit.
 */
function compressToDataUrl(src: string, maxPx = 512): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const ratio = Math.min(maxPx / img.width, maxPx / img.height, 1);
      const w = Math.round(img.width * ratio);
      const h = Math.round(img.height * ratio);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas 2D context unavailable")); return; }
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => reject(new Error("Failed to load image for compression"));
    img.src = src;
  });
}

export function GenerateStep({
  uploadedImage,
  depthMapUrl,
  lineartUrl,
  generationSettings,
  generatedImages,
  selectedGeneratedId,
  onSetDepthMapUrl,
  onSetLineartUrl,
  onAddGeneratedImage,
  onSelectGenerated,
  onSetIsRendering,
  onSetIsGeneratingDepth,
  onSetError,
  onBack,
}: GenerateStepProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [isMock, setIsMock] = useState(false);
  const [error, setLocalError] = useState<string | null>(null);

  const selectedImage =
    generatedImages.find((img) => img.id === selectedGeneratedId) ??
    generatedImages[generatedImages.length - 1] ??
    null;

  const handleGenerate = useCallback(async () => {
    if (!uploadedImage) return;
    setLocalError(null);
    onSetError(null);
    setProgress(0);

    try {
      // Compress the image to max 512px before sending to APIs.
      // This keeps the JSON body well under Vercel's 4.5 MB body limit,
      // and Replicate accepts data URLs directly — no need to strip the prefix.
      const compressedImageUrl = await compressToDataUrl(
        uploadedImage.url,
        512
      );

      let dUrl = depthMapUrl;
      let lUrl = lineartUrl;

      // Step 1: depth / lineart (if not already computed)
      if (!dUrl || !lUrl) {
        setPhase("depth");
        onSetIsGeneratingDepth(true);
        setStatusText("Generating depth map & line art...");
        setProgress(10);

        const depthRes = await fetch("/api/depth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrl: compressedImageUrl }),
        });
        const depthData = await depthRes.json();
        if (!depthRes.ok || !depthData.success) {
          throw new Error(depthData.error ?? "Depth generation failed");
        }
        dUrl = depthData.depthUrl;
        lUrl = depthData.lineartUrl;
        onSetDepthMapUrl(dUrl);
        onSetLineartUrl(lUrl);
        setIsMock(depthData.isMock ?? false);
        onSetIsGeneratingDepth(false);
        setProgress(30);
      }

      // Step 2: render
      setPhase("render");
      onSetIsRendering(true);
      setStatusText("Generating architectural renders...");

      // Animate progress from 30 -> 90 over the render time
      const tick = setInterval(() => {
        setProgress((p) => Math.min(p + 2, 88));
      }, 800);

      const renderRes = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Send imageUrl (compressed data URL) — Replicate accepts data URLs directly.
          // This avoids large base64 payloads hitting Vercel's 4.5 MB body limit.
          imageUrl: compressedImageUrl,
          depthUrl: dUrl,
          lineartUrl: lUrl,
          prompt: generationSettings.globalPrompt,
          negativePrompt: generationSettings.negativePrompt,
          steps: generationSettings.steps,
          guidanceScale: generationSettings.guidanceScale,
          strength: generationSettings.strength,
          seed: generationSettings.seed,
          numVariations: generationSettings.numVariations,
          controlNet: generationSettings.controlNet,
        }),
      });

      clearInterval(tick);
      const renderData = await renderRes.json();
      if (!renderRes.ok || !renderData.success) {
        throw new Error(renderData.error ?? "Render failed");
      }

      setIsMock(renderData.isMock ?? false);
      const images: GeneratedImage[] = renderData.images ?? [];
      images.forEach((img) => onAddGeneratedImage(img));
      if (images.length > 0) onSelectGenerated(images[0].id);

      setProgress(100);
      setPhase("done");
      setStatusText(`Generated ${images.length} render${images.length !== 1 ? "s" : ""}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Generation failed";
      setLocalError(msg);
      onSetError(msg);
      setPhase("error");
      setStatusText("Generation failed");
    } finally {
      onSetIsRendering(false);
      onSetIsGeneratingDepth(false);
    }
  }, [
    uploadedImage,
    depthMapUrl,
    lineartUrl,
    generationSettings,
    onSetDepthMapUrl,
    onSetLineartUrl,
    onAddGeneratedImage,
    onSelectGenerated,
    onSetIsRendering,
    onSetIsGeneratingDepth,
    onSetError,
  ]);

  const isRunning = phase === "depth" || phase === "render";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-5 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Generate</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Create AI architectural renders from your model
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isMock && (
            <Badge variant="outline" className="text-amber-500 border-amber-500/30 text-xs">
              Demo Mode
            </Badge>
          )}
          {generatedImages.length > 0 && (
            <Badge variant="outline" className="text-xs">
              {generatedImages.length} render{generatedImages.length !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Main canvas / preview */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Generate bar */}
          <div className="px-6 py-4 border-b border-border bg-muted/10">
            <div className="flex items-center gap-3">
              <Button
                onClick={handleGenerate}
                disabled={isRunning || !uploadedImage}
                size="lg"
                className="gap-2 min-w-[160px]"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {phase === "depth" ? "Analysing..." : "Rendering..."}
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    {generatedImages.length > 0 ? "Re-generate" : "Generate"}
                  </>
                )}
              </Button>

              {generatedImages.length > 0 && !isRunning && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerate}
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  New Variation
                </Button>
              )}

              {statusText && (
                <div className="flex items-center gap-2 ml-2">
                  {phase === "done" && (
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                  )}
                  {phase === "error" && (
                    <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                  )}
                  <span
                    className={cn(
                      "text-sm",
                      phase === "done"
                        ? "text-green-500"
                        : phase === "error"
                        ? "text-destructive"
                        : "text-muted-foreground"
                    )}
                  >
                    {statusText}
                  </span>
                </div>
              )}
            </div>

            {/* Progress */}
            {isRunning && (
              <div className="mt-3 space-y-1">
                <Progress value={progress} className="h-1.5" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{phase === "depth" ? "Step 1/2: Depth map" : "Step 2/2: Rendering"}</span>
                  <span>{progress}%</span>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2">
                <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
          </div>

          {/* Main image area */}
          <div className="flex-1 flex items-center justify-center p-6 overflow-hidden bg-muted/10 canvas-grid">
            {selectedImage ? (
              <div className="relative max-w-full max-h-full group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedImage.url}
                  alt="Generated render"
                  className="max-w-full max-h-[60vh] rounded-xl border border-border shadow-2xl object-contain"
                />
                {selectedImage.isMock && (
                  <div className="absolute top-3 left-3">
                    <Badge className="bg-amber-500/80 text-white text-xs border-0">
                      Demo Image
                    </Badge>
                  </div>
                )}
                {/* Download overlay */}
                <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 rounded-xl">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="gap-2"
                    onClick={() =>
                      downloadImage(
                        selectedImage.url,
                        `archrender-${selectedImage.id}.jpg`
                      )
                    }
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                  <a
                    href={selectedImage.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button size="sm" variant="outline" className="gap-2">
                      <ExternalLink className="h-4 w-4" />
                      Open
                    </Button>
                  </a>
                </div>
              </div>
            ) : uploadedImage && !isRunning ? (
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="h-20 w-20 rounded-2xl bg-muted/50 flex items-center justify-center">
                  <ImageIcon className="h-9 w-9 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    Ready to generate
                  </p>
                  <p className="text-xs text-muted-foreground max-w-xs">
                    Click Generate to create AI architectural renders from your model
                  </p>
                </div>
              </div>
            ) : isRunning ? (
              <div className="flex flex-col items-center gap-4">
                <div className="relative h-20 w-20">
                  <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
                  <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                  <div className="absolute inset-2 rounded-full bg-primary/5 flex items-center justify-center">
                    <Sparkles className="h-7 w-7 text-primary" />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground animate-pulse">
                  {statusText || "Generating..."}
                </p>
              </div>
            ) : null}
          </div>
        </div>

        {/* Thumbnails panel */}
        {generatedImages.length > 0 && (
          <div className="w-48 flex flex-col border-l border-border bg-card/50 overflow-hidden">
            <div className="px-3 py-3 border-b border-border flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Renders
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => {
                  generatedImages.forEach((img) => {
                    downloadImage(img.url, `archrender-${img.id}.jpg`);
                  });
                }}
                title="Download all"
              >
                <Download className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {generatedImages.map((img) => {
                const isSelected = img.id === selectedGeneratedId || img.id === selectedImage?.id;
                return (
                  <button
                    key={img.id}
                    onClick={() => onSelectGenerated(img.id)}
                    className={cn(
                      "relative w-full rounded-lg overflow-hidden border-2 transition-all",
                      isSelected
                        ? "border-primary shadow-md shadow-primary/20"
                        : "border-border hover:border-primary/40"
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.url}
                      alt="Render thumbnail"
                      className="w-full aspect-video object-cover"
                    />
                    {isSelected && (
                      <div className="absolute top-1 right-1">
                        <div className="h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                          <Check className="h-2.5 w-2.5 text-primary-foreground" />
                        </div>
                      </div>
                    )}
                    {img.isMock && (
                      <div className="absolute bottom-0 left-0 right-0 bg-amber-500/70 py-0.5">
                        <p className="text-center text-xs text-white font-medium">Demo</p>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer nav */}
      <div className="px-6 py-4 border-t border-border flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={onBack} className="gap-2" disabled={isRunning}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        {selectedImage && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2 ml-auto"
            onClick={() =>
              downloadImage(
                selectedImage.url,
                `archrender-${selectedImage.id}.jpg`
              )
            }
          >
            <Download className="h-4 w-4" />
            Download Selected
          </Button>
        )}
      </div>
    </div>
  );
}
