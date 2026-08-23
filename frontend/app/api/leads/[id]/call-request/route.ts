import { NextRequest, NextResponse } from "next/server";
import * as store from "@/lib/server/store";

export const runtime = "nodejs";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = (await request.json()) as { callType?: "ai" | "human"; listingId?: string };
    const lead = await store.getLead(id);

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    lead.callStatus = "requested";
    lead.lastActivity = new Date().toISOString();
    lead.timelineEvents = lead.timelineEvents || [];
    lead.timelineEvents.unshift({
      id: `te-${Date.now()}`,
      type: "call_requested",
      title: `${body.callType === "human" ? "Human" : "AI"} call requested`,
      createdAt: new Date().toISOString(),
    });

    await store.updateLead(lead);

    return NextResponse.json({
      lead,
      callStatus: "requested",
      message:
        "Call request recorded for agent follow-up. WhatsApp and AI call events remain simulated unless a verified provider is configured.",
    });
  } catch (err) {
    console.error("POST /api/leads/[id]/call-request error:", err);
    return NextResponse.json({ error: "Unable to record call request" }, { status: 500 });
  }
}
