"use client";

import { ArrowLeft, Bot, FileStack } from "lucide-react";

import { cn } from "@/lib/utils";

type PartnerWorkspaceHeaderProps = {
  onBack?: () => void;
  onOpenDocuments: () => void;
  onOpenAssistant: () => void;
  compact?: boolean;
  className?: string;
};

export function PartnerWorkspaceHeader({
  onBack,
  onOpenDocuments,
  onOpenAssistant,
  compact = true,
  className,
}: PartnerWorkspaceHeaderProps) {
  if (compact) {
    return (
      <header
        className={cn(
          "sticky top-0 z-20 border-b border-slate-200/80 bg-[#f4f7fc]/95 backdrop-blur-md",
          className,
        )}
      >
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-3 py-2.5">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              aria-label="Back to Home"
              className="flex size-9 shrink-0 items-center justify-center rounded-lg text-slate-700 transition hover:bg-slate-100"
            >
              <ArrowLeft className="size-5" />
            </button>
          ) : (
            <span className="size-9 shrink-0" />
          )}

          <h1 className="min-w-0 flex-1 truncate text-center text-sm font-bold text-slate-900">
            Smart Estimation
          </h1>

          <div className="flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              onClick={onOpenAssistant}
              aria-label="AI Assistant"
              className="flex size-9 items-center justify-center rounded-lg text-violet-700 transition hover:bg-violet-50"
            >
              <Bot className="size-5" />
            </button>
            <button
              type="button"
              onClick={onOpenDocuments}
              aria-label="Documents"
              className="flex size-9 items-center justify-center rounded-lg text-slate-700 transition hover:bg-slate-100"
            >
              <FileStack className="size-5" />
            </button>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-20 border-b border-slate-200/80 bg-[#f4f7fc]/95 px-4 py-3 backdrop-blur-md",
        className,
      )}
    >
      <div className="mx-auto flex max-w-3xl items-start justify-between gap-3">
        <div className="min-w-0">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="mb-1 inline-flex items-center gap-1 text-sm font-semibold text-slate-700"
            >
              <ArrowLeft className="size-4" />
              Back
            </button>
          ) : null}
          <h1 className="text-xl font-bold text-slate-900">Smart Estimation Center</h1>
          <p className="text-sm text-slate-600">
            Enter Window, Single Door or Double Door sizes and get cutting, costing and customer
            pricing in one place.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={onOpenAssistant}
            className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-800"
          >
            <Bot className="size-4" />
            AI Assistant
          </button>
          <button
            type="button"
            onClick={onOpenDocuments}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800"
          >
            <FileStack className="size-4" />
            Documents
          </button>
        </div>
      </div>
    </header>
  );
}
