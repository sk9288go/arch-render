"use client";

import { useState, useCallback, useRef } from "react";
import {
  Upload,
  FileImage,
  X,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { cn, fileToBase64, getImageDimensions, formatBytes } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AppState } from "@/lib/types";

interface UploadStepProps {
  uploadedImage: AppState["uploadedImage"];
  onImageUpload: (image: AppState["uploadedImage"]) => void;
  onNext: () => void;
}

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 10 * 1024 * 1024;

async function resizeImage(base64: string, maxPx: number): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const ratio = Math.min(maxPx / img.width, maxPx / img.height, 1);
      const w = Math.round(img.width * ratio);
      const h = Math.round(img.height * ratio);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.src = base64;
  });
}

export function UploadStep({
  uploadedImage,
  onImageUpload,
  onNext,
}: UploadStepProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    async (file: File) => {
      setError(null);

      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError("Unsupported format. Please use JPEG, PNG, or WebP.");
        return;
      }

      if (file.size > MAX_SIZE) {
        setError(
          `File too large (${formatBytes(file.size)}). Maximum is 10MB.`
        );
        return;
      }

      setIsProcessing(true);
      try {
        const rawBase64 = await fileToBase64(file);
        // Resize to max 768px to stay under Vercel 4.5MB body limit
        const resizedBase64 = await resizeImage(rawBase64, 768);
        const dims = await getImageDimensions(resizedBase64);
        onImageUpload({
          url: resizedBase64,
          file,
          width: dims.width,
          height: dims.height,
          base64: resizedBase64,
        });
      } catch {
        setError("Failed to process image. Please try again.");
      } finally {
        setIsProcessing(false);
      }
    },
    [onImageUpload]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-5 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground">Upload Model</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Import your SketchUp mass model image to begin
        </p>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
        {!uploadedImage ? (
          <div className="w-full max-w-xl space-y-4">
            {/* Drop zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200 p-12",
                isDragging
                  ? "border-primary bg-primary/5 scale-[1.02]"
                  : "border-border hover:border-primary/50 hover:bg-accent/30",
                isProcessing && "pointer-events-none opacity-70"
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                className="hidden"
                onChange={handleFileChange}
              />

              {isProcessing ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="h-12 w-12 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  <p className="text-sm text-muted-foreground">
                    Processing image...
                  </p>
                </div>
              ) : (
                <>
                  <div
                    className={cn(
                      "flex h-16 w-16 items-center justify-center rounded-2xl border-2 transition-colors mb-4",
                      isDragging
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-muted/50 text-muted-foreground"
                    )}
                  >
                    <Upload className="h-7 w-7" />
                  </div>
                  <p className="text-base font-medium text-foreground">
                    {isDragging ? "Drop to upload" : "Drag & drop your image"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    or click to browse
                  </p>
                  <div className="flex items-center gap-2 mt-4">
                    {["JPEG", "PNG", "WebP"].map((fmt) => (
                      <span
                        key={fmt}
                        className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground"
                      >
                        {fmt}
                      </span>
                    ))}
                    <span className="text-xs text-muted-foreground">
                      · Max 10MB
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3">
                <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {/* Hints */}
            <div className="rounded-lg bg-muted/30 border border-border p-4 space-y-2">
              <p className="text-xs font-medium text-foreground">Tips</p>
              <ul className="space-y-1">
                {[
                  "Use SketchUp or Rhino mass model exports",
                  "Plain grey/white models work best for segmentation",
                  "Higher resolution yields better results (min 512×512)",
                ].map((tip) => (
                  <li
                    key={tip}
                    className="flex items-start gap-2 text-xs text-muted-foreground"
                  >
                    <span className="mt-0.5 h-1 w-1 rounded-full bg-primary shrink-0" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          /* Preview */
          <div className="w-full max-w-2xl space-y-4">
            <div className="relative rounded-xl overflow-hidden border border-border bg-muted/20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={uploadedImage.url}
                alt="Uploaded model"
                className="w-full object-contain max-h-[50vh]"
              />
              <button
                onClick={() => onImageUpload(null)}
                className="absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-full bg-background/80 border border-border hover:bg-destructive hover:border-destructive hover:text-white transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* File info */}
            <div className="flex items-center justify-between rounded-lg bg-muted/30 border border-border px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                  <FileImage className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground truncate max-w-xs">
                    {uploadedImage.file?.name ?? "image"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {uploadedImage.width} × {uploadedImage.height}px
                    {uploadedImage.file &&
                      ` · ${formatBytes(uploadedImage.file.size)}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-xs text-primary hover:underline"
              >
                Replace
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            <Button onClick={onNext} className="w-full gap-2" size="lg">
              Continue to Segment
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
