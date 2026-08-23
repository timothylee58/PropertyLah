import { NextRequest, NextResponse } from "next/server";
import { AgentRule } from "@/lib/types";
import * as store from "@/lib/server/store";

export const runtime = "nodejs";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const rule = await store.getAgentRule(id);
    if (!rule) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }
    const updates = (await request.json()) as Partial<AgentRule>;
    const updated: AgentRule = { ...rule, ...updates, id, updatedAt: new Date().toISOString() };
    await store.updateAgentRule(updated);
    return NextResponse.json(updated);
  } catch (err) {
    console.error("PATCH /api/agent/rules/[id] error:", err);
    return NextResponse.json({ error: "Unable to update rule" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ok = await store.deleteAgentRule(id);
    if (!ok) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/agent/rules/[id] error:", err);
    return NextResponse.json({ error: "Unable to delete rule" }, { status: 500 });
  }
}
