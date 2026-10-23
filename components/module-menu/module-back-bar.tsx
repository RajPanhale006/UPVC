"use client";

import { ArrowLeft, Home } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ModuleMenuId } from "@/lib/module-menu";
import { getModuleMenu } from "@/lib/module-menu";

type ModuleBackBarProps = {
  returnMenu: ModuleMenuId;
  onBackToMenu: () => void;
  onBackToHome: () => void;
  className?: string;
};

export function ModuleBackBar({
  returnMenu,
  onBackToMenu,
  onBackToHome,
  className,
}: ModuleBackBarProps) {
  const menu = getModuleMenu(returnMenu);

  return (
    <div
      className={cn(
        "sticky top-0 z-30 flex flex-wrap items-center gap-2 border-b border-slate-200/80 bg-[#f4f7fc]/95 px-4 py-2.5 backdrop-blur-md",
        className,
      )}
    >
      <button
        type="button"
        onClick={onBackToMenu}
        className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {menu.title} Menu
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
  );
}
