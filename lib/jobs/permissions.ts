/** Client-side role flags — no server auth in this offline app. */

export type UserRole = "admin" | "manager" | "workshop" | "sales";

const ROLE_KEY = "upvc-workshop-user-role";
const USER_NAME_KEY = "upvc-workshop-user-name";

export function getCurrentUserRole(): UserRole {
  if (typeof window === "undefined") return "admin";
  const raw = window.localStorage.getItem(ROLE_KEY);
  if (raw === "admin" || raw === "manager" || raw === "workshop" || raw === "sales") {
    return raw;
  }
  return "admin";
}

export function setCurrentUserRole(role: UserRole): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ROLE_KEY, role);
}

export function getCurrentUserName(): string {
  if (typeof window === "undefined") return "Workshop User";
  return window.localStorage.getItem(USER_NAME_KEY)?.trim() || "Workshop User";
}

export function setCurrentUserName(name: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(USER_NAME_KEY, name.trim());
}

export function canEditCompanySettings(role: UserRole = getCurrentUserRole()): boolean {
  return role === "admin";
}

export function canEditQuotation(role: UserRole = getCurrentUserRole()): boolean {
  return role === "admin" || role === "manager" || role === "sales";
}

export function canSendQuotation(role: UserRole = getCurrentUserRole()): boolean {
  return role === "admin" || role === "manager" || role === "sales";
}

export function canFinalizeDocuments(role: UserRole = getCurrentUserRole()): boolean {
  return role === "admin" || role === "manager";
}

export function canViewInternalRates(role: UserRole = getCurrentUserRole()): boolean {
  return role !== "workshop" && role !== "sales";
}

export function canViewLabourSheets(role: UserRole = getCurrentUserRole()): boolean {
  return role === "admin" || role === "manager" || role === "workshop";
}

export function canShareCustomerDocuments(role: UserRole = getCurrentUserRole()): boolean {
  return role === "admin" || role === "manager" || role === "sales";
}

export function canDeleteDocuments(role: UserRole = getCurrentUserRole()): boolean {
  return role === "admin";
}

export function canArchiveDocuments(role: UserRole = getCurrentUserRole()): boolean {
  return role === "admin" || role === "manager";
}

/** Partner role — simplified one-screen Summary workflow. */
export function usesPartnerWorkspace(role: UserRole = getCurrentUserRole()): boolean {
  return role === "manager";
}

/** Partner/Manager simplified Summary flow — Smart Estimation Center + Documents only. */
export function usesPartnerSummaryFlow(role: UserRole = getCurrentUserRole()): boolean {
  return role === "manager";
}

/** Partner / Manager dashboard — Summary-first layout with cost overview emphasis. */
export function usesSummaryFirstDashboard(role: UserRole = getCurrentUserRole()): boolean {
  return role === "admin" || role === "manager";
}
