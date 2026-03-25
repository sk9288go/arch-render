"use client";

import { useState, useCallback } from "react";
import {
  AppState,
  AppStep,
  SegmentMask,
  GeneratedImage,
  GenerationSettings,
  DEFAULT_GENERATION_SETTINGS,
} from "@/lib/types";


const initialState: AppState = {
  step: "upload",
  uploadedImage: null,
  segments: [],
  selectedSegmentId: null,
  depthMapUrl: null,
  lineartUrl: null,
  generatedImages: [],
  selectedGeneratedId: null,
  generationSettings: DEFAULT_GENERATION_SETTINGS,
  isSegmenting: false,
  isGeneratingDepth: false,
  isRendering: false,
  error: null,
  activeTab: "original",
};

export function useAppState() {
  const [state, setState] = useState<AppState>(initialState);

  const setStep = useCallback((step: AppStep) => {
    setState((prev) => ({ ...prev, step, error: null }));
  }, []);

  const setUploadedImage = useCallback(
    (image: AppState["uploadedImage"]) => {
      setState((prev) => ({
        ...prev,
        uploadedImage: image,
        segments: [],
        selectedSegmentId: null,
        depthMapUrl: null,
        lineartUrl: null,
        generatedImages: [],
        selectedGeneratedId: null,
        error: null,
      }));
    },
    []
  );

  const addSegment = useCallback((segment: SegmentMask) => {
    setState((prev) => ({
      ...prev,
      segments: [...prev.segments, segment],
      selectedSegmentId: segment.id,
    }));
  }, []);

  const updateSegment = useCallback(
    (id: string, updates: Partial<SegmentMask>) => {
      setState((prev) => ({
        ...prev,
        segments: prev.segments.map((s) =>
          s.id === id ? { ...s, ...updates } : s
        ),
      }));
    },
    []
  );

  const removeSegment = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      segments: prev.segments.filter((s) => s.id !== id),
      selectedSegmentId:
        prev.selectedSegmentId === id ? null : prev.selectedSegmentId,
    }));
  }, []);

  const setSelectedSegment = useCallback((id: string | null) => {
    setState((prev) => ({ ...prev, selectedSegmentId: id }));
  }, []);

  const setDepthMapUrl = useCallback((url: string | null) => {
    setState((prev) => ({ ...prev, depthMapUrl: url }));
  }, []);

  const setLineartUrl = useCallback((url: string | null) => {
    setState((prev) => ({ ...prev, lineartUrl: url }));
  }, []);

  const addGeneratedImage = useCallback((image: GeneratedImage) => {
    setState((prev) => ({
      ...prev,
      generatedImages: [...prev.generatedImages, image],
      selectedGeneratedId: image.id,
    }));
  }, []);

  const setSelectedGenerated = useCallback((id: string | null) => {
    setState((prev) => ({ ...prev, selectedGeneratedId: id }));
  }, []);

  const updateGenerationSettings = useCallback(
    (updates: Partial<GenerationSettings>) => {
      setState((prev) => ({
        ...prev,
        generationSettings: { ...prev.generationSettings, ...updates },
      }));
    },
    []
  );

  const setIsSegmenting = useCallback((val: boolean) => {
    setState((prev) => ({ ...prev, isSegmenting: val }));
  }, []);

  const setIsGeneratingDepth = useCallback((val: boolean) => {
    setState((prev) => ({ ...prev, isGeneratingDepth: val }));
  }, []);

  const setIsRendering = useCallback((val: boolean) => {
    setState((prev) => ({ ...prev, isRendering: val }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState((prev) => ({ ...prev, error }));
  }, []);

  const setActiveTab = useCallback((tab: AppState["activeTab"]) => {
    setState((prev) => ({ ...prev, activeTab: tab }));
  }, []);

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  return {
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
    setIsSegmenting,
    setIsGeneratingDepth,
    setIsRendering,
    setError,
    setActiveTab,
    reset,
  };
}
