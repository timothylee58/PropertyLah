"use client";

import { ViewingSlot } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";

interface AppointmentPickerProps {
  slots: ViewingSlot[];
  onSelect: (slot: ViewingSlot) => void;
  disabled?: boolean;
}

export function AppointmentPicker({ slots, onSelect, disabled }: AppointmentPickerProps) {
  return (
    <div className="space-y-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-medium text-stone-800">Pick a viewing slot</p>
      <div className="grid gap-2 sm:grid-cols-3">
        {slots.map((slot) => (
          <Button
            key={slot.id}
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => onSelect(slot)}
            className="h-auto w-full flex-col items-start gap-1 rounded-xl border-stone-200 py-3 text-left text-xs hover:border-teal-700 hover:bg-teal-50"
          >
            <span className="flex items-center gap-1.5 text-stone-500">
              <Clock className="h-3.5 w-3.5" /> Available
            </span>
            <span className="font-medium text-stone-900">{slot.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
