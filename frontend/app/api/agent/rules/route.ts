import { NextRequest, NextResponse } from "next/server";
import { AgentRule } from "@/lib/types";
import * as store from "@/lib/server/store";

export const runtime = "nodejs";

export async function GET() {
  try {
    const rules = await store.getAgentRules();
    return NextResponse.json(rules);
  } catch (err) {
    console.error("GET /api/agent/rules error:", err);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Omit<AgentRule, "id" | "createdAt" | "updatedAt">;
    const now = new Date().toISOString();
    const rule: AgentRule = {
      ...body,
      id: `rule-${Date.now()}`,
      createdAt: now,
      updatedAt: now,
    };
    await store.updateAgentRule(rule);
    return NextResponse.json(rule);
  } catch (err) {
    console.error("POST /api/agent/rules error:", err);
    return NextResponse.json({ error: "Unable to create rule" }, { status: 500 });
  }
}
