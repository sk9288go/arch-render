import { NextRequest, NextResponse } from "next/server";
import { toReplicateImageUrl } from "@/lib/uploadImage";

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
      imageUrl,
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

    // Accept either imageUrl (data URL or http URL) or imageBase64 (pure base64 or data URL)
    const rawImage: string | undefined = imageUrl || imageBase64;

    if (!rawImage || !prompt) {
      return NextResponse.json(
        { error: "Missing image (imageUrl or imageBase64) or prompt" },
        { status: 400 }
      );
    }

    // Normalize to a value Replicate accepts:
    //   - http/https URLs are passed as-is
    //   - data URLs (data:image/...;base64,...) are passed as-is (Replicate supports them)
    //   - raw base64 strings are prefixed with a data URL header
    let replicateImage: string;
    if (rawImage.startsWith("http://") || rawImage.startsWith("https://")) {
      replicateImage = rawImage;
    } else if (rawImage.startsWith("data:")) {
      replicateImage = rawImage;
    } else {
      // Raw base64 without prefix — wrap as JPEG data URL
      replicateImage = `data:image/jpeg;base64,${rawImage}`;
    }

    // Guard: Vercel has a 4.5 MB body limit. Warn if the image portion is suspiciously large.
    const imageSizeBytes = replicateImage.length * 0.75; // base64 overhead
    if (imageSizeBytes > 3 * 1024 * 1024) {
      console.warn(`[render] image is large: ~${Math.round(imageSizeBytes / 1024)}KB — consider resizing to 512px before sending`);
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

    // Upload image to get public URL for Replicate
    const replicateImageUrl = await toReplicateImageUrl(imageBase64);

    const count = Math.min(numVariations ?? 1, 2);
    const predPromises = Array.from({ length: count }, async (_, i) => {
      if (i > 0) await new Promise((r) => setTimeout(r, 12000 * i));

      let replicateResponse: Response;
      try {
        replicateResponse = await fetch(
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
                image: replicateImageUrl,
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
      } catch (fetchErr) {
        throw new Error(`Network error contacting Replicate: ${fetchErr instanceof Error ? fetchErr.message : String(fetchErr)}`);
      }

      if (!replicateResponse.ok) {
        const errorText = await replicateResponse.text();
        throw new Error(`Replicate API error (${replicateResponse.status}): ${errorText}`);
      }

      let result: Record<string, unknown> = await replicateResponse.json();
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
        if (!pollRes.ok) {
          throw new Error(`Replicate poll error (${pollRes.status}): ${await pollRes.text()}`);
        }
        result = await pollRes.json();
        attempts++;
      }

      if (result.status === "failed") {
        throw new Error(`Replicate generation failed: ${JSON.stringify(result.error)}`);
      }

      if (attempts >= 60) {
        throw new Error("Replicate generation timed out after 60s");
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
    const message = error instanceof Error ? error.message : String(error);
    console.error("[render] Error:", message);
    return NextResponse.json(
      { error: message || "Render generation failed" },
      { status: 500 }
    );
  }
}
