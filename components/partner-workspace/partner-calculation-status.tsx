"use client";

import { Loader2, RefreshCw } from "lucide-react";

type PartnerCalculationStatusProps = {
  isCalculating: boolean;
  isStale: boolean;
  isCalculated: boolean;
  lastCalculatedAt: string | null;
  isOnline: boolean;
  pendingSync: boolean;
};

export function PartnerCalculationStatus({
  isCalculating,
  isStale,
  isCalculated,
  lastCalculatedAt,
  isOnline,
  pendingSync,
}: PartnerCalculationStatusProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
      {isCalculating ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-1 text-violet-800">
          <Loader2 className="size-3 animate-spin" />
          Calculating…
        </span>
      ) : null}

      {isStale && isCalculated ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-amber-900">
          <RefreshCw className="size-3" />
          Recalculate Required
        </span>
      ) : null}

      {isCalculated && !isStale && lastCalculatedAt ? (
        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-800">
          Results up to date
        </span>
      ) : null}

      {!isOnline ? (
        <span className="rounded-full bg-slate-200 px-2.5 py-1 text-slate-700">Offline</span>
      ) : null}

      {pendingSync ? (
        <span className="rounded-full bg-orange-100 px-2.5 py-1 text-orange-800">Pending Sync</span>
      ) : null}
    </div>
  );
}
