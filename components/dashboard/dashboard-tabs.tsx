"use client";

import { cn } from "@/lib/utils";

export type DashboardTabId = "quick-actions" | "jobs-documents";

type DashboardTabsProps = {
  active: DashboardTabId;
  onChange: (tab: DashboardTabId) => void;
};

export function DashboardTabs({ active, onChange }: DashboardTabsProps) {
  return (
    <div className="mx-auto grid max-w-5xl grid-cols-2 gap-2 px-4">
      <button
        type="button"
        onClick={() => onChange("quick-actions")}
        className={cn(
          "rounded-xl px-3 py-3 text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500",
          active === "quick-actions"
            ? "bg-gradient-to-r from-orange-500 via-pink-500 to-violet-600 text-white shadow-md"
            : "border border-slate-200 bg-white text-slate-800",
        )}
      >
        Quick Actions
      </button>
      <button
        type="button"
        onClick={() => onChange("jobs-documents")}
        className={cn(
          "rounded-xl px-3 py-3 text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500",
          active === "jobs-documents"
            ? "bg-gradient-to-r from-orange-500 via-pink-500 to-violet-600 text-white shadow-md"
            : "border border-slate-200 bg-white text-slate-800",
        )}
      >
        Jobs &amp; Documents
      </button>
    </div>
  );
}
