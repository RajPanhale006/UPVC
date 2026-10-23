"use client";

import type { ReactNode } from "react";
import { CheckCircle2, FileDown, Loader2 } from "lucide-react";

import { MessageBanner } from "@/components/workshop/workshop-ui";

type PdfFeedbackProps = {
  message: string | null;
  isBusy?: boolean;
  busyLabel?: string;
};

/** Consistent PDF export / download feedback across tabs. */
export function PdfFeedback({
  message,
  isBusy = false,
  busyLabel = "Preparing PDF…",
}: PdfFeedbackProps) {
  if (isBusy) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-950">
        <Loader2 className="size-5 shrink-0 animate-spin text-indigo-600" />
        <span className="font-medium">{busyLabel}</span>
      </div>
    );
  }

  if (!message) return null;

  const isError =
    message.toLowerCase().includes("could not") ||
    message.toLowerCase().includes("error") ||
    message.toLowerCase().includes("invalid");

  return (
    <MessageBanner tone={isError ? "error" : "success"}>
      <span className="flex items-center gap-2">
        {!isError ? <CheckCircle2 className="size-4 shrink-0" /> : null}
        {message}
      </span>
    </MessageBanner>
  );
}

type PdfDocumentActionsProps = {
  children: ReactNode;
};

/** Groups PDF hero actions with consistent spacing. */
export function PdfDocumentActions({ children }: PdfDocumentActionsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 [&_button]:shadow-sm">
      {children}
    </div>
  );
}

export function PdfDownloadHint() {
  return (
    <p className="flex items-center gap-2 text-xs text-slate-500">
      <FileDown className="size-3.5 shrink-0 text-slate-400" />
      PDFs open in preview first. Use Download to save or Share on mobile.
    </p>
  );
}
