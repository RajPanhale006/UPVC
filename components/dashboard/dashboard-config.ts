import type { LucideIcon } from "lucide-react";
import {
  Calculator,
  FileSpreadsheet,
  FileStack,
  FileText,
  FolderOpen,
  Layers3,
  ListTree,
  Package,
  Ruler,
  Settings,
  Sparkles,
  Table2,
} from "lucide-react";

import {
  canAccessAppTab,
  canAccessHomeModule,
  HOME_MODULE_ORDER,
  type HomeModuleId,
} from "@/lib/dashboard/module-access";
import { isNativeApp } from "@/lib/capacitor/platform";
import type { UserRole } from "@/lib/jobs/permissions";

export type DashboardActionId =
  | "smart-estimation"
  | "cutting-sheet"
  | "workshop-cost"
  | "material-required"
  | "estimate"
  | "quick-quote"
  | "material-details"
  | "quotation"
  | "documents"
  | "profiles-rates"
  | "settings"
  /** Legacy aliases — routed same as modern ids */
  | "profiles"
  | "company-settings"
  | "summary"
  | "new-window"
  | "new-door"
  | "saved-jobs";

export type QuickActionPriority = "primary" | "secondary" | "grid" | "footer" | "default";

export type QuickActionConfig = {
  id: DashboardActionId;
  title: string;
  helper: string;
  icon: LucideIcon;
  iconRing: string;
  iconColor: string;
  cardBg: string;
  cardBorder: string;
};

export type QuickActionDisplay = QuickActionConfig & {
  priority: QuickActionPriority;
  recommended?: boolean;
  spanFull?: boolean;
};

const MODULE_CONFIG: Record<HomeModuleId, QuickActionConfig> = {
  "smart-estimation": {
    id: "smart-estimation",
    title: "Smart Estimation Center",
    helper:
      "Enter Window, Single Door or Double Door sizes and get cutting, costing and customer pricing in one place.",
    icon: Sparkles,
    iconRing: "ring-violet-200",
    iconColor: "text-violet-700",
    cardBg: "bg-[#EDE9FE]",
    cardBorder: "border-violet-100",
  },
  "cutting-sheet": {
    id: "cutting-sheet",
    title: "Cutting Sheet",
    helper: "Labour cutting sizes and technical production details.",
    icon: Ruler,
    iconRing: "ring-sky-200",
    iconColor: "text-sky-600",
    cardBg: "bg-[#E0F2FE]",
    cardBorder: "border-sky-100",
  },
  "workshop-cost": {
    id: "workshop-cost",
    title: "Workshop Cost",
    helper: "Internal manufacturing cost, margin and customer pricing.",
    icon: Calculator,
    iconRing: "ring-amber-200",
    iconColor: "text-amber-700",
    cardBg: "bg-[#FEF3C7]",
    cardBorder: "border-amber-100",
  },
  "material-required": {
    id: "material-required",
    title: "Material Required",
    helper: "Whole-job purchase requirement from the bar optimizer.",
    icon: Package,
    iconRing: "ring-indigo-200",
    iconColor: "text-indigo-600",
    cardBg: "bg-[#EEF2FF]",
    cardBorder: "border-indigo-100",
  },
  estimate: {
    id: "estimate",
    title: "Estimate",
    helper: "Create preliminary customer estimates from calculated products.",
    icon: FileSpreadsheet,
    iconRing: "ring-emerald-200",
    iconColor: "text-emerald-700",
    cardBg: "bg-[#DCFCE7]",
    cardBorder: "border-emerald-100",
  },
  "quick-quote": {
    id: "quick-quote",
    title: "Quick Quote Sheet",
    helper: "Add sizes and track types in a sheet — get workshop cost and customer rate instantly.",
    icon: Table2,
    iconRing: "ring-blue-200",
    iconColor: "text-blue-700",
    cardBg: "bg-[#DBEAFE]",
    cardBorder: "border-blue-100",
  },
  "material-details": {
    id: "material-details",
    title: "Material Details",
    helper: "Full material list with rates — profiles, glass, mesh, hardware, labour per window.",
    icon: ListTree,
    iconRing: "ring-violet-200",
    iconColor: "text-violet-700",
    cardBg: "bg-[#EDE9FE]",
    cardBorder: "border-violet-100",
  },
  quotation: {
    id: "quotation",
    title: "Quotation",
    helper: "Create, revise and share final customer quotations.",
    icon: FileText,
    iconRing: "ring-pink-200",
    iconColor: "text-pink-600",
    cardBg: "bg-[#FCE7F3]",
    cardBorder: "border-pink-100",
  },
  documents: {
    id: "documents",
    title: "Documents",
    helper: "View PDFs, estimates, quotations and job revisions.",
    icon: FolderOpen,
    iconRing: "ring-indigo-200",
    iconColor: "text-indigo-600",
    cardBg: "bg-[#E0E7FF]",
    cardBorder: "border-indigo-100",
  },
  "profiles-rates": {
    id: "profiles-rates",
    title: "Profiles & Rates",
    helper: "Manage profiles, materials, hardware and purchase rates.",
    icon: Layers3,
    iconRing: "ring-teal-200",
    iconColor: "text-teal-700",
    cardBg: "bg-[#CCFBF1]",
    cardBorder: "border-teal-100",
  },
  settings: {
    id: "settings",
    title: "Settings",
    helper: "Manage company, users, taxes, costing and document preferences.",
    icon: Settings,
    iconRing: "ring-slate-200",
    iconColor: "text-slate-600",
    cardBg: "bg-[#F1F5F9]",
    cardBorder: "border-slate-200",
  },
};

export function getHomeModulesForRole(role: UserRole = "admin"): QuickActionDisplay[] {
  return HOME_MODULE_ORDER.filter((id) => canAccessHomeModule(id, role)).map((id) => {
    const config = MODULE_CONFIG[id];
    if (id === "quick-quote") {
      return {
        ...config,
        priority: "primary" as const,
        recommended: true,
        spanFull: true,
      };
    }
    if (id === "smart-estimation") {
      return {
        ...config,
        priority: "primary" as const,
        recommended: true,
        spanFull: true,
      };
    }
    if (id === "settings") {
      return { ...config, priority: "footer" as const, spanFull: true };
    }
    return { ...config, priority: "grid" as const };
  });
}

/** @deprecated Use getHomeModulesForRole */
export function getQuickActionsForRole(role: UserRole = "admin"): QuickActionDisplay[] {
  return getHomeModulesForRole(role);
}

export type BottomNavId =
  | "home"
  | "jobs"
  | "cutting"
  | "quick-quote"
  | "material"
  | "material-details"
  | "profiles"
  | "quotation"
  | "documents"
  | "more";

const CORE_BOTTOM_NAV_ITEMS = [
  { id: "jobs" as const, label: "Jobs", tab: "job", prominent: false as const },
  { id: "cutting" as const, label: "Cutting", tab: "calculator", prominent: false as const },
  { id: "home" as const, label: "Home", tab: "home", prominent: true as const },
];

type MobileBottomNavItem = {
  id: BottomNavId;
  label: string;
  tab: string;
  prominent?: boolean;
};

/** Role-aware 4th bottom-nav slot — Material Required on mobile for purchase/store roles. */
export function getMobileBottomNavItems(role: UserRole = "admin"): MobileBottomNavItem[] {
  if (isNativeApp()) {
    const nativeSlots: Array<{ id: BottomNavId; label: string; tab: string; module: HomeModuleId }> =
      [
        { id: "quick-quote", label: "Quote", tab: "quick-quote", module: "quick-quote" },
        { id: "cutting", label: "Cutting", tab: "calculator", module: "cutting-sheet" },
        { id: "material-details", label: "Material", tab: "material-details", module: "material-details" },
        { id: "profiles", label: "Rates", tab: "profiles", module: "profiles-rates" },
      ];

    const items: MobileBottomNavItem[] = [];
    for (const slot of nativeSlots) {
      if (canAccessHomeModule(slot.module, role)) {
        items.push({ id: slot.id, label: slot.label, tab: slot.tab });
      }
    }

    return [
      ...items.slice(0, 2),
      { id: "home", label: "Home", tab: "home", prominent: true },
      ...items.slice(2),
    ];
  }

  const trailing: MobileBottomNavItem = { id: "more", label: "More", tab: "more" };

  if (canAccessAppTab("material-required", role)) {
    return [
      ...CORE_BOTTOM_NAV_ITEMS,
      { id: "material", label: "Material", tab: "material-required" },
      trailing,
    ];
  }

  if (canAccessAppTab("quotation", role)) {
    return [
      ...CORE_BOTTOM_NAV_ITEMS,
      { id: "quotation", label: "Quotation", tab: "quotation" },
      trailing,
    ];
  }

  return [
    ...CORE_BOTTOM_NAV_ITEMS,
    { id: "documents", label: "Docs", tab: "documents" },
    trailing,
  ];
}

/** @deprecated Use getMobileBottomNavItems — kept for type references. */
export const BOTTOM_NAV_ITEMS = getMobileBottomNavItems();
