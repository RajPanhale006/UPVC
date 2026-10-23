import {
  canEditCompanySettings,
  canSendQuotation,
  canShareCustomerDocuments,
  canViewInternalRates,
  canViewLabourSheets,
  type UserRole,
} from "@/lib/jobs/permissions";

import type { ModuleMenuAction, ModuleMenuId } from "./types";

export function isModuleActionVisible(
  action: ModuleMenuAction,
  role: UserRole,
): boolean {
  if (action.visibleFor) return action.visibleFor(role);
  return true;
}

export function filterModuleActions(
  actions: ModuleMenuAction[],
  role: UserRole,
): ModuleMenuAction[] {
  return actions.filter((action) => isModuleActionVisible(action, role));
}

export function canAccessModuleMenu(menuId: ModuleMenuId, role: UserRole): boolean {
  switch (menuId) {
    case "workshop-cost":
      return canViewInternalRates(role);
    case "settings":
      return true;
    case "quotation":
      return canSendQuotation(role) || role === "workshop";
    default:
      return true;
  }
}

export function isActionRecommendedForRole(
  actionId: string,
  menuId: ModuleMenuId,
  role: UserRole,
): boolean {
  if (role === "manager") {
    if (menuId === "summary" && actionId === "partner-workspace") return true;
    if (menuId === "cutting" && actionId === "window-cutting") return true;
    if (menuId === "workshop-cost" && actionId === "workshop-total") return true;
  }
  if (role === "admin") {
    if (menuId === "summary" && actionId === "partner-workspace") return true;
    if (menuId === "summary" && actionId === "complete-summary") return true;
    if (menuId === "cutting" && actionId === "window-cutting") return true;
    if (menuId === "workshop-cost" && actionId === "workshop-total") return true;
  }
  if (role === "workshop") {
    if (menuId === "cutting" && actionId === "labour-pdf") return true;
    if (menuId === "documents" && actionId === "labour-pdfs") return true;
  }
  if (role === "sales") {
    if (menuId === "quotation" && actionId === "standard-quotation") return true;
    if (menuId === "quotation" && actionId === "premium-proposal") return true;
  }
  return false;
}
