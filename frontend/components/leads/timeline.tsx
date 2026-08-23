"use client";

import { TimelineEvent } from "@/lib/types";
import { cn, formatTime } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { MessageSquare, CheckCircle, Home, Calendar, Phone, User, Sparkles } from "lucide-react";

interface TimelineProps {
  events: TimelineEvent[];
}

const iconMap: Record<TimelineEvent["type"], React.ElementType> = {
  inquiry: MessageSquare,
  ai_response: Sparkles,
  qualification: CheckCircle,
  listing_match: Home,
  viewing_booked: Calendar,
  call_requested: Phone,
  handover: User,
  agent_note: User,
};

export function Timeline({ events }: TimelineProps) {
  return (
    <Card>
      <CardHeader className="border-b border-stone-100 pb-4">
        <h2 className="text-sm font-semibold text-stone-900">Timeline</h2>
      </CardHeader>
      <CardContent className="pt-5">
        <div className="relative space-y-6 pl-4 before:absolute before:left-1.5 before:top-2 before:h-[calc(100%-16px)] before:w-px before:bg-stone-200">
          {events.map((event, i) => {
            const Icon = iconMap[event.type];
            return (
              <div key={event.id} className="relative">
                <div className={cn("absolute -left-4 top-0.5 flex h-7 w-7 items-center justify-center rounded-full border bg-white text-stone-500", "border-stone-200")}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="pl-6">
                  <p className="text-sm font-medium text-stone-800">{event.title}</p>
                  {event.description && (
                    <p className="text-xs text-stone-500">{event.description}</p>
                  )}
                  <p className="text-[10px] text-stone-400">
                    {formatTime(event.createdAt)} {event.agent ? `· ${event.agent}` : ""}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
