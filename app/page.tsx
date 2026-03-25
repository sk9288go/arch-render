"use client";

import { useMemo, useState } from "react";
import { useAppState } from "@/lib/hooks/useAppState";
import { Sidebar } from "@/components/layout/Sidebar";
import { UploadStep } from "@/components/steps/UploadStep";
import { SegmentStep } from "@/components/steps/SegmentStep";
import { PromptStep } from "@/components/steps/PromptStep";
import { GenerateStep } from "@/components/steps/GenerateStep";
import { AppStep } from "@/lib/types";

const STEP_ORDER: AppStep[] = ["upload", "segment", "prompt", "generate"];

export default function Home() {
  const {
    state,
    setStep,
    setUploadedImage,
    addSegment,
    updateSegment,
    removeSegment,
    setSelectedSegment,
    setDepthMapUrl,
    setLineartUrl,
    addGeneratedImage,
    setSelectedGenerated,
    updateGenerationSettings,
    setIsGeneratingDepth,
    setIsRendering,
    setError,
  } = useAppState();

  const [advancedMode, setAdvancedMode] = useState(false);

  // Track which steps have been completed (able to navigate back to)
  const completedSteps = useMemo<Set<AppStep>>(() => {
    const s = new Set<AppStep>();
    const currentIdx = STEP_ORDER.indexOf(state.step);
    STEP_ORDER.forEach((step, i) => {
      if (i < currentIdx) s.add(step);
    });
    return s;
  }, [state.step]);

  const goToNext = () => {
    const idx = STEP_ORDER.indexOf(state.step);
    if (idx < STEP_ORDER.length - 1) setStep(STEP_ORDER[idx + 1]);
  };

  const goToPrev = () => {
    const idx = STEP_ORDER.indexOf(state.step);
    if (idx > 0) setStep(STEP_ORDER[idx - 1]);
  };

  // Detect if we're in mock mode (no API token configured)
  const isMockMode = !process.env.NEXT_PUBLIC_HAS_API_TOKEN;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        currentStep={state.step}
        completedSteps={completedSteps}
        onStepClick={setStep}
        advancedMode={advancedMode}
        onAdvancedModeToggle={setAdvancedMode}
        isMockMode={isMockMode}
      />

      {/* Main content area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {state.step === "upload" && (
          <UploadStep
            uploadedImage={state.uploadedImage}
            onImageUpload={setUploadedImage}
            onNext={goToNext}
          />
        )}

        {state.step === "segment" && (
          <SegmentStep
            uploadedImage={state.uploadedImage}
            segments={state.segments}
            selectedSegmentId={state.selectedSegmentId}
            isSegmenting={state.isSegmenting}
            onAddSegment={addSegment}
            onUpdateSegment={updateSegment}
            onRemoveSegment={removeSegment}
            onSelectSegment={setSelectedSegment}
            onNext={goToNext}
            onBack={goToPrev}
          />
        )}

        {state.step === "prompt" && (
          <PromptStep
            uploadedImage={state.uploadedImage}
            segments={state.segments}
            selectedSegmentId={state.selectedSegmentId}
            generationSettings={state.generationSettings}
            onSelectSegment={setSelectedSegment}
            onUpdateSegment={updateSegment}
            onUpdateSettings={updateGenerationSettings}
            advancedMode={advancedMode}
            onNext={goToNext}
            onBack={goToPrev}
          />
        )}

        {state.step === "generate" && (
          <GenerateStep
            uploadedImage={state.uploadedImage}
            depthMapUrl={state.depthMapUrl}
            lineartUrl={state.lineartUrl}
            generationSettings={state.generationSettings}
            generatedImages={state.generatedImages}
            selectedGeneratedId={state.selectedGeneratedId}
            onSetDepthMapUrl={setDepthMapUrl}
            onSetLineartUrl={setLineartUrl}
            onAddGeneratedImage={addGeneratedImage}
            onSelectGenerated={setSelectedGenerated}
            onSetIsRendering={setIsRendering}
            onSetIsGeneratingDepth={setIsGeneratingDepth}
            onSetError={setError}
            onBack={goToPrev}
          />
        )}
      </main>
    </div>
  );
}
