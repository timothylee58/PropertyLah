import { NextRequest, NextResponse } from "next/server";
import { AgentChatRequest, AgentResponse } from "@/lib/types";
import { IS_DEMO, hasQwenConfig, hasHermesConfig } from "@/lib/server/env";
import { runDemoAgent } from "@/lib/server/demo-agent";
import { runLiveAgent } from "@/lib/server/live-agent";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AgentChatRequest;
    const { sessionId, message } = body;

    if (!sessionId || typeof sessionId !== "string") {
      return NextResponse.json({ error: "Missing or invalid sessionId" }, { status: 400 });
    }
    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Missing or invalid message" }, { status: 400 });
    }

    let response: AgentResponse;

    if (IS_DEMO) {
      response = await runDemoAgent(body);
    } else {
      if (!hasQwenConfig() && !hasHermesConfig()) {
        return NextResponse.json(
          {
            error: "Live agent is not configured. Enable demo mode or configure Hermes/Qwen server environment variables.",
          },
          { status: 503 }
        );
      }
      response = await runLiveAgent(body);
    }

    // Ensure the response always carries a session id.
    response.sessionId = sessionId;

    return NextResponse.json(response);
  } catch (err) {
    console.error("/api/agent/chat error:", err);
    return NextResponse.json(
      {
        error: "The AI agent is temporarily unavailable. Please try again or assign this lead to a human agent.",
      },
      { status: 500 }
    );
  }
}
