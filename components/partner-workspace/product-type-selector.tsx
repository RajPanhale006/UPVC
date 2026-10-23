"use client";

import { cn } from "@/lib/utils";
import type { PartnerProductType } from "@/lib/partner-workspace";
import { DoorOpen, LayoutGrid, PanelsTopLeft } from "lucide-react";

const OPTIONS: {
  id: PartnerProductType;
  title: string;
  helper: string;
  icon: typeof PanelsTopLeft;
  cardBg: string;
  cardBorder: string;
  iconRing: string;
  iconColor: string;
}[] = [
  {
    id: "window",
    title: "Window",
    helper: "Sliding UPVC window",
    icon: PanelsTopLeft,
    cardBg: "bg-[#FFE8DC]",
    cardBorder: "border-orange-100",
    iconRing: "ring-orange-200",
    iconColor: "text-orange-600",
  },
  {
    id: "single-door",
    title: "Single Door",
    helper: "Casement single leaf",
    icon: DoorOpen,
    cardBg: "bg-[#EDE8F5]",
    cardBorder: "border-violet-100",
    iconRing: "ring-violet-200",
    iconColor: "text-violet-600",
  },
  {
    id: "double-door",
    title: "Double Door",
    helper: "Two-leaf casement door",
    icon: DoorOpen,
    cardBg: "bg-[#E0E7FF]",
    cardBorder: "border-indigo-100",
    iconRing: "ring-indigo-200",
    iconColor: "text-indigo-600",
  },
  {
    id: "fixed-frame",
    title: "Fixed Frame",
    helper: "Fixed UPVC partition",
    icon: LayoutGrid,
    cardBg: "bg-[#E8F5E9]",
    cardBorder: "border-emerald-100",
    iconRing: "ring-emerald-200",
    iconColor: "text-emerald-700",
  },
];

type ProductTypeSelectorProps = {
  value: PartnerProductType;
  onChange: (type: PartnerProductType) => void;
};

export function ProductTypeSelector({ value, onChange }: ProductTypeSelectorProps) {
  return (
    <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2 min-[640px]:grid-cols-4">
      {OPTIONS.map((option) => {
        const Icon = option.icon;
        const selected = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={cn(
              "relative flex flex-col items-center rounded-2xl border px-3 pb-4 pt-9 text-center transition-all",
              "active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500",
              option.cardBg,
              option.cardBorder,
              selected ? "shadow-md ring-2 ring-violet-400" : "shadow-sm",
            )}
          >
            <span
              className={cn(
                "absolute left-1/2 top-0 flex size-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-md ring-4",
                option.iconRing,
              )}
            >
              <Icon className={cn("size-7", option.iconColor)} strokeWidth={2} />
            </span>
            <span className="text-sm font-bold text-slate-900">{option.title}</span>
            <span className="mt-0.5 text-[11px] text-slate-600">{option.helper}</span>
          </button>
        );
      })}
    </div>
  );
}
