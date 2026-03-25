import { NextRequest, NextResponse } from "next/server";

const MOCK_MASKS = [
  {
    id: "mock-1",
    score: 0.94,
    // 1x1 transparent PNG as placeholder
    maskData:
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  },
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageBase64, point, label } = body;

    if (!imageBase64 || !point) {
      return NextResponse.json(
        { error: "Missing imageBase64 or point" },
        { status: 400 }
      );
    }

    const apiToken = process.env.REPLICATE_API_TOKEN;

    // Return mock if no API token
    if (!apiToken || apiToken === "your_token_here") {
      await new Promise((r) => setTimeout(r, 1200));
      return NextResponse.json({
        success: true,
        masks: MOCK_MASKS,
        isMock: true,
      });
    }

    // Real SAM2 via Replicate
    const response = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        Authorization: `Token ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version:
          "fe97b453a6455861e3bac769b441ca1f1086110da7466dbb65cf1eecfd60dc83",
        input: {
          image: imageBase64,
          input_points: [[point.x, point.y]],
          input_labels: [label ?? 1],
          multimask_output: true,
        },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Replicate API error: ${err}`);
    }

    const prediction = await response.json();

    // Poll for completion
    let result = prediction;
    let attempts = 0;
    while (
      result.status !== "succeeded" &&
      result.status !== "failed" &&
      attempts < 30
    ) {
      await new Promise((r) => setTimeout(r, 1000));
      const pollRes = await fetch(
        `https://api.replicate.com/v1/predictions/${result.id}`,
        {
          headers: { Authorization: `Token ${apiToken}` },
        }
      );
      result = await pollRes.json();
      attempts++;
    }

    if (result.status === "failed") {
      throw new Error(`Prediction failed: ${result.error}`);
    }

    // SAM2 output can be array of URLs, object with masks key, or single string
    let outputArray: string[] = [];
    if (Array.isArray(result.output)) {
      outputArray = result.output;
    } else if (result.output?.masks && Array.isArray(result.output.masks)) {
      outputArray = result.output.masks;
    } else if (typeof result.output === "string") {
      outputArray = [result.output];
    } else if (result.output) {
      outputArray = Object.values(result.output).filter((v) => typeof v === "string") as string[];
    }

    const masks = outputArray.map((maskUrl: string, i: number) => ({
      id: `mask-${i}`,
      score: 0.9 - i * 0.05,
      maskData: maskUrl,
    }));

    return NextResponse.json({ success: true, masks, isMock: false });
  } catch (error) {
    console.error("Segment error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Segmentation failed",
      },
      { status: 500 }
    );
  }
}
