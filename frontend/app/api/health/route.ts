import { NextResponse } from "next/server";
import { IS_DEMO, hasQwenConfig, hasHermesConfig, hasSupabaseConfig, hasTelegramConfig, hasElevenLabsConfig } from "@/lib/server/env";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    ok: true,
    mode: IS_DEMO ? "demo" : "live",
    qwenConfigured: hasQwenConfig(),
    hermesConfigured: hasHermesConfig(),
    supabaseConfigured: hasSupabaseConfig(),
    telegramConfigured: hasTelegramConfig(),
    elevenLabsConfigured: hasElevenLabsConfig(),
  });
}
