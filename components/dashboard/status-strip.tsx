"use client";

import { ChevronRight } from "lucide-react";

type StatusStripProps = {
  jobId: string;
  productCount: number;
  lastSavedLabel: string;
  isOnline: boolean;
  onOpenActiveJob?: () => void;
};

export function StatusStrip({
  jobId,
  productCount,
  lastSavedLabel,
  isOnline,
  onOpenActiveJob,
}: StatusStripProps) {
  return (
    <div className="mx-auto max-w-5xl px-4">
      <button
        type="button"
        onClick={onOpenActiveJob}
        aria-label={`Open active job ${jobId} overview`}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-white/90 px-3 py-2.5 text-left text-[11px] font-medium text-slate-600 shadow-sm transition active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
      >
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1">
          <span>
            Active Job: <strong className="text-slate-900">{jobId}</strong>
          </span>
          <span>
            Products: <strong className="text-slate-900">{productCount}</strong>
          </span>
          <span>
            Saved: <strong className="text-slate-900">{lastSavedLabel}</strong>
          </span>
          <span className="hidden min-[360px]:inline">
            {isOnline ? "Synced locally" : "Offline draft · will sync when online"}
          </span>
        </div>
        <ChevronRight className="size-4 shrink-0 text-slate-400" aria-hidden />
      </button>
    </div>
  );
}
