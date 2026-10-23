import type { CuttingMethod } from "@/lib/cutting/types";
import type { CalculationMethodMeta, ProductType } from "./types";

const SARIK_WINDOW: CalculationMethodMeta = {
  id: "sarik-window",
  name: "Sarik Method",
  version: "1.0",
  effectiveDate: "2026-01-01",
  productType: "window",
  status: "approved",
  approvedBy: "Sarik / Shivshakti Workshop",
};

const WORKSHOP_WINDOW: CalculationMethodMeta = {
  id: "workshop-window",
  name: "Workshop Confirmed",
  version: "1.0",
  effectiveDate: "2026-01-01",
  productType: "window",
  status: "approved",
  approvedBy: "Shivshakti Workshop",
};

const STANDARD_WINDOW: CalculationMethodMeta = {
  id: "standard-window",
  name: "Standard Method",
  version: "1.0",
  effectiveDate: "2026-01-01",
  productType: "window",
  status: "approved",
  approvedBy: "Shivshakti Workshop",
};

const SARIK_DOOR: CalculationMethodMeta = {
  id: "sarik-door",
  name: "Sarik Door Method",
  version: "2.0",
  effectiveDate: "2026-07-24",
  productType: "door",
  status: "approved",
  approvedBy: "Sarik / Shivshakti Workshop",
};

export function getWindowMethodMeta(method: CuttingMethod): CalculationMethodMeta {
  switch (method) {
    case "sarik":
      return SARIK_WINDOW;
    case "workshop-confirmed":
      return WORKSHOP_WINDOW;
    default:
      return STANDARD_WINDOW;
  }
}

const FIXED_FRAME: CalculationMethodMeta = {
  id: "fixed-frame",
  name: "Fixed UPVC Partition Frame",
  version: "1.0",
  effectiveDate: "2026-08-07",
  productType: "fixed-frame",
  status: "approved",
  approvedBy: "Shivshakti Workshop",
};

export function getDoorMethodMeta(): CalculationMethodMeta {
  return SARIK_DOOR;
}

export function getFixedFrameMethodMeta(): CalculationMethodMeta {
  return FIXED_FRAME;
}

export function formatMethodLabel(meta: CalculationMethodMeta): string {
  return `${meta.name} v${meta.version}`;
}

export function getMethodMetaForProduct(
  productType: ProductType,
  cuttingMethod?: CuttingMethod,
): CalculationMethodMeta {
  if (productType === "door") return getDoorMethodMeta();
  if (productType === "fixed-frame") return getFixedFrameMethodMeta();
  return getWindowMethodMeta(cuttingMethod ?? "sarik");
}
