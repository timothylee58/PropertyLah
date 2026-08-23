"use client";

import { ConversationMessage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ListingCard } from "./listing-card";
import { AppointmentPicker } from "./appointment-picker";
import { BookingConfirmation } from "./booking-confirmation";
import { Sparkles } from "lucide-react";

interface ChatMessageProps {
  message: ConversationMessage;
  onSelectListing?: (id: string) => void;
  onSelectSlot?: (id: string) => void;
  disabled?: boolean;
}

export function ChatMessage({
  message,
  onSelectListing,
  onSelectSlot,
  disabled,
}: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex w-full gap-3",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {!isUser && (
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-teal-700 text-white shadow-sm">
          <Sparkles className="h-4 w-4" />
        </div>
      )}

      <div className={cn("flex max-w-[85%] flex-col gap-2", isUser ? "items-end" : "items-start")}>
        {message.content && (
          <div
            className={cn(
              "animate-in fade-in slide-in-from-bottom-2 text-sm leading-relaxed duration-300",
              isUser
                ? "rounded-2xl rounded-tr-md bg-teal-800 px-4 py-3 text-white"
                : "rounded-2xl rounded-tl-md bg-white px-4 py-3 text-stone-800 shadow-sm"
            )}
          >
            {message.content}
          </div>
        )}

        {message.actions && message.actions.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {message.actions.map((action) => (
              <Badge
                key={action}
                variant="outline"
                className="border-teal-200 bg-teal-50 text-[10px] text-teal-800"
              >
                {action}
              </Badge>
            ))}
          </div>
        )}

        {message.listings && message.listings.length > 0 && (
          <div className="grid gap-3 pt-1 sm:grid-cols-2">
            {message.listings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                onSelect={onSelectListing ? () => onSelectListing(listing.id) : undefined}
                disabled={disabled}
              />
            ))}
          </div>
        )}

        {message.slots && message.slots.length > 0 && onSelectSlot && (
          <div className="w-full pt-1">
            <AppointmentPicker
              slots={message.slots}
              onSelect={(slot) => onSelectSlot(slot.id)}
              disabled={disabled}
            />
          </div>
        )}

        {message.slots && message.slots.length > 0 && !onSelectSlot && (
          <div className="w-full space-y-2 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-stone-500">Suggested viewing slots</p>
            <div className="flex flex-wrap gap-2">
              {message.slots.map((slot) => (
                <Badge key={slot.id} variant="soft" className="text-xs">
                  {slot.label}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {message.booking && (
          <div className="pt-1">
            <BookingConfirmation listing={message.booking.listing} slot={message.booking.slot} />
          </div>
        )}
      </div>
    </div>
  );
}
