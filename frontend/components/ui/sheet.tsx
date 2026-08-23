import * as React from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  side?: "right" | "left";
}

export function Sheet({ open, onClose, title, children, side = "right" }: SheetProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="flex-1 bg-stone-900/20 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={cn(
          "h-full w-full max-w-md overflow-y-auto border-stone-200 bg-white p-6 shadow-xl",
          side === "right" ? "border-l" : "border-r"
        )}
      >
        <div className="mb-6 flex items-center justify-between">
          {title ? <h2 className="text-lg font-semibold text-stone-800">{title}</h2> : <div />}
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-stone-500 hover:bg-stone-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
