import { NextRequest, NextResponse } from "next/server";
import { searchKnowledge } from "@/lib/server/knowledge";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { query?: string };
    const { query } = body;
    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Missing query" }, { status: 400 });
    }
    const answer = await searchKnowledge(query);
    return NextResponse.json({
      query,
      answer: answer.answer,
      sourcesUsed: answer.sourcesUsed,
      rulesApplied: answer.rulesApplied,
      handoff: answer.handoffRequired,
      handoffReason: answer.handoffReason,
    });
  } catch (err) {
    console.error("/api/knowledge/test error:", err);
    return NextResponse.json(
      { error: "Unable to run knowledge test" },
      { status: 500 }
    );
  }
}
