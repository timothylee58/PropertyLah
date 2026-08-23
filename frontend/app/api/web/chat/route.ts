import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { AgentChatRequest, ConversationMessage, Lead, Qualification } from "@/lib/types";
import { IS_DEMO, hasQwenConfig, hasHermesConfig } from "@/lib/server/env";
import { runDemoAgent } from "@/lib/server/demo-agent";
import { runLiveAgent } from "@/lib/server/live-agent";
import { calculateLeadScore, scoreLabel } from "@/lib/server/score";
import * as store from "@/lib/server/store";

export const runtime = "nodejs";

export interface WebChatRequest {
  name?: string;
  email?: string;
  message: string;
  sessionId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as WebChatRequest;
    const { name = "Web Visitor", email, message, sessionId } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Missing or invalid message" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const leadId = sessionId || `web-${randomUUID()}`;

    let lead = await store.getLead(leadId);
    if (!lead) {
      const qualification: Qualification = {};
      lead = {
        id: leadId,
        name,
        phoneMasked: email ? email : "Web",
        source: "Web",
        channel: "web",
        intent: "unknown",
        budgetLabel: "TBD",
        score: 0,
        scoreLabel: scoreLabel(0),
        status: "new",
        conversationStatus: "ai_handling",
        aiSummary: "",
        nextBestAction: "Qualify the lead.",
        callStatus: "not_requested",
        lastActivity: now,
        qualification,
        conversation: [],
      };
    }

    const agentReq: AgentChatRequest = {
      sessionId: lead.id,
      leadId: lead.id,
      leadName: lead.name,
      channel: "web",
      message,
      conversation: lead.conversation,
      qualification: lead.qualification,
    };

    let response;
    if (hasQwenConfig() || hasHermesConfig()) {
      response = await runLiveAgent(agentReq);
    } else if (IS_DEMO) {
      response = await runDemoAgent(agentReq);
    } else {
      return NextResponse.json(
        {
          error: "Live agent is not configured. Enable demo mode or configure Hermes/Qwen server environment variables.",
        },
        { status: 503 }
      );
    }

    const incoming: ConversationMessage = {
      id: randomUUID(),
      conversationId: lead.id,
      sender: "lead",
      channel: "web",
      content: message,
      createdAt: now,
      deliveryStatus: "read",
    };

    const aiMessage: ConversationMessage = {
      id: randomUUID(),
      conversationId: lead.id,
      sender: "ai",
      channel: "web",
      content: response.message,
      createdAt: new Date(Date.now() + 700).toISOString(),
      deliveryStatus: "delivered",
      metadata: {
        listings: response.listings,
        slots: response.suggestedSlots,
        booking: response.viewing,
        actionType: response.actions?.[0],
      },
      actions: response.actions,
    };

    lead.conversation.push(incoming, aiMessage);
    lead.lastActivity = now;

    if (response.qualification) {
      lead.qualification = { ...lead.qualification, ...response.qualification };
    }
    if (response.listings) {
      lead.recommendedListings = response.listings;
    }
    if (response.viewing) {
      lead.bookedViewing = response.viewing;
    }

    const score = response.leadScore ?? calculateLeadScore(lead.qualification);
    lead.score = score;
    lead.scoreLabel = scoreLabel(score);
    if (response.leadStatus) lead.status = response.leadStatus;
    if (response.conversationStatus) lead.conversationStatus = response.conversationStatus;
    if (response.nextBestAction) lead.nextBestAction = response.nextBestAction;
    if (response.handoffRequired) lead.conversationStatus = "human_handling";

    lead.timelineEvents = lead.timelineEvents || [];
    lead.timelineEvents.unshift({
      id: `te-${Date.now()}`,
      type: "inquiry",
      title: `Web chat from ${lead.name}`,
      createdAt: now,
    });

    await store.updateLead(lead);

    return NextResponse.json({
      sessionId: lead.id,
      leadId: lead.id,
      message: response.message,
      qualification: response.qualification,
      leadScore: response.leadScore,
      leadStatus: response.leadStatus,
      listings: response.listings,
      suggestedSlots: response.suggestedSlots,
      booking: response.viewing,
      handoffRequired: response.handoffRequired,
      actions: response.actions,
    });
  } catch (err) {
    console.error("Web chat error:", err);
    return NextResponse.json({ error: "Web chat failed" }, { status: 500 });
  }
}
