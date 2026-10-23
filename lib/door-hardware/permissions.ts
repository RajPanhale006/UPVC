import {
  getCurrentUserRole,
  type UserRole,
} from "@/lib/jobs/permissions";

export function canEditDoorHardwareMaster(role: UserRole = getCurrentUserRole()): boolean {
  return role === "admin";
}

export function canViewDoorHardwareRates(role: UserRole = getCurrentUserRole()): boolean {
  return role === "admin" || role === "manager";
}

export function canViewDoorHardwareCostTotal(role: UserRole = getCurrentUserRole()): boolean {
  return role === "admin" || role === "manager";
}

/** Names and quantities only — no unit rates or line totals. */
export function canViewDoorHardwareDetails(role: UserRole = getCurrentUserRole()): boolean {
  return role === "admin" || role === "manager" || role === "workshop";
}

export function canApplyDoorHardwareJobOverride(role: UserRole = getCurrentUserRole()): boolean {
  return role === "admin" || role === "manager";
}

export function canViewDoorHardwareCustomerDescriptions(
  role: UserRole = getCurrentUserRole(),
): boolean {
  return role === "admin" || role === "manager" || role === "sales";
}
