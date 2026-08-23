import { NextRequest, NextResponse } from "next/server";
import * as store from "@/lib/server/store";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const lead = await store.getLead(id);
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }
    return NextResponse.json(lead);
  } catch (err) {
    console.error("/api/leads/[id] error:", err);
    return NextResponse.json({ error: "Lead not found" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const lead = await store.getLead(id);
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }
    const updates = (await request.json()) as Partial<typeof lead>;
    const updated = { ...lead, ...updates, id };
    await store.updateLead(updated);
    return NextResponse.json(updated);
  } catch (err) {
    console.error("PATCH /api/leads/[id] error:", err);
    return NextResponse.json({ error: "Unable to update lead" }, { status: 500 });
  }
}
