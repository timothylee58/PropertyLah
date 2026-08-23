import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { AgentChatRequest, ConversationMessage, Lead, Qualification } from "@/lib/types";
import { IS_DEMO, TELEGRAM_WEBHOOK_SECRET, hasQwenConfig, hasHermesConfig } from "@/lib/server/env";
import { runDemoAgent } from "@/lib/server/demo-agent";
import { runLiveAgent } from "@/lib/server/live-agent";
import { sendTelegramMessage } from "@/lib/server/telegram";
import { calculateLeadScore, scoreLabel } from "@/lib/server/score";
import * as store from "@/lib/server/store";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const secret = new URL(request.url).searchParams.get("secret");
    if (TELEGRAM_WEBHOOK_SECRET && secret !== TELEGRAM_WEBHOOK_SECRET) {
      return new NextResponse("unauthorized", { status: 401 });
    }

    const update = (await request.json()) as TelegramUpdate;
    const message = update.message || update.edited_message;
    if (!message?.text) {
      return NextResponse.json({ ok: true });
    }

    const chat = message.chat;
    const from = message.from;
    const chatId = chat.id;
    const leadId = `telegram-${chatId}`;
    const now = new Date().toISOString();

    let lead = await store.getLead(leadId);
    if (!lead) {
      const name = [from?.first_name, from?.last_name].filter(Boolean).join(" ").trim() || from?.username || `Telegram ${chatId}`;
      const username = from?.username;
      const qualification: Qualification = {};
      lead = {
        id: leadId,
        name,
        phoneMasked: username ? `@${username}` : "Telegram",
        source: "Telegram",
        channel: "telegram",
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
        telegramChatId: chatId,
      };
    }

    const agentReq: AgentChatRequest = {
      sessionId: lead.id,
      leadId: lead.id,
      leadName: lead.name,
      channel: "telegram",
      message: message.text,
      conversation: lead.conversation,
      qualification: lead.qualification,
    };

    let response;
    if (hasQwenConfig() || hasHermesConfig()) {
      response = await runLiveAgent(agentReq);
    } else if (IS_DEMO) {
      response = await runDemoAgent(agentReq);
    } else {
      throw new Error("Live agent is not configured. Configure Hermes/Qwen or enable demo mode.");
    }

    const incoming: ConversationMessage = {
      id: randomUUID(),
      conversationId: lead.id,
      sender: "lead",
      channel: "telegram",
      content: message.text,
      createdAt: now,
      deliveryStatus: "read",
    };

    const aiMessage: ConversationMessage = {
      id: randomUUID(),
      conversationId: lead.id,
      sender: "ai",
      channel: "telegram",
      content: response.message,
      createdAt: new Date(Date.now() + 700).toISOString(),
      deliveryStatus: "sent",
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
      title: `Telegram message from ${lead.name}`,
      createdAt: now,
    });

    await store.updateLead(lead);

    if (lead.telegramChatId) {
      const sent = await sendTelegramMessage(lead.telegramChatId, response.message);
      if (!sent.ok) {
        console.warn("Telegram outbound failed:", sent.error);
      } else {
        aiMessage.deliveryStatus = "delivered";
        await store.updateLead(lead);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Telegram webhook error:", err);
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 });
  }
}

interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

interface TelegramChat {
  id: number;
  type: "private" | "group" | "supergroup" | "channel";
  title?: string;
  first_name?: string;
  last_name?: string;
  username?: string;
}

interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
}
