import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

const client = new Anthropic();

export async function POST(request: Request) {
  console.log("[OCR] ANTHROPIC_API_KEY set:", !!process.env.ANTHROPIC_API_KEY);
  console.log("[OCR] ANTHROPIC_API_KEY prefix:", process.env.ANTHROPIC_API_KEY?.slice(0, 12));

  // Supabase認証チェック
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    console.log("[OCR] Unauthorized: no user");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  console.log("[OCR] Authenticated user:", user.id);

  let body;
  try {
    body = await request.json();
  } catch (e) {
    console.error("[OCR] Failed to parse request body:", e);
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { image, mediaType, regionHint } = body;

  if (!image || !mediaType) {
    console.log("[OCR] Missing fields - image:", !!image, "mediaType:", mediaType);
    return NextResponse.json(
      { error: "image and mediaType are required" },
      { status: 400 }
    );
  }

  console.log("[OCR] mediaType:", mediaType, "image length:", image.length, "regionHint:", regionHint);

  const promptText = regionHint
    ? `この文書の指定領域からテキストを抽出してください。領域: 左${Math.round(regionHint.left * 100)}%, 上${Math.round(regionHint.top * 100)}%, 幅${Math.round(regionHint.width * 100)}%, 高さ${Math.round(regionHint.height * 100)}%。抽出したテキストのみを返してください。余計な説明は不要です。`
    : "この画像からテキストを抽出してください。抽出したテキストのみを返してください。余計な説明は不要です。";

  // PDFはdocument type、画像はimage typeで送信
  const contentBlock: Anthropic.ContentBlockParam =
    mediaType === "application/pdf"
      ? {
          type: "document",
          source: {
            type: "base64",
            media_type: "application/pdf",
            data: image,
          },
        }
      : {
          type: "image",
          source: {
            type: "base64",
            media_type: mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
            data: image,
          },
        };

  try {
    console.log("[OCR] Calling Claude API...");
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: [contentBlock, { type: "text", text: promptText }],
        },
      ],
    });
    console.log("[OCR] Claude API response stop_reason:", response.stop_reason);

    const textBlock = response.content.find((b) => b.type === "text");
    const extractedText = textBlock?.type === "text" ? textBlock.text : "";
    console.log("[OCR] Extracted text length:", extractedText.length);

    return NextResponse.json({ text: extractedText });
  } catch (e: unknown) {
    const err = e as Error & { status?: number; message?: string };
    console.error("[OCR] Claude API error:", err.status, err.message);
    console.error("[OCR] Full error:", err);
    return NextResponse.json(
      { error: err.message || "OCR failed" },
      { status: err.status || 500 }
    );
  }
}
