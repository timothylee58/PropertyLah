"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Lead, ConversationMessage, Listing, ViewingSlot } from "@/lib/types";
import { IS_DEMO, sendChatMessage, updateLead } from "@/lib/api";
import { processDemoMessage, DemoStep } from "@/lib/demo-agent";
import { ChatMessage } from "./chat-message";
import { ChatInput } from "./chat-input";
import { TypingIndicator } from "./typing-indicator";
import { LeadProfile } from "./lead-profile";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Sparkles, Mail } from "lucide-react";

const GREETING: ConversationMessage = {
  id: "greeting",
  role: "agent",
  content:
    "Hi! I’m KeyNest, your AI property concierge. I can help you find a home, arrange a viewing, or connect you with an agent. What are you looking for today?",
  createdAt: new Date().toISOString(),
};

function makeUserMessage(text: string): ConversationMessage {
  return {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    role: "user",
    content: text,
    createdAt: new Date().toISOString(),
  };
}

function initialLead(): Lead {
  return {
    id: "aisha-rahman",
    name: "Aisha",
    source: "Website chat",
    intent: "Buyer",
    status: "new",
    score: 0,
    lastActivity: new Date().toISOString(),
    qualification: {},
    conversation: [GREETING],
  };
}

export function ChatWindow() {
  const [messages, setMessages] = useState<ConversationMessage[]>([GREETING]);
  const [lead, setLead] = useState<Lead>(initialLead);
  const [step, setStep] = useState<DemoStep>("greeting");
  const [isThinking, setIsThinking] = useState(false);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<ViewingSlot | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking, scrollToBottom]);

  const addMessage = (message: ConversationMessage) => {
    setMessages((prev) => [...prev, message]);
  };

  const handleUserTurn = async (text: string, listing?: Listing, slot?: ViewingSlot) => {
    if (isThinking) return;
    setIsThinking(true);

    addMessage(makeUserMessage(text));

    try {
      if (IS_DEMO) {
        await new Promise((resolve) => setTimeout(resolve, 700));

        const result = processDemoMessage(
          text,
          lead,
          step,
          selectedListing || listing || null
        );

        if (listing) {
          setSelectedListing(listing);
        }
        if (slot) {
          setSelectedSlot(slot);
        }

        setLead(result.lead);
        setStep(result.step);
        if (result.selectedListing) {
          setSelectedListing(result.selectedListing);
        }

        addMessage(result.agentMessage);

        if (result.step === "booked") {
          const finalLead: Lead = {
            ...result.lead,
            name: "Aisha Rahman",
            source: "Website chat",
            recommendedListings: result.agentMessage.booking
              ? [result.agentMessage.booking.listing]
              : undefined,
          };
          setLead(finalLead);
          updateLead(finalLead);
        }
      } else {
        await new Promise((resolve) => setTimeout(resolve, 600));
        const response = await sendChatMessage({
          sessionId: "web-session",
          leadId: lead.id,
          message: text,
        });

        const agentMessage: ConversationMessage = {
          id: makeUserMessage("").id,
          role: "agent",
          content: response.message,
          createdAt: new Date().toISOString(),
          listings: response.listings,
          slots: response.suggestedSlots,
          booking: response.booking
            ? {
                listing: response.booking.listing,
                slot: response.booking.slot,
              }
            : undefined,
          actions: response.status
            ? [`Status: ${response.status}`]
            : undefined,
        };

        const updatedLead: Lead = {
          ...lead,
          qualification: response.qualification || lead.qualification,
          score: response.leadScore ?? lead.score,
          status: response.status ?? lead.status,
        };

        if (response.booking) {
          updatedLead.bookedViewing = response.booking;
        }

        setLead(updatedLead);
        addMessage(agentMessage);

        if (response.booking) {
          updateLead(updatedLead);
        }
      }
    } catch (err) {
      console.error(err);
      addMessage({
        id: makeUserMessage("").id,
        role: "agent",
        content:
          "Sorry, I’m having trouble connecting. I’ll keep working in demo mode so your conversation isn’t interrupted.",
        createdAt: new Date().toISOString(),
      });
    } finally {
      setIsThinking(false);
    }
  };

  const handleSend = (text: string) => {
    handleUserTurn(text);
  };

  const handleSelectListing = (id: string) => {
    const listing = selectedListing ||
      lead.recommendedListings?.find((l) => l.id === id) ||
      messages
        .flatMap((m) => m.listings || [])
        .find((l) => l.id === id);

    if (!listing) return;
    setSelectedListing(listing);
    handleUserTurn(`I'll view ${listing.name}.`, listing);
  };

  const handleSelectSlot = (id: string) => {
    const slot = messages
      .flatMap((m) => m.slots || [])
      .find((s) => s.id === id);
    if (!slot) return;
    setSelectedSlot(slot);
    handleUserTurn(`${slot.label} works.`, selectedListing || undefined, slot);
  };

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-warm-50">
      <header className="flex items-start justify-between border-b border-stone-200 bg-white px-6 py-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-stone-900">AI Property Concierge</h1>
            <Badge variant="outline" className="text-[10px] text-stone-500">
              Malaysia · EN / BM
            </Badge>
          </div>
          <p className="text-sm text-stone-500">
            Qualify leads, match listings, and book viewings automatically.
          </p>
        </div>
        <div className="hidden items-center gap-2 sm:flex">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-50 text-teal-700">
            <Mail className="h-4 w-4" />
          </div>
          <div className="text-right text-xs">
            <p className="font-medium text-stone-700">Aisha Rahman</p>
            <p className="text-stone-500">Active session</p>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          <div
            ref={containerRef}
            className="scrollbar-thin flex-1 overflow-y-auto px-4 py-6 sm:px-6"
          >
            <div className="mx-auto max-w-3xl space-y-6 pb-4">
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  onSelectListing={handleSelectListing}
                  onSelectSlot={handleSelectSlot}
                  disabled={isThinking || step === "booked"}
                />
              ))}
              {isThinking && (
                <div className="flex w-full flex-row gap-3">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-teal-700 text-white shadow-sm">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <TypingIndicator />
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          </div>

          <ChatInput onSend={handleSend} disabled={isThinking} />
        </div>

        <aside
          className={cn(
            "hidden w-80 flex-shrink-0 border-l border-stone-200 bg-white xl:block",
            "overflow-y-auto p-5"
          )}
        >
          <LeadProfile lead={lead} />
        </aside>
      </div>
    </div>
  );
}
