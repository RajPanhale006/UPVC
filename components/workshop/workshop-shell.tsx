"use client";

import type { LucideIcon } from "lucide-react";
import {
  Briefcase,
  Calculator,
  ClipboardList,
  FileStack,
  FileText,
  History,
  Home,
  Layers,
  ListTree,
  Package,
  Ruler,
  Settings,
  Table2,
  WifiOff,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import {
  MobileBottomNavigation,
  MoreMenuSheet,
} from "@/components/dashboard/mobile-bottom-navigation";
import { ShivshaktiLogo } from "@/components/brand/shivshakti-logo";
import { PRODUCT_NAME, PRODUCT_TAGLINE } from "@/lib/brand";
import { canAccessAppTab } from "@/lib/dashboard/module-access";
import { getCurrentUserRole } from "@/lib/jobs/permissions";
import { cn } from "@/lib/utils";

export const SHELL_NAV = [
  { value: "home", label: "Home", icon: Home },
  { value: "job", label: "Job", icon: Briefcase },
  { value: "calculator", label: "Cutting", icon: Ruler },
  { value: "summary", label: "Summary", icon: ClipboardList },
  { value: "quick-quote", label: "Quick Quote", icon: Table2 },
  { value: "material-details", label: "Material Details", icon: ListTree },
  { value: "estimation", label: "Estimate", icon: Calculator },
  { value: "material-required", label: "Material Required", icon: Package },
  { value: "quotation", label: "Quotation", icon: FileText },
  { value: "documents", label: "Documents", icon: FileStack },
  { value: "activity", label: "Activity", icon: History },
  { value: "profiles", label: "Profiles", icon: Layers },
  { value: "settings", label: "Settings", icon: Settings },
] as const;

type WorkshopShellProps = {
  activeTab: string;
  onTabChange: (tab: string) => void;
  trackLabel: string;
  profileCode: string;
  jobName: string;
  jobId?: string;
  customerName?: string;
  children: ReactNode;
  visualizer?: ReactNode;
  onOpenAssistant?: () => void;
};

function SidebarItem({
  active,
  label,
  icon: Icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all duration-200",
        active
          ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-900/30"
          : "text-slate-400 hover:bg-white/5 hover:text-white",
      )}
    >
      <Icon
        className={cn(
          "size-[18px] shrink-0",
          active ? "text-white" : "text-slate-500 group-hover:text-slate-300",
        )}
        strokeWidth={2}
      />
      {label}
    </button>
  );
}

export function WorkshopShell({
  activeTab,
  onTabChange,
  trackLabel,
  profileCode,
  jobName,
  jobId,
  customerName,
  children,
  visualizer,
  onOpenAssistant,
}: WorkshopShellProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const hideMobileTopBar = activeTab === "home";
  const role = getCurrentUserRole();
  const shellNav = SHELL_NAV.filter(({ value }) => canAccessAppTab(value, role));

  useEffect(() => {
    setMoreOpen(false);
  }, [activeTab]);

  function handleNavigate(tab: string) {
    setMoreOpen(false);
    onTabChange(tab);
  }

  return (
    <div className="flex min-h-full flex-col md:flex-row">
      {/* Desktop sidebar */}
      <aside className="hidden w-[260px] shrink-0 flex-col border-r border-slate-800/50 bg-[#111827] md:flex lg:w-[272px]">
        <div className="border-b border-white/5 px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white p-1 shadow-md ring-1 ring-white/10">
              <ShivshaktiLogo size={44} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold tracking-tight text-white">
                {PRODUCT_NAME}
              </p>
              <p className="truncate text-[11px] font-medium text-slate-400">
                {PRODUCT_TAGLINE}
              </p>
            </div>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
          {shellNav.map(({ value, label, icon }) => (
            <SidebarItem
              key={value}
              active={activeTab === value}
              label={label}
              icon={icon}
              onClick={() => onTabChange(value)}
            />
          ))}
        </nav>

        {visualizer ? (
          <div className="hidden border-t border-white/5 p-3 xl:block">{visualizer}</div>
        ) : null}

        <div className="border-t border-white/5 px-4 py-4">
          <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-400">
            <WifiOff className="size-3.5" />
            Offline · Auto-save
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar — hidden on mobile home (dashboard has its own header) */}
        <header
          className={cn(
            "sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl",
            hideMobileTopBar && "hidden md:block",
          )}
        >
          <div className="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between md:px-6 md:py-4">
            <div className="min-w-0 md:hidden">
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                {PRODUCT_NAME}
              </p>
              <p className="truncate text-base font-semibold text-slate-900">{jobName}</p>
            </div>

            <div className="hidden min-w-0 md:block">
              <p className="text-xs font-medium text-slate-500">Current job</p>
              <p className="truncate text-lg font-semibold tracking-tight text-slate-900">
                {jobName}
              </p>
              {jobId ? (
                <p className="truncate text-xs font-medium text-blue-600">{jobId}</p>
              ) : null}
              {customerName ? (
                <p className="truncate text-sm text-slate-500">{customerName}</p>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
                {trackLabel}
              </span>
              <span className="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                {profileCode}
              </span>
              <span className="hidden items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 sm:flex">
                <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
                Synced locally
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 pb-24 md:pb-0">{children}</main>

        <MoreMenuSheet
          open={moreOpen}
          onClose={() => setMoreOpen(false)}
          onNavigate={handleNavigate}
          onOpenAssistant={() => {
            onOpenAssistant?.();
            setMoreOpen(false);
          }}
        />

        <MobileBottomNavigation
          activeTab={activeTab}
          moreOpen={moreOpen}
          onNavigate={handleNavigate}
          onMoreToggle={() => setMoreOpen((open) => !open)}
        />
      </div>
    </div>
  );
}
