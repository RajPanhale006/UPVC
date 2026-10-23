import type { CuttingOptions, TrackSystemId } from "@/lib/cutting/types";
import { createDefaultDoorCuttingOptions } from "@/lib/cutting/door";
import { createDefaultFixedFrameSettings } from "@/lib/cutting/fixed-frame";
import { createDefaultCuttingOptions } from "@/lib/cutting/presets";
import {
  feetAndInchesToMm,
  feetInchesToMm,
  mmToFeetInches,
} from "@/lib/units/conversion";

import type { EstimationInputs, GlassSizeOption, ProductKind, TrackHardwareQty } from "./types";

export {
  feetAndInchesToMm,
  feetInchesToMm,
  feetToMm,
  inchesToMm,
  mmToFeetInches,
  normalizeMm,
  MM_PER_FOOT,
  MM_PER_INCH,
  INCHES_PER_FOOT,
} from "@/lib/units/conversion";

export function getProductKind(inputs: EstimationInputs): ProductKind {
  return inputs.productKind ?? "window";
}

export function isDoorProduct(inputs: EstimationInputs): boolean {
  return getProductKind(inputs) === "door";
}

export function isFixedFrameProduct(inputs: EstimationInputs): boolean {
  return getProductKind(inputs) === "fixed-frame";
}

export const PRODUCT_KIND_LABELS: Record<ProductKind, string> = {
  window: "UPVC Window",
  door: "UPVC Door",
  "fixed-frame": "Fixed UPVC Partition Frame",
};

export const TRACK_LABELS: Record<TrackSystemId, string> = {
  "2-track-t60": "2 Track",
  "2.5-track-t60": "2.5 Track",
  "3-track-t109": "3 Track",
};

export const HARDWARE_QTY: Record<TrackSystemId, TrackHardwareQty> = {
  "2-track-t60": {
    interlockQty: 2,
    lockQty: 2,
    bearingQty: 4,
    glassQty: 2,
  },
  "2.5-track-t60": {
    interlockQty: 3,
    lockQty: 3,
    bearingQty: 6,
    glassQty: 2,
  },
  "3-track-t109": {
    interlockQty: 4,
    lockQty: 2,
    bearingQty: 6,
    glassQty: 3,
  },
};

/** Track-wise cutting rules from Excel Inputs sheet (D17:N19). */
export function getTrackCuttingOptions(
  trackSystemId: TrackSystemId,
): CuttingOptions {
  const base = createDefaultCuttingOptions(trackSystemId, "standard");
  return {
    ...base,
    glassWidthDeductionMm: 78,
    glassHeightDeductionMm: 58,
    beadingAddMm: 10,
    steelDeductionMm: 10,
    glassPanelQty: HARDWARE_QTY[trackSystemId].glassQty,
  };
}

/** Shutter panel count used in Excel running-feet formulas (not cut-list piece qty). */
export function getShutterPanelQty(trackSystemId: TrackSystemId): number {
  switch (trackSystemId) {
    case "2-track-t60":
    case "2.5-track-t60":
      return 2;
    case "3-track-t109":
      return 3;
  }
}

export function getDefaultEstimationInputs(): EstimationInputs {
  return normalizeEstimationDimensions({
    customerName: "",
    location: "",
    widthFeet: 4,
    widthInches: 0,
    heightFeet: 4,
    heightInches: 0,
    numberOfWindows: 1,
    productKind: "window",
    doorSettings: createDefaultDoorCuttingOptions("single"),
    fixedFrameSettings: createDefaultFixedFrameSettings(),
    trackSystemId: "3-track-t109",
    lockType: "Handle Lock",
    glassSize: "5mm",
    beadAddMm: 10,
    wastagePercent: 8,
    profitMarginPercent: 20,
    gstPercent: 18,
    withoutGstLoadingPercent: 9,
    labourRatePerSqft: 60,
    profileRatePerKg: 150,
    screwRatePerWindow: 50,
    otherHardwareCostPerWindow: 0,
    brushRubberRatePerFt: 2,
    steelReinforcementRatePerFt: 5,
    jaaliRatePerSqft: 10,
    bearingSteelTrackRatePerFt: 15,
    overheads: {
      transportation: 10,
      electricity: 10,
      maintenance: 10,
      depreciation: 10,
      otherExp: 10,
      rentFixedCost: 30,
    },
    glassRates: {
      "3mm": 50,
      "3.5mm": 60,
      "5mm": 80,
    },
    lockRates: {
      buttonLockRate: 120,
      handleLockRate: 180,
    },
    bearingRatePerPiece: 75,
  });
}

/** Normalize stored ft/in fields to whole-millimetre canonical dimensions. */
export function normalizeEstimationDimensions(
  inputs: EstimationInputs,
): EstimationInputs {
  const widthMm = feetInchesToMm(inputs.widthFeet, inputs.widthInches);
  const heightMm = feetInchesToMm(inputs.heightFeet, inputs.heightInches);
  const width = mmToFeetInches(widthMm);
  const height = mmToFeetInches(heightMm);
  return {
    ...inputs,
    widthFeet: width.feet,
    widthInches: width.inches,
    heightFeet: height.feet,
    heightInches: height.inches,
  };
}

export function calculateAreaSqft(
  widthFeet: number,
  widthInches: number,
  heightFeet: number,
  heightInches: number,
): number {
  const widthFt = widthFeet + widthInches / 12;
  const heightFt = heightFeet + heightInches / 12;
  return Math.round(widthFt * heightFt * 100) / 100;
}

export function calculatePerimeterFt(
  widthFeet: number,
  widthInches: number,
  heightFeet: number,
  heightInches: number,
): number {
  const widthFt = widthFeet + widthInches / 12;
  const heightFt = heightFeet + heightInches / 12;
  return Math.round(2 * (widthFt + heightFt) * 100) / 100;
}

export function getSelectedGlassRate(inputs: EstimationInputs): number {
  return inputs.glassRates[inputs.glassSize as GlassSizeOption];
}

export function getSelectedLockRate(inputs: EstimationInputs): number {
  return inputs.lockType === "Button Lock"
    ? inputs.lockRates.buttonLockRate
    : inputs.lockRates.handleLockRate;
}

export function getBearingSteelTrackRatePerFt(inputs: EstimationInputs): number {
  if (inputs.bearingSteelTrackRatePerFt > 0) {
    return inputs.bearingSteelTrackRatePerFt;
  }
  if (inputs.bearingSteelTrackRatePer10Ft != null && inputs.bearingSteelTrackRatePer10Ft > 0) {
    return inputs.bearingSteelTrackRatePer10Ft / 10;
  }
  return 15;
}

/** @deprecated Use getBearingSteelTrackRatePerFt. */
export function getBearingSteelTrackRatePer10Ft(inputs: EstimationInputs): number {
  return getBearingSteelTrackRatePerFt(inputs) * 10;
}
