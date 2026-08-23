import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    const variants = {
      primary:
        "bg-teal-700 text-white hover:bg-teal-800 disabled:bg-stone-300 disabled:text-stone-500",
      secondary:
        "bg-white text-stone-800 border border-stone-200 hover:bg-warm-100 disabled:bg-stone-100",
      outline:
        "bg-transparent text-teal-700 border border-teal-700 hover:bg-teal-50 disabled:text-stone-400 disabled:border-stone-300",
      ghost: "bg-transparent text-stone-600 hover:bg-stone-100 disabled:text-stone-400",
    };
    const sizes = {
      sm: "px-3 py-1.5 text-xs",
      md: "px-4 py-2 text-sm",
      lg: "px-5 py-2.5 text-base",
    };
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-xl font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-teal-700/20",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
