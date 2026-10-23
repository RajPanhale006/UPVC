"use client";

import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

import type { QuickActionPriority } from "./dashboard-config";

/** Shared layout tokens — keeps icon circles aligned across all cards. */
const ICON_CIRCLE =
  "absolute left-1/2 top-0 flex size-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-md ring-4";
const ICON_GLYPH = "size-7";

type QuickActionCardProps = {
  title: string;
  helper?: string;
  icon: LucideIcon;
  iconColor: string;
  iconRing: string;
  cardBg: string;
  cardBorder: string;
  priority?: QuickActionPriority;
  recommended?: boolean;
  recommendedLabel?: string;
  spanFull?: boolean;
  onClick: () => void;
};

export function QuickActionCard({
  title,
  helper,
  icon: Icon,
  iconColor,
  iconRing,
  cardBg,
  cardBorder,
  priority = "default",
  recommended = false,
  recommendedLabel,
  spanFull = false,
  onClick,
}: QuickActionCardProps) {
  const isPrimary = priority === "primary";
  const isSecondary = priority === "secondary";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={
        recommended
          ? `${title}. Recommended. ${helper ?? ""}`
          : helper
            ? `${title}. ${helper}`
            : title
      }
      className={cn(
        "group relative flex w-full flex-col items-center justify-end rounded-2xl border px-3 text-center transition-all",
        "active:scale-[0.97] md:hover:-translate-y-0.5 md:hover:shadow-md",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2",
        spanFull && "col-span-2",
        isPrimary
          ? "min-h-[148px] border-emerald-300/80 pb-3.5 pt-9 shadow-md ring-2 ring-emerald-200/70"
          : isSecondary
            ? "min-h-[128px] border-slate-300/80 pb-3.5 pt-9 shadow-md ring-1 ring-slate-200/80"
            : "min-h-[128px] pb-3.5 pt-9 shadow-sm",
        cardBg,
        cardBorder,
      )}
    >
      {recommended ? (
        <span className="absolute right-2.5 top-2.5 z-10 rounded-full bg-gradient-to-r from-orange-500 via-pink-500 to-violet-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
          {recommendedLabel ?? "Recommended"}
        </span>
      ) : null}

      <span className={cn(ICON_CIRCLE, iconRing)}>
        <Icon className={cn(ICON_GLYPH, iconColor)} strokeWidth={2} aria-hidden />
      </span>

      <span className="mt-1 text-sm font-bold leading-tight text-slate-900">{title}</span>
      {helper ? (
        <span className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-slate-600">
          {helper}
        </span>
      ) : null}
    </button>
  );
}
