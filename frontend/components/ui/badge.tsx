import * as React from "react";
import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "outline" | "soft";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variant === "default" && "bg-teal-700 text-white",
        variant === "outline" && "border border-stone-200 bg-white text-stone-600",
        variant === "soft" && "bg-warm-100 text-stone-700",
        className
      )}
      {...props}
    />
  );
}
