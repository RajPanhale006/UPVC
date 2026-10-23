import type { UserRole } from "@/lib/jobs/permissions";
import {
  canEditCompanySettings,
  canEditQuotation,
  canFinalizeDocuments,
  canShareCustomerDocuments,
  canViewInternalRates,
  canViewLabourSheets,
  getCurrentUserRole,
} from "@/lib/jobs/permissions";

import type { AssistantCommand, AssistantIntent } from "./types";

export function canUseAiAssistant(role: UserRole = getCurrentUserRole()): boolean {
  return role === "admin" || role === "manager" || role === "workshop" || role === "sales";
}

export function canAiViewWorkshopCost(role: UserRole = getCurrentUserRole()): boolean {
  return role !== "workshop";
}

export function canAiViewCustomerPricing(role: UserRole = getCurrentUserRole()): boolean {
  return role !== "workshop";
}

export function canAiViewInternalRates(role: UserRole = getCurrentUserRole()): boolean {
  return canViewInternalRates(role);
}

export function canAiGenerateLabourPdf(role: UserRole = getCurrentUserRole()): boolean {
  return canViewLabourSheets(role);
}

export function canAiGenerateWorkshopPdf(role: UserRole = getCurrentUserRole()): boolean {
  return canViewInternalRates(role);
}

export function canAiAddToQuotation(role: UserRole = getCurrentUserRole()): boolean {
  return canEditQuotation(role);
}

export function canAiSaveProduct(role: UserRole = getCurrentUserRole()): boolean {
  return role === "admin" || role === "manager";
}

export function canAiShareDocuments(role: UserRole = getCurrentUserRole()): boolean {
  return canShareCustomerDocuments(role);
}

export function canAiUpdateMasterRates(role: UserRole = getCurrentUserRole()): boolean {
  return canEditCompanySettings(role);
}

export function canAiFinalizeDocuments(role: UserRole = getCurrentUserRole()): boolean {
  return canFinalizeDocuments(role);
}

const WORKSHOP_COST_QUERIES = new Set([
  "workshop-cost",
  "workshop cost",
  "total-workshop-cost",
  "profile-weight",
  "profile weight",
  "hardware-cost",
  "hardware cost",
  "margin",
  "internal-rate",
  "purchase-rate",
]);

const CUSTOMER_PRICE_QUERIES = new Set([
  "customer-rate",
  "customer rate",
  "suggested-rate",
  "suggested rate",
  "customer-base-price",
  "customer base price",
  "quote-rate",
]);

export function validateCommandPermission(
  command: AssistantCommand,
  role: UserRole = getCurrentUserRole(),
): { allowed: boolean; reason?: string } {
  if (!canUseAiAssistant(role)) {
    return { allowed: false, reason: "AI Assistant is not available for your role." };
  }

  switch (command.intent) {
    case "get-result": {
      const query = (command.resultQuery ?? "").toLowerCase();
      if (
        [...WORKSHOP_COST_QUERIES].some((k) => query.includes(k)) &&
        !canAiViewWorkshopCost(role)
      ) {
        return {
          allowed: false,
          reason: "Workshop cost details are not available for your role.",
        };
      }
      if (
        [...CUSTOMER_PRICE_QUERIES].some((k) => query.includes(k)) &&
        !canAiViewCustomerPricing(role)
      ) {
        return {
          allowed: false,
          reason: "Customer pricing is not available for your role.",
        };
      }
      if (query.includes("internal") && !canAiViewInternalRates(role)) {
        return {
          allowed: false,
          reason: "Internal purchase rates are not available for your role.",
        };
      }
      return { allowed: true };
    }
    case "save-product":
      return canAiSaveProduct(role)
        ? { allowed: true }
        : { allowed: false, reason: "You cannot save products with your role." };
    case "add-to-quotation":
      return canAiAddToQuotation(role)
        ? { allowed: true }
        : { allowed: false, reason: "You cannot add items to quotation." };
    case "generate-document": {
      const doc = (command.documentType ?? "").toLowerCase();
      if (doc.includes("labour") && !canAiGenerateLabourPdf(role)) {
        return { allowed: false, reason: "Labour PDF access is not permitted." };
      }
      if (doc.includes("workshop") && !canAiGenerateWorkshopPdf(role)) {
        return { allowed: false, reason: "Workshop cost PDF access is not permitted." };
      }
      return { allowed: true };
    }
    case "update-configuration": {
      const keys = Object.keys(command.configuration ?? {});
      if (keys.some((k) => k.includes("masterRate") || k.includes("hardwareRate"))) {
        return canAiUpdateMasterRates(role)
          ? { allowed: true }
          : {
              allowed: false,
              reason: "Master rate updates require admin confirmation.",
            };
      }
      return { allowed: true };
    }
    default:
      return { allowed: true };
  }
}

export function intentRequiresConfirmation(intent: AssistantIntent): boolean {
  return (
    intent === "save-product" ||
    intent === "add-to-quotation" ||
    intent === "generate-document"
  );
}
