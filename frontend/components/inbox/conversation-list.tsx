"use client";

import { Lead } from "@/lib/types";
import { cn, timeAgo, getInitials, scoreLabel } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface ConversationListProps {
  leads: Lead[];
  selectedId?: string;
  onSelect: (id: string) => void;
}

export function ConversationList({ leads, selectedId, onSelect }: ConversationListProps) {
  return (
    <div className="h-full overflow-y-auto border-r border-stone-200 bg-white p-3">
      <div className="mb-4 px-2">
        <h2 className="text-sm font-semibold text-stone-900">WhatsApp Inbox</h2>
        <p className="text-xs text-stone-500">AI is handling {leads.filter((l) => l.conversationStatus === "ai_handling").length} active conversations</p>
      </div>
      <div className="space-y-1">
        {leads.map((lead) => {
          const lastMessage = lead.conversation[lead.conversation.length - 1];
          const active = selectedId === lead.id;
          const score = scoreLabel(lead.score);
          return (
            <button
              key={lead.id}
              onClick={() => onSelect(lead.id)}
              className={cn(
                "w-full rounded-xl px-3 py-2.5 text-left transition",
                active ? "bg-emerald-50" : "hover:bg-stone-50"
              )}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-stone-200 text-xs font-bold text-stone-700">
                  {getInitials(lead.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className={cn("truncate text-sm font-medium", active ? "text-emerald-900" : "text-stone-900")}>
                      {lead.name}
                    </p>
                    <span className="text-[10px] text-stone-400">
                      {lastMessage ? timeAgo(lastMessage.createdAt) : ""}
                    </span>
                  </div>
                  <p className="truncate text-xs text-stone-500">
                    {lastMessage ? lastMessage.content : "No messages"}
                  </p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <Badge className={cn("text-[10px]", score.colorClass)}>{lead.score}</Badge>
                    <Badge variant="outline" className="text-[10px]">{lead.status}</Badge>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
