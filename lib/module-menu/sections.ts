import { MODULE_MENUS } from "./menus";
import type { ModuleMenuId } from "./types";

/** Section ids that intentionally show consolidated / multi-block content. */
export const COMPLETE_MODULE_SECTIONS = new Set([
  "complete-summary",
  "workshop-total",
  "profile-summary",
]);

export type SectionMeta = {
  title: string;
  subtitle: string;
};

export function getSectionMeta(
  menuId: ModuleMenuId,
  sectionId: string | undefined,
): SectionMeta | null {
  if (!sectionId) return null;
  const menu = MODULE_MENUS[menuId];
  const action = menu.actions.find((a) => a.id === sectionId);
  if (!action) return null;
  return { title: action.title, subtitle: action.helper };
}

export function isCompleteModuleSection(sectionId: string | undefined): boolean {
  return sectionId != null && COMPLETE_MODULE_SECTIONS.has(sectionId);
}

export function shouldShowModuleSection(
  sectionId: string | undefined,
  blockId: string,
): boolean {
  if (!sectionId) return true;
  if (isCompleteModuleSection(sectionId)) return true;
  return sectionId === blockId;
}

const SUMMARY_BLOCKS: Record<string, string[]> = {
  "cutting-summary": ["cutting"],
  "profile-weight-cost": ["profile"],
  "product-overview": ["overview", "preview"],
  "labour-pdf": ["pdf-labour"],
  "profile-weight-pdf": ["pdf-profile"],
  "workshop-cost": ["workshop"],
  "complete-summary": ["overview", "preview", "cutting", "profile", "workshop", "pdf-labour", "pdf-profile"],
};

export function shouldShowSummaryBlock(
  activeSection: string | undefined,
  blockId: string,
): boolean {
  if (!activeSection) return true;
  const blocks = SUMMARY_BLOCKS[activeSection];
  if (!blocks) return activeSection === blockId;
  return blocks.includes(blockId);
}

const ESTIMATION_BLOCKS: Record<string, string[]> = {
  "product-cost": ["hero", "stats", "customer", "breakdown-materials", "order-total"],
  "profile-cost": ["hero", "stats", "rates-profile", "breakdown-materials", "running-feet"],
  "glass-mesh-cost": ["hero", "rates-glass"],
  "hardware-cost": ["hero", "rates-hardware", "door-hardware-rates"],
  hardware: ["door-hardware-rates"],
  "labour-overheads": ["hero", "overheads"],
  "workshop-total": ["hero", "stats", "breakdown-totals", "order-total"],
  "workshop-cost": ["hero", "stats", "breakdown-totals", "order-total"],
  "workshop-pdf": ["hero", "pdf"],
};

export function shouldShowEstimationBlock(
  activeSection: string | undefined,
  blockId: string,
): boolean {
  if (!activeSection) return true;
  const blocks = ESTIMATION_BLOCKS[activeSection];
  if (!blocks) return true;
  return blocks.includes(blockId);
}

export type CuttingContentMode = "full" | "entry" | "table" | "preview";

export function resolveCuttingContentMode(
  activeSection: string | undefined,
): CuttingContentMode {
  switch (activeSection) {
    case "window-cutting":
    case "door-cutting":
      return "entry";
    case "detailed-components":
      return "table";
    case "product-preview":
      return "preview";
    default:
      return "full";
  }
}

export function resolveCuttingProductKind(
  activeSection: string | undefined,
  current: "window" | "door" | "fixed-frame",
): "window" | "door" | "fixed-frame" {
  if (activeSection === "window-cutting") return "window";
  if (activeSection === "door-cutting") return "door";
  return current;
}

const PROFILES_BLOCKS: Record<string, string[]> = {
  "window-profiles": ["cutting-methods"],
  "door-profiles": ["door-note"],
  "profile-rates": ["market-rate"],
  "profile-weights": ["profile-table"],
  "glass-mesh-rates": ["glass-rates"],
  hardware: ["door-hardware-rates"],
  "hardware-cost": ["door-hardware-rates"],
  wastage: ["wastage-note"],
  "profile-summary": ["stats", "cutting-methods", "market-rate", "profile-table", "glass-rates"],
};

export function shouldShowProfilesBlock(
  activeSection: string | undefined,
  blockId: string,
): boolean {
  if (!activeSection) return true;
  const blocks = PROFILES_BLOCKS[activeSection];
  if (!blocks) return true;
  return blocks.includes(blockId);
}

const SETTINGS_BLOCKS: Record<string, string[]> = {
  "company-details": ["company-details"],
  "logo-branding": ["logo-branding"],
  "gst-bank": ["gst-bank"],
  terms: ["terms"],
  "signature-stamp": ["signature-stamp"],
  "users-permissions": ["users-permissions"],
  "pdf-settings": ["pdf-settings"],
  "app-preferences": ["app-preferences"],
};

export function shouldShowSettingsBlock(
  activeSection: string | undefined,
  blockId: string,
): boolean {
  if (!activeSection) return true;
  const blocks = SETTINGS_BLOCKS[activeSection];
  if (!blocks) return true;
  return blocks.includes(blockId);
}

export type QuotationSectionMode = "full" | "quotation" | "premium" | "share";

export function resolveQuotationSectionMode(
  activeSection: string | undefined,
): QuotationSectionMode {
  switch (activeSection) {
    case "premium-proposal":
      return "premium";
    case "share-quotation":
      return "share";
    case "new-quotation":
    case "current-job":
    case "standard-quotation":
      return "quotation";
    default:
      return "full";
  }
}

export function shouldShowDocumentsFilterBar(activeSection: string | undefined): boolean {
  if (!activeSection) return true;
  return false;
}
