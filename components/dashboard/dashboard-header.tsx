"use client";

import { Menu, UserCircle2, Wifi, WifiOff } from "lucide-react";

import { ShivshaktiLogo } from "@/components/brand/shivshakti-logo";
import { COMPANY_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

type DashboardHeaderProps = {
  isOnline: boolean;
  onMenuClick?: () => void;
  onProfileClick?: () => void;
};

export function DashboardHeader({
  isOnline,
  onMenuClick,
  onProfileClick,
}: DashboardHeaderProps) {
  return (
    <header className="shivshakti-gradient-header relative overflow-hidden px-4 pb-3.5 pt-2.5 text-white shadow-md">
      <div className="mx-auto flex max-w-5xl items-start justify-between gap-2">
        <button
          type="button"
          onClick={onProfileClick}
          className="mt-0.5 rounded-full p-1 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
          aria-label="Profile and settings"
        >
          <UserCircle2 className="size-7" strokeWidth={1.75} />
        </button>

        <div className="flex min-w-0 flex-1 flex-col items-center gap-0.5 text-center">
          <div className="rounded-xl bg-white px-1.5 py-1 shadow-md ring-1 ring-white/30">
            <ShivshaktiLogo size={46} />
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-white/90">
            {COMPANY_NAME}
          </p>
          <h1 className="text-[13px] font-bold leading-tight md:text-sm">
            UPVC Cutting, Estimation &amp; Quotation
          </h1>
          <p className="text-[10px] leading-tight text-white/85">
            Windows, Doors and Workshop Management
          </p>
        </div>

        <button
          type="button"
          onClick={onMenuClick}
          className="mt-0.5 rounded-full p-1 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
          aria-label="Open menu"
        >
          <Menu className="size-7" strokeWidth={1.75} />
        </button>
      </div>

      <div className="mx-auto mt-2 flex max-w-5xl justify-center">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold",
            isOnline ? "bg-emerald-500/20 text-emerald-50" : "bg-amber-500/25 text-amber-50",
          )}
        >
          {isOnline ? (
            <Wifi className="size-3" aria-hidden />
          ) : (
            <WifiOff className="size-3" aria-hidden />
          )}
          {isOnline ? "Online · Auto-save" : "Offline · Saved locally"}
        </span>
      </div>
    </header>
  );
}
