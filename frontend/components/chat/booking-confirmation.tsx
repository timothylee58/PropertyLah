"use client";

import { Listing, ViewingSlot } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarCheck, MapPin, Clock, CheckCircle } from "lucide-react";

interface BookingConfirmationProps {
  listing: Listing;
  slot: ViewingSlot;
}

export function BookingConfirmation({ listing, slot }: BookingConfirmationProps) {
  return (
    <Card className="w-full max-w-md overflow-hidden border-emerald-200 bg-emerald-50/60">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <CheckCircle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-emerald-900">Viewing confirmed</h3>
            <p className="text-xs text-emerald-700">Calendar invite sent</p>
          </div>
        </div>

        <div className="space-y-2 rounded-xl border border-emerald-100 bg-white p-4">
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 text-stone-500" />
            <div>
              <p className="font-medium text-stone-900">{listing.name}</p>
              <p className="text-xs text-stone-500">{listing.location}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-stone-500" />
            <p className="text-sm text-stone-800">{slot.label}</p>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-teal-800">{formatCurrency(listing.price)}</p>
            <Badge variant="soft" className="text-[10px]">3 bed · 2 bath</Badge>
          </div>
        </div>

        <p className="text-xs text-emerald-800">
          A calendar invite and confirmation will be sent to Aisha.
        </p>
      </CardContent>
    </Card>
  );
}
