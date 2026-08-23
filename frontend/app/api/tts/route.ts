import { NextRequest, NextResponse } from "next/server";
import { textToSpeech } from "@/lib/server/elevenlabs";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { text?: string; language?: string };
    const text = body.text?.trim();
    const language = body.language === "ms" ? "ms" : "en";

    if (!text) {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }
    if (text.length > 5000) {
      return NextResponse.json({ error: "text too long" }, { status: 400 });
    }

    const audio = await textToSpeech(text, language);
    return new NextResponse(audio, {
      headers: { "Content-Type": "audio/mpeg" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "TTS failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
