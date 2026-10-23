"use client";

import {
  Bot,
  Briefcase,
  Calculator,
  FileSpreadsheet,
  FileStack,
  FileText,
  History,
  Home,
  Layers3,
  ListTree,
  MoreHorizontal,
  Package,
  Ruler,
  Settings,
  Sparkles,
  Table2,
} from "lucide-react";

import { isNativeApp } from "@/lib/capacitor/platform";
import {
  canAccessAppTab,
  canAccessHomeModule,
} from "@/lib/dashboard/module-access";
import { canUseAiAssistant } from "@/lib/assistant";
import { getCurrentUserRole } from "@/lib/jobs/permissions";

import { cn } from "@/lib/utils";

import { getMobileBottomNavItems, type BottomNavId } from "./dashboard-config";

const ICONS = {
  home: Home,
  jobs: Briefcase,
  cutting: Ruler,
  "quick-quote": Table2,
  material: Package,
  "material-details": ListTree,
  profiles: Layers3,
  quotation: FileText,
  documents: FileStack,
  more: MoreHorizontal,
} as const;

export type MoreMenuItem = {
  tab: string;
  label: string;
  icon: typeof Sparkles;
  action?: "assistant";
};

export function getMoreMenuItems(): MoreMenuItem[] {
  if (isNativeApp()) return [];

  const role = getCurrentUserRole();
  const items: MoreMenuItem[] = [];

  if (canAccessHomeModule("workshop-cost", role)) {
    items.push({ tab: "estimation", label: "Workshop Cost", icon: Calculator });
  }
  if (canAccessAppTab("material-required", role)) {
    items.push({ tab: "material-required", label: "Material Required", icon: Package });
  }
  if (canAccessHomeModule("estimate", role)) {
    items.push({ tab: "estimate", label: "Estimate", icon: FileSpreadsheet });
  }
  if (canAccessAppTab("quotation", role)) {
    items.push({ tab: "quotation", label: "Quotation", icon: FileText });
  }
  if (canAccessHomeModule("documents", role)) {
    items.push({ tab: "documents", label: "Documents", icon: FileStack });
  }
  if (canAccessHomeModule("profiles-rates", role)) {
    items.push({ tab: "profiles", label: "Profiles & Rates", icon: Layers3 });
  }
  if (canAccessHomeModule("settings", role)) {
    items.push({ tab: "settings", label: "Settings", icon: Settings });
  }
  if (role === "admin") {
    items.push({ tab: "activity", label: "Activity", icon: History });
  }
  if (canUseAiAssistant()) {
    items.push({ tab: "partner-workspace", label: "AI Assistant", icon: Bot, action: "assistant" });
  }

  return items;
}

type MobileBottomNavigationProps = {
  activeTab: string;
  moreOpen: boolean;
  onNavigate: (tab: string) => void;
  onMoreToggle: () => void;
  onOpenAssistant?: () => void;
};

function resolveActiveNav(activeTab: string, moreOpen: boolean): BottomNavId {
  if (moreOpen) return "more";
  if (activeTab === "quick-quote") return "quick-quote";
  if (activeTab === "material-details") return "material-details";
  if (activeTab === "profiles") return "profiles";
  if (
    activeTab === "home" ||
    activeTab === "partner-workspace" ||
    activeTab === "estimate" ||
    activeTab === "estimation" ||
    activeTab === "settings" ||
    activeTab === "activity"
  ) {
    return "home";
  }
  if (activeTab === "job" || activeTab === "job-list") return "jobs";
  if (activeTab === "calculator") return "cutting";
  if (activeTab === "material-required") return "material";
  if (activeTab === "quotation") return "quotation";
  if (activeTab === "documents") return "documents";
  return "home";
}

export function MobileBottomNavigation({
  activeTab,
  moreOpen,
  onNavigate,
  onMoreToggle,
}: MobileBottomNavigationProps) {
  const activeNav = resolveActiveNav(activeTab, moreOpen);
  const role = getCurrentUserRole();
  const bottomNavItems = getMobileBottomNavItems(role);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_24px_-4px_rgba(15,23,42,0.1)] backdrop-blur-lg md:hidden"
      aria-label="Main navigation"
    >
      <div className="mx-auto flex max-w-lg items-end justify-around gap-0.5 px-2 pt-1.5">
        {bottomNavItems.map(({ id, label, tab, prominent }) => {
          const Icon = ICONS[id];
          const active = activeNav === id;
          const isHome = id === "home";

          return (
            <button
              key={id}
              type="button"
              onClick={() => {
                if (id === "more") {
                  onMoreToggle();
                  return;
                }
                onNavigate(tab);
              }}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-[52px] min-w-[56px] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-2 text-[10px] font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500",
                active
                  ? isHome
                    ? "text-violet-700"
                    : id === "material"
                      ? "text-indigo-600"
                      : "text-orange-600"
                  : "text-slate-500",
              )}
            >
              <span
                className={cn(
                  "flex items-center justify-center rounded-full transition-all",
                  isHome && prominent
                    ? cn(
                        "size-11 -mt-3 shadow-md ring-4 ring-white",
                        active
                          ? "bg-gradient-to-br from-orange-500 via-pink-500 to-violet-600 text-white"
                          : "bg-gradient-to-br from-orange-400 via-pink-400 to-violet-500 text-white",
                      )
                    : "size-6",
                )}
              >
                <Icon className="size-5" strokeWidth={2} />
              </span>
              <span className="leading-none">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

type MoreMenuSheetProps = {
  open: boolean;
  onClose: () => void;
  onNavigate: (tab: string) => void;
  onOpenAssistant?: () => void;
};

export function MoreMenuSheet({
  open,
  onClose,
  onNavigate,
  onOpenAssistant,
}: MoreMenuSheetProps) {
  if (!open) return null;
  const items = getMoreMenuItems();

  return (
    <>
      <button
        type="button"
        aria-label="Close menu"
        className="fixed inset-0 z-50 bg-slate-900/40 md:hidden"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="More modules"
        className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-50 mx-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl md:hidden"
      >
        <p className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-slate-500">
          More modules
        </p>
        <div className="grid grid-cols-2 gap-2">
          {items.map(({ tab, label, icon: Icon, action }) => (
            <button
              key={`${tab}-${label}`}
              type="button"
              onClick={() => {
                if (action === "assistant") {
                  onOpenAssistant?.();
                } else if (canAccessAppTab(tab, getCurrentUserRole())) {
                  onNavigate(tab);
                }
                onClose();
              }}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-left text-sm font-semibold text-slate-800 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
            >
              <Icon className="size-4 shrink-0 text-violet-600" strokeWidth={2} />
              {label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
