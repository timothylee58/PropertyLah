"use client";

import { useState, useRef } from "react";
import { Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { QuickPrompts } from "./quick-prompts";
import { Send } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [text, setText] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
    if (ref.current) ref.current.style.height = "auto";
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handlePrompt = (prompt: string) => {
    onSend(prompt);
  };

  return (
    <div className="space-y-3 border-t border-stone-200 bg-white p-4">
      <QuickPrompts onPrompt={handlePrompt} disabled={disabled} />
      <div className="flex items-end gap-2">
        <Textarea
          ref={ref}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
          }}
          onKeyDown={handleKeyDown}
          placeholder="Type a message… Shift+Enter for a new line"
          rows={1}
          disabled={disabled}
          className="min-h-[44px] max-h-40 flex-1 py-3"
        />
        <Button
          onClick={handleSend}
          disabled={disabled || !text.trim()}
          className="h-[44px] w-[44px] rounded-xl p-0"
          aria-label="Send"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
