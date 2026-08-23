"use client";

import { Button } from "@/components/ui/button";

const prompts = [
  "Find a 3BR near KLCC under RM800k",
  "Saya cari condo di Mont Kiara",
  "I want to sell my condo",
];

interface QuickPromptsProps {
  onPrompt: (prompt: string) => void;
  disabled?: boolean;
}

export function QuickPrompts({ onPrompt, disabled }: QuickPromptsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {prompts.map((prompt) => (
        <Button
          key={prompt}
          variant="secondary"
          size="sm"
          disabled={disabled}
          onClick={() => onPrompt(prompt)}
          className="whitespace-nowrap rounded-full border border-stone-200 bg-white text-stone-700 hover:bg-warm-100"
        >
          {prompt}
        </Button>
      ))}
    </div>
  );
}
