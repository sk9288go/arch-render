import { NextRequest, NextResponse } from "next/server";

// Curated mock architectural render images
const MOCK_RENDERS = [
  "https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=1024&q=80",
  "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=1024&q=80",
  "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1024&q=80",
  "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=1024&q=80",
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      imageBase64,
      depthUrl,
      lineartUrl,
      prompt,
      negativePrompt,
      steps,
      guidanceScale,
      strength,
      seed,
      numVariations,
      controlNet,
    } = body;

    if (!imageBase64 || !prompt) {
      return NextResponse.json(
        { error: "Missing imageBase64 or prompt" },
        { status: 400 }
      );
    }

    const apiToken = process.env.REPLICATE_API_TOKEN;

    if (!apiToken || apiToken === "your_token_here") {
      await new Promise((r) => setTimeout(r, 2500));
      const count = Math.min(numVariations ?? 2, 4);
      const images = Array.from({ length: count }, (_, i) => ({
        id: `mock-render-${Date.now()}-${i}`,
        url: MOCK_RENDERS[i % MOCK_RENDERS.length],
        seed: seed ?? Math.floor(Math.random() * 999999),
        timestamp: Date.now(),
        isMock: true,
      }));
      return NextResponse.json({ success: true, images, isMock: true });
    }

    // Build ControlNet inputs
    const controlNetInputs: Record<string, unknown> = {};
    if (controlNet?.depthEnabled && depthUrl) {
      controlNetInputs.controlnet_1 = "depth";
      controlNetInputs.controlnet_1_image = depthUrl;
      controlNetInputs.controlnet_1_conditioning_scale =
        controlNet.depthStrength ?? 0.7;
    }
    if (controlNet?.lineartEnabled && lineartUrl) {
      controlNetInputs.controlnet_2 = "lineart";
      controlNetInputs.controlnet_2_image = lineartUrl;
      controlNetInputs.controlnet_2_conditioning_scale =
        controlNet.lineartStrength ?? 0.5;
    }

    const count = Math.min(numVariations ?? 2, 4);
    const predPromises = Array.from({ length: count }, async (_, i) => {
      const response = await fetch(
        "https://api.replicate.com/v1/predictions",
        {
          method: "POST",
          headers: {
            Authorization: `Token ${apiToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            version:
              "39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
            input: {
              image: imageBase64,
              prompt,
              negative_prompt: negativePrompt,
              num_inference_steps: steps ?? 30,
              guidance_scale: guidanceScale ?? 7.5,
              strength: strength ?? 0.75,
              seed: seed ? seed + i : undefined,
              ...controlNetInputs,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Replicate error: ${await response.text()}`);
      }

      let result: Record<string, unknown> = await response.json();
      let attempts = 0;
      while (
        result.status !== "succeeded" &&
        result.status !== "failed" &&
        attempts < 60
      ) {
        await new Promise((r) => setTimeout(r, 1000));
        const pollRes = await fetch(
          `https://api.replicate.com/v1/predictions/${result.id}`,
          { headers: { Authorization: `Token ${apiToken}` } }
        );
        result = await pollRes.json();
        attempts++;
      }

      if (result.status === "failed") {
        throw new Error(`Generation failed: ${result.error}`);
      }

      const outputUrl = Array.isArray(result.output)
        ? result.output[0]
        : result.output;

      return {
        id: `render-${result.id}`,
        url: outputUrl as string,
        seed: (result.logs as string)?.match(/seed: (\d+)/)?.[1]
          ? parseInt((result.logs as string).match(/seed: (\d+)/)![1])
          : seed ?? 0,
        timestamp: Date.now(),
        isMock: false,
      };
    });

    const images = await Promise.all(predPromises);

    return NextResponse.json({ success: true, images, isMock: false });
  } catch (error) {
    console.error("Render error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Render generation failed",
      },
      { status: 500 }
    );
  }
}
