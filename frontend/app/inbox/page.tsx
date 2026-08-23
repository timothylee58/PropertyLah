"use client";

import { useEffect, useRef, useState } from "react";
import { Lead, Listing, ViewingSlot } from "@/lib/types";
import { getConversations, sendSimulatedInboundMessage, takeOverConversation, requestAiCall, assignLead } from "@/lib/api";
import { ConversationList } from "@/components/inbox/conversation-list";
import { LeadIntelligencePanel } from "@/components/inbox/lead-intelligence-panel";
import { ChatMessage } from "@/components/chat/chat-message";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Send } from "lucide-react";

const quickChips = [
  "Can I get more photos?",
  "CALL",
  "I need a human agent",
  "Saya cari condo di Mont Kiara",
];

export default function InboxPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedId, setSelectedId] = useState<string>("aisha-rahman");
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [simulating, setSimulating] = useState(false);
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const handleSelectLead = (id: string) => {
    setSelectedListingId(null);
    setSelectedId(id);
  };

  useEffect(() => {
    getConversations().then((data) => {
      setLeads(data);
      setLoading(false);
    });
  }, []);

  const selected = leads.find((l) => l.id === selectedId) || leads[0];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selected?.conversation, simulating]);

  const updateLead = (updated: Lead) => {
    setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
  };

  const handleSend = async (text: string) => {
    if (!selected || !text.trim() || simulating) return;
    setSimulating(true);
    const updated = await sendSimulatedInboundMessage(selected.id, text);
    if (updated) updateLead(updated);
    setInput("");
    setSimulating(false);
  };

  const handleTakeOver = async () => {
    if (!selected) return;
    const updated = await takeOverConversation(selected.id);
    if (updated) updateLead(updated);
  };

  const handleRequestCall = async () => {
    if (!selected) return;
    const updated = await requestAiCall(selected.id, "ai");
    if (updated) updateLead(updated);
  };

  const handleSelectListing = async (listing: Listing) => {
    if (!selected || simulating) return;
    setSelectedListingId(listing.id);
    setSimulating(true);
    const updated = await sendSimulatedInboundMessage(selected.id, `I like ${listing.name}.`);
    if (updated) updateLead(updated);
    setSimulating(false);
  };

  const handleSelectSlot = async (slot: ViewingSlot) => {
    if (!selected || simulating) return;
    setSimulating(true);
    const updated = await sendSimulatedInboundMessage(selected.id, slot.label);
    if (updated) updateLead(updated);
    setSimulating(false);
  };

  const handleAssign = async () => {
    if (!selected) return;
    const updated = await assignLead(selected.id, "Sarah Lee");
    if (updated) updateLead(updated);
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-stone-500">
        Loading conversations…
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 bg-stone-100/40">
      <div className="hidden w-72 flex-shrink-0 md:block">
        <ConversationList leads={leads} selectedId={selected?.id} onSelect={handleSelectLead} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-stone-200 bg-white px-5 py-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-semibold text-stone-900">{selected?.name || "Select a conversation"}</h1>
              <Badge variant="soft" className="text-[10px]">
                {selected?.channel === "telegram" ? "Telegram" : "WhatsApp"}
              </Badge>
            </div>
            <p className="text-xs text-stone-500">{selected?.phoneMasked}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={selected?.conversationStatus === "ai_handling" ? "bg-emerald-100 text-emerald-700" : "bg-violet-100 text-violet-700"}>
              {selected?.conversationStatus === "ai_handling" ? "AI handling" : "Human handling"}
            </Badge>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {selected ? (
            <div className="mx-auto max-w-3xl space-y-4">
              <div className="text-center">
                <span className="rounded-full bg-white/80 px-3 py-1 text-[10px] text-stone-500 shadow-sm">Today</span>
              </div>
              {selected.conversation.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  leadName={selected.name}
                  onSelectListing={handleSelectListing}
                  onSelectSlot={handleSelectSlot}
                  disabled={simulating}
                />
              ))}
              {simulating && (
                <div className="flex justify-end">
                  <div className="max-w-[80%] rounded-2xl rounded-tr-md bg-emerald-100 px-4 py-2 text-sm text-emerald-800">
                    KeyNest is composing…
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          ) : (
            <p className="text-center text-sm text-stone-500">Select a conversation to view.</p>
          )}
        </div>

        <div className="border-t border-stone-200 bg-white p-4">
          <div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-stone-500">
            {selected?.channel === "telegram" ? "Simulate incoming Telegram message" : "Simulate incoming WhatsApp message"}
          </div>
          <div className="flex flex-wrap gap-2 mb-3">
            {quickChips.map((chip) => (
              <Button
                key={chip}
                size="sm"
                variant="secondary"
                onClick={() => handleSend(chip)}
                disabled={simulating}
                className="rounded-full border border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
              >
                {chip}
              </Button>
            ))}
          </div>
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(input);
                }
              }}
              placeholder="Type a test message as the lead…"
              disabled={simulating}
              className="max-h-32 min-h-[44px] w-full flex-1 resize-none rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm text-stone-800 placeholder:text-stone-400 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/10"
            />
            <Button
              onClick={() => handleSend(input)}
              disabled={simulating || !input.trim()}
              className="h-[44px] w-[44px] rounded-xl p-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="hidden w-80 flex-shrink-0 lg:block">
        {selected ? (
          <LeadIntelligencePanel
            lead={selected}
            onTakeOver={handleTakeOver}
            onRequestCall={handleRequestCall}
            onAssign={handleAssign}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-stone-500">
            Select a lead
          </div>
        )}
      </div>
    </div>
  );
}
