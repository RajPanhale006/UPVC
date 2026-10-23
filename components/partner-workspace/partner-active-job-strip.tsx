"use client";

import { formatTimeAgo } from "@/components/dashboard/dashboard-utils";
import { cn } from "@/lib/utils";

type PartnerActiveJobStripProps = {
  jobId: string;
  projectName?: string;
  productCount: number;
  updatedAt?: string;
  isOnline?: boolean;
  pendingSync?: boolean;
  onOpenJob: () => void;
  compact?: boolean;
  className?: string;
};

export function PartnerActiveJobStrip({
  jobId,
  projectName,
  productCount,
  updatedAt,
  isOnline,
  pendingSync,
  onOpenJob,
  compact = false,
  className,
}: PartnerActiveJobStripProps) {
  if (compact) {
    return (
      <button
        type="button"
        onClick={onOpenJob}
        className={cn(
          "mx-auto flex w-full max-w-3xl items-center gap-2 border-b border-slate-200/60 bg-white/60 px-3 py-1.5 text-left text-xs transition hover:bg-violet-50/50",
          className,
        )}
      >
        <span className="font-bold text-slate-800">{jobId}</span>
        <span className="text-slate-400">·</span>
        <span className="truncate text-slate-600">
          {productCount} product{productCount === 1 ? "" : "s"}
          {projectName ? ` · ${projectName}` : ""}
        </span>
        {!isOnline ? <span className="ml-auto text-slate-500">Offline</span> : null}
        {pendingSync ? <span className="ml-auto text-orange-700">Sync pending</span> : null}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpenJob}
      className={cn(
        "flex w-full flex-col gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left shadow-sm transition hover:border-violet-200 hover:bg-violet-50/40",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
          Active Job
        </span>
        <span className="text-xs text-slate-500">
          {productCount} product{productCount === 1 ? "" : "s"}
          {updatedAt ? ` · Saved ${formatTimeAgo(updatedAt)}` : ""}
          {!isOnline ? " · Offline" : null}
          {pendingSync ? " · Pending sync" : null}
        </span>
      </div>
      <p className="text-sm font-bold text-slate-900">{jobId}</p>
      {projectName ? (
        <p className="truncate text-xs text-slate-600">{projectName}</p>
      ) : null}
    </button>
  );
}
