import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

const client = new Anthropic();

export async function POST(request: Request) {
  // Supabase認証チェック
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { image, mediaType, regionHint } = await request.json();

  if (!image || !mediaType) {
    return NextResponse.json(
      { error: "image and mediaType are required" },
      { status: 400 }
    );
  }

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

  const textBlock = response.content.find((b) => b.type === "text");
  const extractedText = textBlock?.type === "text" ? textBlock.text : "";

  return NextResponse.json({ text: extractedText });
}
