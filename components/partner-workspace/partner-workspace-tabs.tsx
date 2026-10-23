"use client";

import { cn } from "@/lib/utils";

export type PartnerWorkspaceMode = "product" | "estimate";

type PartnerWorkspaceTabsProps = {
  mode: PartnerWorkspaceMode;
  onChange: (mode: PartnerWorkspaceMode) => void;
  productCount: number;
};

export function PartnerWorkspaceTabs({
  mode,
  onChange,
  productCount,
}: PartnerWorkspaceTabsProps) {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-2">
      <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
        <button
          type="button"
          onClick={() => onChange("product")}
          className={cn(
            "flex-1 rounded-lg px-3 py-2.5 text-sm font-semibold transition",
            mode === "product"
              ? "bg-violet-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-50",
          )}
        >
          Product Entry
        </button>
        <button
          type="button"
          onClick={() => onChange("estimate")}
          className={cn(
            "flex-1 rounded-lg px-3 py-2.5 text-sm font-semibold transition",
            mode === "estimate"
              ? "bg-violet-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-50",
          )}
        >
          Project Estimate
          {productCount > 0 ? (
            <span
              className={cn(
                "ml-1.5 inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1 text-[10px]",
                mode === "estimate" ? "bg-white/20" : "bg-violet-100 text-violet-700",
              )}
            >
              {productCount}
            </span>
          ) : null}
        </button>
      </div>
    </div>
  );
}
