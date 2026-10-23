"use client";

import { ArrowLeft, Home } from "lucide-react";

import { getModuleMenu, getSectionMeta } from "@/lib/module-menu";
import type { ModuleMenuId } from "@/lib/module-menu";
import { usesPartnerSummaryFlow } from "@/lib/jobs/permissions";
import { cn } from "@/lib/utils";

type ModuleSectionHeaderProps = {
  menuId: ModuleMenuId;
  sectionId?: string;
  onBackToMenu: () => void;
  onBackToHome: () => void;
  jobId?: string;
  className?: string;
};

export function ModuleSectionHeader({
  menuId,
  sectionId,
  onBackToMenu,
  onBackToHome,
  jobId,
  className,
}: ModuleSectionHeaderProps) {
  const menu = getModuleMenu(menuId);
  const section = getSectionMeta(menuId, sectionId);
  const partnerSummaryBack =
    usesPartnerSummaryFlow() && menuId === "summary";

  return (
    <header
      className={cn(
        "sticky top-0 z-30 border-b border-slate-200/80 bg-[#f4f7fc]/95 px-4 py-3 backdrop-blur-md",
        className,
      )}
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={partnerSummaryBack ? onBackToHome : onBackToMenu}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50"
          >
            <ArrowLeft className="size-4" aria-hidden />
            {partnerSummaryBack ? "Back to Home" : `${menu.title} Menu`}
          </button>
          <button
            type="button"
            onClick={onBackToHome}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-white/80"
          >
            <Home className="size-4" aria-hidden />
            Home
          </button>
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-900">
            {section?.title ?? menu.title}
          </h1>
          <p className="text-sm text-slate-600">
            {section?.subtitle ?? menu.subtitle}
          </p>
          {jobId ? (
            <p className="mt-0.5 text-xs text-slate-500">
              Active job: <strong className="text-slate-800">{jobId}</strong>
            </p>
          ) : null}
        </div>
      </div>
    </header>
  );
}
