import type { DashboardActionId } from "@/components/dashboard/dashboard-config";

import type { ModuleMenuId, ModuleNavParams } from "./types";

export type AppNavigationState = {
  moduleMenu: ModuleMenuId | null;
  returnMenu: ModuleMenuId | null;
  navParams: ModuleNavParams;
};

export const INITIAL_APP_NAVIGATION: AppNavigationState = {
  moduleMenu: null,
  returnMenu: null,
  navParams: {},
};

const DASHBOARD_TO_MODULE_MENU: Partial<Record<DashboardActionId, ModuleMenuId>> = {
  summary: "summary",
  "cutting-sheet": "cutting",
  "workshop-cost": "workshop-cost",
  quotation: "quotation",
  estimate: "quotation",
  documents: "documents",
  "profiles-rates": "profiles",
  profiles: "profiles",
  settings: "settings",
  "company-settings": "settings",
};

export function dashboardActionToModuleMenu(
  action: DashboardActionId,
): ModuleMenuId | null {
  return DASHBOARD_TO_MODULE_MENU[action] ?? null;
}

export function openModuleMenu(
  menuId: ModuleMenuId,
  current: AppNavigationState,
): AppNavigationState {
  return {
    ...current,
    moduleMenu: menuId,
    returnMenu: null,
    navParams: {},
  };
}

export function closeModuleMenu(current: AppNavigationState): AppNavigationState {
  return {
    ...current,
    moduleMenu: null,
    navParams: {},
  };
}

export function navigateFromModuleAction(
  menuId: ModuleMenuId,
  params: ModuleNavParams,
  current: AppNavigationState,
): AppNavigationState {
  return {
    moduleMenu: null,
    returnMenu: menuId,
    navParams: params,
  };
}

/** Tab value for a module menu when opening a section directly. */
export const MODULE_MENU_TAB: Record<ModuleMenuId, string> = {
  summary: "summary",
  cutting: "calculator",
  "workshop-cost": "estimation",
  quotation: "quotation",
  jobs: "job-list",
  profiles: "profiles",
  documents: "documents",
  settings: "settings",
};

export function backToModuleMenu(current: AppNavigationState): AppNavigationState {
  if (!current.returnMenu) {
    return { ...INITIAL_APP_NAVIGATION };
  }
  return {
    moduleMenu: current.returnMenu,
    returnMenu: null,
    navParams: {},
  };
}
