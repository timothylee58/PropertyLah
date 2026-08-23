import { NextRequest, NextResponse } from "next/server";
import { KnowledgeSource } from "@/lib/types";
import * as store from "@/lib/server/store";

export const runtime = "nodejs";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const source = await store.getKnowledgeSource(id);
    if (!source) {
      return NextResponse.json({ error: "Knowledge source not found" }, { status: 404 });
    }
    const updates = (await request.json()) as Partial<KnowledgeSource>;
    const updated: KnowledgeSource = {
      ...source,
      ...updates,
      id,
      lastUpdated: new Date().toISOString(),
    };
    await store.updateKnowledgeSource(updated);
    return NextResponse.json(updated);
  } catch (err) {
    console.error("PATCH /api/knowledge/sources/[id] error:", err);
    return NextResponse.json({ error: "Unable to update knowledge source" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ok = await store.deleteKnowledgeSource(id);
    if (!ok) {
      return NextResponse.json({ error: "Knowledge source not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/knowledge/sources/[id] error:", err);
    return NextResponse.json({ error: "Unable to delete knowledge source" }, { status: 500 });
  }
}
