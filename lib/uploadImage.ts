/**
 * Upload a base64 image to Imgur and return a public URL.
 * Replicate models require HTTP(S) URLs, not base64.
 */
export async function uploadToImgur(base64: string): Promise<string> {
  const data = base64.replace(/^data:image\/\w+;base64,/, "");
  const res = await fetch("https://api.imgur.com/3/image", {
    method: "POST",
    headers: {
      Authorization: "Client-ID 546c25a59c58ad7",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ image: data, type: "base64" }),
  });
  if (!res.ok) throw new Error(`Imgur upload failed: ${await res.text()}`);
  const json = await res.json();
  return json.data.link as string;
}

/** Normalize image input to a URL Replicate accepts */
export async function toReplicateImageUrl(input: string): Promise<string> {
  if (input.startsWith("http://") || input.startsWith("https://")) {
    return input;
  }
  // base64 or data URI — upload to get a public URL
  return uploadToImgur(input);
}
