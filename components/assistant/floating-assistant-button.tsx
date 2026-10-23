"use client";

import { Bot } from "lucide-react";

import { canUseAiAssistant } from "@/lib/assistant";
import { cn } from "@/lib/utils";

type FloatingAssistantButtonProps = {
  onClick: () => void;
  className?: string;
};

export function FloatingAssistantButton({ onClick, className }: FloatingAssistantButtonProps) {
  if (!canUseAiAssistant()) return null;

  return (
    <button
      type="button"
      aria-label="Open AI Assistant"
      onClick={onClick}
      className={cn(
        "fixed z-30 flex size-12 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg ring-4 ring-white transition hover:scale-105 focus-visible:outline-none focus-visible:ring-violet-400 md:hidden",
        "bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-4",
        className,
      )}
    >
      <Bot className="size-5" />
    </button>
  );
}
