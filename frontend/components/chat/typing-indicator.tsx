"use client";

export function TypingIndicator() {
  return (
    <div className="flex w-max items-center gap-1 rounded-2xl rounded-tl-md bg-white px-4 py-3 shadow-sm">
      <span className="h-2 w-2 animate-bounce rounded-full bg-stone-400 [animation-delay:-0.3s]"></span>
      <span className="h-2 w-2 animate-bounce rounded-full bg-stone-400 [animation-delay:-0.15s]"></span>
      <span className="h-2 w-2 animate-bounce rounded-full bg-stone-400"></span>
    </div>
  );
}
