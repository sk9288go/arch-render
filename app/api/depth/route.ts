import { NextRequest, NextResponse } from "next/server";
import { toReplicateImageUrl } from "@/lib/uploadImage";

// Mock depth map - a grey gradient image
const MOCK_DEPTH_URL =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Simple_gradient.svg/640px-Simple_gradient.svg.png";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Accept imageUrl (data URL or http URL) or legacy imageBase64
    const { imageUrl, imageBase64 } = body;
    const rawImage: string | undefined = imageUrl || imageBase64;

    if (!rawImage) {
      return NextResponse.json(
        { error: "Missing image (imageUrl or imageBase64)" },
        { status: 400 }
      );
    }

    // Upload to get a public URL (Replicate requires HTTP URLs)
    const replicateImage = await toReplicateImageUrl(rawImage);

    const apiToken = process.env.REPLICATE_API_TOKEN;

    if (!apiToken || apiToken === "your_token_here") {
      await new Promise((r) => setTimeout(r, 1500));
      return NextResponse.json({
        success: true,
        depthUrl: MOCK_DEPTH_URL,
        lineartUrl: MOCK_DEPTH_URL,
        isMock: true,
      });
    }

    // Run depth-anything and lineart in parallel
    const [depthRes, lineartRes] = await Promise.all([
      fetch("https://api.replicate.com/v1/predictions", {
        method: "POST",
        headers: {
          Authorization: `Token ${apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          version:
            "35f86d664a8966eb1c3e4b8d2b7da62c1d6e2e5b1da2f3b0d0e3c1d6e2e5b1d",
          input: {
            image: replicateImage,
            model_size: "Base",
          },
        }),
      }),
      fetch("https://api.replicate.com/v1/predictions", {
        method: "POST",
        headers: {
          Authorization: `Token ${apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          version:
            "a7535a9b5a5b6ae8e50fa1b4c30d7e15d6e2e5b1da2f3b0d0e3c1d6e2e5b1d",
          input: {
            image: replicateImage,
            detect_resolution: 512,
            image_resolution: 512,
          },
        }),
      }),
    ]);

    const pollPrediction = async (id: string, token: string) => {
      let result: Record<string, unknown> = { status: "starting" };
      let attempts = 0;
      while (
        result.status !== "succeeded" &&
        result.status !== "failed" &&
        attempts < 30
      ) {
        await new Promise((r) => setTimeout(r, 1000));
        const res = await fetch(
          `https://api.replicate.com/v1/predictions/${id}`,
          { headers: { Authorization: `Token ${token}` } }
        );
        if (!res.ok) {
          throw new Error(`Replicate poll error (${res.status}): ${await res.text()}`);
        }
        result = await res.json();
        attempts++;
      }
      if (result.status === "failed") {
        throw new Error(`Depth prediction failed: ${JSON.stringify(result.error)}`);
      }
      return result;
    };

    const depthResJson = await depthRes.json();
    const lineartResJson = await lineartRes.json();

    if (!depthRes.ok) {
      throw new Error(`Replicate depth API error (${depthRes.status}): ${JSON.stringify(depthResJson)}`);
    }
    if (!lineartRes.ok) {
      throw new Error(`Replicate lineart API error (${lineartRes.status}): ${JSON.stringify(lineartResJson)}`);
    }

    const [depthPred, lineartPred] = await Promise.all([
      pollPrediction(depthResJson.id, apiToken),
      pollPrediction(lineartResJson.id, apiToken),
    ]);

    return NextResponse.json({
      success: true,
      depthUrl: depthPred.output as string,
      lineartUrl: lineartPred.output as string,
      isMock: false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[depth] Error:", message);
    return NextResponse.json(
      { error: message || "Depth map generation failed" },
      { status: 500 }
    );
  }
}
