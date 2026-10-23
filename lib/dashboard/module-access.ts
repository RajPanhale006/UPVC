import type { DashboardActionId } from "@/components/dashboard/dashboard-config";
import { isNativeApp } from "@/lib/capacitor/platform";
import type { UserRole } from "@/lib/jobs/permissions";
import {
  canEditQuotation,
  canViewInternalRates,
  canViewLabourSheets,
  getCurrentUserRole,
} from "@/lib/jobs/permissions";

/** Modules shown in the Capacitor mobile app — web keeps the full set. */
export const NATIVE_MOBILE_MODULES: HomeModuleId[] = [
  "quick-quote",
  "cutting-sheet",
  "material-details",
  "profiles-rates",
];

const NATIVE_MOBILE_TABS = new Set([
  "home",
  "quick-quote",
  "calculator",
  "material-details",
  "profiles",
]);

/** Home dashboard module identifiers — maps to DashboardActionId. */
export type HomeModuleId = Extract<
  DashboardActionId,
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
>;

export const HOME_MODULE_ORDER: HomeModuleId[] = [
  "quick-quote",
  "material-details",
  "smart-estimation",
  "cutting-sheet",
  "workshop-cost",
  "material-required",
  "estimate",
  "quotation",
  "documents",
  "profiles-rates",
  "settings",
];

function roleCanAccessHomeModule(
  moduleId: HomeModuleId,
  role: UserRole,
): boolean {
  switch (moduleId) {
    case "smart-estimation":
      return role === "admin" || role === "manager" || role === "sales" || role === "workshop";
    case "cutting-sheet":
      return canViewLabourSheets(role);
    case "workshop-cost":
      return canViewInternalRates(role);
    case "material-required":
      return canViewInternalRates(role);
    case "estimate":
      return role === "admin" || role === "manager" || role === "sales";
    case "quick-quote":
      return role === "admin" || role === "manager" || role === "sales";
    case "material-details":
      return canViewInternalRates(role);
    case "quotation":
      return canEditQuotation(role);
    case "documents":
      return true;
    case "profiles-rates":
      return role === "admin" || role === "manager";
    case "settings":
      return role === "admin" || role === "manager";
    default:
      return false;
  }
}

export function canAccessHomeModule(
  moduleId: HomeModuleId,
  role: UserRole = getCurrentUserRole(),
): boolean {
  if (isNativeApp() && !NATIVE_MOBILE_MODULES.includes(moduleId)) {
    return false;
  }
  return roleCanAccessHomeModule(moduleId, role);
}

/** App tab values used by WorkshopApp — enforce role access on navigation. */
export function canAccessAppTab(tab: string, role: UserRole = getCurrentUserRole()): boolean {
  if (isNativeApp() && !NATIVE_MOBILE_TABS.has(tab)) {
    return false;
  }

  switch (tab) {
    case "home":
    case "job":
    case "job-list":
      return true;
    case "partner-workspace":
      return canAccessHomeModule("smart-estimation", role);
    case "calculator":
      return canAccessHomeModule("cutting-sheet", role);
    case "estimation":
      return canAccessHomeModule("workshop-cost", role);
    case "material-required":
      return canViewInternalRates(role);
    case "estimate":
      return canAccessHomeModule("estimate", role);
    case "quick-quote":
      return canAccessHomeModule("quick-quote", role);
    case "material-details":
      return canViewInternalRates(role);
    case "quotation":
      return canAccessHomeModule("quotation", role);
    case "documents":
    case "activity":
      return canAccessHomeModule("documents", role);
    case "profiles":
      return canAccessHomeModule("profiles-rates", role);
    case "settings":
      return canAccessHomeModule("settings", role);
    case "summary":
      return role === "admin";
    default:
      return true;
  }
}

export function dashboardActionToTab(action: DashboardActionId): string | null {
  switch (action) {
    case "smart-estimation":
      return "partner-workspace";
    case "cutting-sheet":
      return "calculator";
    case "workshop-cost":
      return "estimation";
    case "material-required":
      return "material-required";
    case "estimate":
      return "estimate";
    case "quick-quote":
      return "quick-quote";
    case "material-details":
      return "material-details";
    case "quotation":
      return "quotation";
    case "documents":
      return "documents";
    case "profiles-rates":
    case "profiles":
      return "profiles";
    case "settings":
    case "company-settings":
      return "settings";
    default:
      return null;
  }
}

export function isHomeModuleAction(action: DashboardActionId): action is HomeModuleId {
  return HOME_MODULE_ORDER.includes(action as HomeModuleId);
}
