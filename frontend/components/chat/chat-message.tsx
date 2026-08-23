"use client";

import { ConversationMessage } from "@/lib/types";
import { cn, timeAgo } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ListingCard } from "./listing-card";
import { AppointmentPicker } from "./appointment-picker";
import { BookingConfirmation } from "./booking-confirmation";
import { Check, CheckCheck } from "lucide-react";

interface ChatMessageProps {
  message: ConversationMessage;
  leadName?: string;
  onSelectListing?: (id: string) => void;
  onSelectSlot?: (id: string) => void;
  disabled?: boolean;
}

export function ChatMessage({
  message,
  leadName = "Lead",
  onSelectListing,
  onSelectSlot,
  disabled,
}: ChatMessageProps) {
  const isLead = message.sender === "lead";
  const isAi = message.sender === "ai";
  const isSystem = message.sender === "system";

  if (isSystem) {
    return (
      <div className="flex justify-center py-2">
        <span className="rounded-full bg-stone-200/70 px-3 py-1 text-[10px] font-medium text-stone-600">
          {message.content}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex w-full gap-2 px-1",
        isLead ? "justify-start" : "justify-end"
      )}
    >
      <div className={cn("flex max-w-[85%] flex-col gap-1", isLead ? "items-start" : "items-end")}>
        {message.content && (
          <div
            className={cn(
              "relative animate-in fade-in text-sm leading-relaxed duration-300",
              isLead
                ? "rounded-2xl rounded-tl-md bg-white px-4 py-2.5 text-stone-800 shadow-sm"
                : "rounded-2xl rounded-tr-md bg-emerald-600 px-4 py-2.5 text-white shadow-sm"
            )}
          >
            <p className="whitespace-pre-wrap">{message.content}</p>
            <div className={cn("mt-1 flex items-center justify-end gap-1 text-[10px]", isAi ? "text-emerald-100" : "text-stone-400")}>
              <span>{timeAgo(message.createdAt)}</span>
              {!isLead && (
                <span>
                  {message.deliveryStatus === "read" ? (
                    <CheckCheck className="h-3.5 w-3.5" />
                  ) : message.deliveryStatus === "delivered" ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}
                </span>
              )}
            </div>
          </div>
        )}

        {message.actions && message.actions.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {message.actions.map((action) => (
              <Badge
                key={action}
                variant="outline"
                className={cn(
                  "text-[10px]",
                  isAi
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-stone-200 bg-stone-50 text-stone-600"
                )}
              >
                {action}
              </Badge>
            ))}
          </div>
        )}

        {message.metadata?.listings && message.metadata.listings.length > 0 && (
          <div className={cn("grid gap-3 pt-1", isAi ? "sm:grid-cols-2" : "")}>
            {message.metadata.listings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                onSelect={onSelectListing ? () => onSelectListing(listing.id) : undefined}
                disabled={disabled}
              />
            ))}
          </div>
        )}

        {message.metadata?.slots && message.metadata.slots.length > 0 && onSelectSlot && (
          <div className="w-full pt-1">
            <AppointmentPicker
              slots={message.metadata.slots}
              onSelect={(slot) => onSelectSlot(slot.id)}
              disabled={disabled}
            />
          </div>
        )}

        {message.metadata?.slots && message.metadata.slots.length > 0 && !onSelectSlot && (
          <div className="w-full space-y-2 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-stone-500">Suggested viewing slots</p>
            <div className="flex flex-wrap gap-2">
              {message.metadata.slots.map((slot) => (
                <Badge key={slot.id} variant="soft" className="text-xs">
                  {slot.label}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {message.metadata?.booking?.listing && (
          <div className="pt-1">
            <BookingConfirmation listing={message.metadata.booking.listing} slot={message.metadata.booking.slot} />
          </div>
        )}
      </div>
    </div>
  );
}
