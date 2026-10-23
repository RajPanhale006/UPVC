import { createDefaultDoorCuttingOptions } from "@/lib/cutting/door";
import { createDefaultFixedFrameSettings } from "@/lib/cutting/fixed-frame";
import type { CuttingOptions } from "@/lib/cutting/types";
import type { EstimationInputs } from "@/lib/estimation/types";
import type { CuttingJobMeta } from "@/lib/summary/types";

export type PartnerProductType =
  | "window"
  | "single-door"
  | "double-door"
  | "fixed-frame";

export type PartnerUnitMode = "mm" | "ft-in";

export type PartnerWorkspaceDraft = {
  estimationInputs: EstimationInputs;
  cuttingOptions: CuttingOptions;
  cuttingJobMeta: CuttingJobMeta;
  productType: PartnerProductType;
  unitMode: PartnerUnitMode;
  savedAt: string;
  pendingSync: boolean;
};

export type PartnerCalculationSnapshot = {
  estimationInputs: EstimationInputs;
  cuttingOptions: CuttingOptions;
  cuttingJobMeta: CuttingJobMeta;
  productType: PartnerProductType;
};

export function partnerProductTypeFromInputs(
  inputs: EstimationInputs,
): PartnerProductType {
  if (inputs.productKind === "fixed-frame") return "fixed-frame";
  if (inputs.productKind === "door") {
    const config = inputs.doorSettings?.configuration ?? "single";
    return config === "double" ? "double-door" : "single-door";
  }
  return "window";
}

export function applyPartnerProductType(
  productType: PartnerProductType,
  inputs: EstimationInputs,
): EstimationInputs {
  if (productType === "fixed-frame") {
    return {
      ...inputs,
      productKind: "fixed-frame",
      fixedFrameSettings:
        inputs.fixedFrameSettings ?? createDefaultFixedFrameSettings(),
    };
  }
  if (productType === "window") {
    return { ...inputs, productKind: "window" };
  }
  const configuration = productType === "double-door" ? "double" : "single";
  const doorDefaults = createDefaultDoorCuttingOptions(configuration);
  return {
    ...inputs,
    productKind: "door",
    doorSettings: {
      ...doorDefaults,
      ...(inputs.doorSettings ?? {}),
      configuration,
    },
  };
}

export function createCalculationSnapshot(
  estimationInputs: EstimationInputs,
  cuttingOptions: CuttingOptions,
  cuttingJobMeta: CuttingJobMeta,
  productType: PartnerProductType,
): PartnerCalculationSnapshot {
  return {
    estimationInputs: structuredClone(estimationInputs),
    cuttingOptions: structuredClone(cuttingOptions),
    cuttingJobMeta: structuredClone(cuttingJobMeta),
    productType,
  };
}

export function snapshotsMatch(
  a: PartnerCalculationSnapshot | null,
  b: PartnerCalculationSnapshot,
): boolean {
  if (!a) return false;
  return JSON.stringify(a) === JSON.stringify(b);
}

const UNIT_MODE_KEY = "partner-workspace-unit-mode";
const PRODUCT_TYPE_KEY = "partner-workspace-product-type";

export function loadPartnerUnitMode(): PartnerUnitMode {
  if (typeof window === "undefined") return "mm";
  const raw = window.sessionStorage.getItem(UNIT_MODE_KEY);
  return raw === "ft-in" ? "ft-in" : "mm";
}

export function savePartnerUnitMode(mode: PartnerUnitMode): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(UNIT_MODE_KEY, mode);
}

export function loadPartnerProductType(): PartnerProductType {
  if (typeof window === "undefined") return "window";
  const raw = window.sessionStorage.getItem(PRODUCT_TYPE_KEY);
  if (raw === "single-door" || raw === "double-door" || raw === "window" || raw === "fixed-frame") {
    return raw;
  }
  return "window";
}

export function savePartnerProductType(type: PartnerProductType): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(PRODUCT_TYPE_KEY, type);
}

const DRAFT_KEY = "partner-workspace-draft";

export function savePartnerDraft(draft: PartnerWorkspaceDraft): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

export function loadPartnerDraft(): PartnerWorkspaceDraft | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(DRAFT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PartnerWorkspaceDraft;
  } catch {
    return null;
  }
}

export function clearPartnerDraft(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(DRAFT_KEY);
}

export * from "./save-product";
