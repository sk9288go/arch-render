export type AppStep = "upload" | "segment" | "prompt" | "generate";

export type SegmentLabel =
  | "Background"
  | "Building"
  | "Windows"
  | "Landscape"
  | "Sky"
  | "Road"
  | "Custom";

export interface SegmentMask {
  id: string;
  label: SegmentLabel;
  color: string;
  maskData: string; // base64 encoded mask image
  clickPoint: { x: number; y: number };
  prompt: string;
  negativePrompt: string;
  visible: boolean;
  locked: boolean;
  score?: number;
}

export interface StylePreset {
  id: string;
  name: string;
  globalPrompt: string;
  negativePrompt: string;
  thumbnail?: string;
}

export interface ControlNetSettings {
  depthEnabled: boolean;
  depthStrength: number;
  lineartEnabled: boolean;
  lineartStrength: number;
}

export interface GenerationSettings {
  globalPrompt: string;
  negativePrompt: string;
  steps: number;
  guidanceScale: number;
  strength: number;
  seed: number | null;
  stylePreset: string | null;
  controlNet: ControlNetSettings;
  numVariations: number;
}

export interface GeneratedImage {
  id: string;
  url: string;
  seed: number;
  timestamp: number;
  settings: Partial<GenerationSettings>;
  isMock?: boolean;
}

export interface AppState {
  step: AppStep;
  uploadedImage: {
    url: string;
    file: File | null;
    width: number;
    height: number;
    base64: string;
  } | null;
  segments: SegmentMask[];
  selectedSegmentId: string | null;
  depthMapUrl: string | null;
  lineartUrl: string | null;
  generatedImages: GeneratedImage[];
  selectedGeneratedId: string | null;
  generationSettings: GenerationSettings;
  isSegmenting: boolean;
  isGeneratingDepth: boolean;
  isRendering: boolean;
  error: string | null;
  activeTab: "original" | "segmented" | "render";
}

export const SEGMENT_COLORS: Record<SegmentLabel, string> = {
  Background: "#6366f1",
  Building: "#f59e0b",
  Windows: "#06b6d4",
  Landscape: "#22c55e",
  Sky: "#3b82f6",
  Road: "#94a3b8",
  Custom: "#ec4899",
};

export const DEFAULT_GENERATION_SETTINGS: GenerationSettings = {
  globalPrompt:
    "architectural visualization, photorealistic rendering, high quality, 8k, professional photography",
  negativePrompt:
    "cartoon, anime, painting, low quality, blurry, distorted, deformed",
  steps: 30,
  guidanceScale: 7.5,
  strength: 0.75,
  seed: null,
  stylePreset: null,
  controlNet: {
    depthEnabled: true,
    depthStrength: 0.7,
    lineartEnabled: true,
    lineartStrength: 0.5,
  },
  numVariations: 2,
};

export const STYLE_PRESETS: StylePreset[] = [
  {
    id: "photorealistic",
    name: "Photorealistic",
    globalPrompt:
      "photorealistic architectural rendering, natural lighting, 8k, hyperrealistic, award-winning photography",
    negativePrompt: "cartoon, anime, unrealistic, sketch, low quality",
  },
  {
    id: "sunset",
    name: "Golden Hour",
    globalPrompt:
      "architectural visualization at golden hour, warm sunset lighting, dramatic sky, photorealistic, 8k",
    negativePrompt: "dark, overcast, flat lighting, low quality",
  },
  {
    id: "night",
    name: "Night Scene",
    globalPrompt:
      "architectural night rendering, dramatic artificial lighting, illuminated windows, city lights, photorealistic",
    negativePrompt: "daytime, flat lighting, low quality, cartoon",
  },
  {
    id: "overcast",
    name: "Overcast",
    globalPrompt:
      "architectural visualization, soft overcast lighting, neutral tones, professional photography, 8k",
    negativePrompt: "harsh shadows, bright sunlight, low quality",
  },
  {
    id: "sketch",
    name: "Architectural Sketch",
    globalPrompt:
      "architectural line drawing, pencil sketch style, hand-drawn, professional architectural illustration",
    negativePrompt: "photorealistic, color, photography, low quality",
  },
];
