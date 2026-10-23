import { TRACK_SYSTEM_PRESETS } from "@/lib/cutting";
import { createDefaultDoorCuttingOptions } from "@/lib/cutting/door";
import { createDefaultFixedFrameSettings } from "@/lib/cutting/fixed-frame";
import { getDefaultDoorHardwareMasterSettings, loadDoorHardwareMasterSettings } from "@/lib/door-hardware";
import type { DoorHardwareMasterSettings } from "@/lib/door-hardware";
import {
  buildDoorEstimation,
  buildFixedFrameEstimation,
  calculateEstimation,
  getProductKind,
} from "@/lib/estimation";
import { feetInchesToMm } from "@/lib/estimation/defaults";
import { syncMarketRate } from "@/lib/profiles";
import { buildDoorProfileCostSummary } from "@/lib/summary/build-door-profile-cost-summary";
import { buildProfileCostSummary } from "@/lib/summary/build-profile-cost-summary";

import { calculateDoorProduct } from "./calculate-door";
import { calculateFixedFrameProduct } from "./calculate-fixed-frame";
import { calculateWindowProduct } from "./calculate-window";
import { areaFromFeetInchesFields, mmAreaToSqFt } from "./format";
import { formatMethodLabel, getMethodMetaForProduct } from "./method-metadata";
import type {
  CalculateProductInput,
  ProductCalculationResult,
} from "./types";
import { invalidValidation } from "./validation/validate-calculation";

import type { RunningFeetBreakdown } from "@/lib/estimation/types";

function resolveDoorHardwareMaster(
  input?: DoorHardwareMasterSettings,
): DoorHardwareMasterSettings {
  if (input) return input;
  if (typeof window !== "undefined") return loadDoorHardwareMasterSettings();
  return getDefaultDoorHardwareMasterSettings();
}

const EMPTY_RUNNING_FEET: RunningFeetBreakdown = {
  perimeterFt: 0,
  frameFt: 0,
  sashFt: 0,
  screenSashFt: 0,
  interlockFt: 0,
  beadingFt: 0,
  steelFt: 0,
  bearingSteelTrackFt: 0,
  totalUpvcFt: 0,
  frameFtWithWastage: 0,
  sashFtWithWastage: 0,
  screenSashFtWithWastage: 0,
  interlockFtWithWastage: 0,
  beadingFtWithWastage: 0,
  totalUpvcFtWithWastage: 0,
};

export function calculateProduct(input: CalculateProductInput): ProductCalculationResult {
  const {
    estimationInputs,
    cuttingOptions,
    profileRates,
    cuttingJobMeta,
    doorHardwareMaster = resolveDoorHardwareMaster(input.doorHardwareMaster),
  } = input;
  const productType = getProductKind(estimationInputs);
  const widthMm = feetInchesToMm(
    estimationInputs.widthFeet,
    estimationInputs.widthInches,
  );
  const heightMm = feetInchesToMm(
    estimationInputs.heightFeet,
    estimationInputs.heightInches,
  );
  const quantity = Math.max(1, Math.floor(estimationInputs.numberOfWindows || 1));
  const areaSqFt =
    widthMm > 0 && heightMm > 0
      ? mmAreaToSqFt(widthMm, heightMm)
      : areaFromFeetInchesFields(
          estimationInputs.widthFeet,
          estimationInputs.widthInches,
          estimationInputs.heightFeet,
          estimationInputs.heightInches,
        );
  const syncedRates = syncMarketRate(profileRates, estimationInputs.profileRatePerKg);
  const method = getMethodMetaForProduct(productType, cuttingOptions.cuttingMethod);

  if (widthMm <= 0 || heightMm <= 0) {
    return {
      productType,
      method,
      profileCode: "—",
      inputDimensions: { widthMm, heightMm, quantity, areaSqFt },
      validation: invalidValidation("Enter valid width and height before calculating."),
      estimation: null,
      profileCostSummary: null,
      cuttingJobMeta,
    };
  }

  if (productType === "fixed-frame") {
    const fixedFrameSettings =
      estimationInputs.fixedFrameSettings ?? createDefaultFixedFrameSettings();
    const fixed = calculateFixedFrameProduct({
      widthMm,
      heightMm,
      quantity,
      areaSqFt,
      fixedFrameSettings,
      profileRatePerKg: syncedRates.marketRatePerKg,
    });

    const estimation = fixed.validation.isValid
      ? buildFixedFrameEstimation(estimationInputs, syncedRates, fixedFrameSettings)
      : null;

    return {
      productType,
      method: fixed.method,
      profileCode: fixed.profileCode,
      inputDimensions: fixed.dimensions,
      validation: fixed.validation,
      fixedFrame: fixed.cutting
        ? {
            cutting: fixed.cutting,
            fixedFrameSettings,
            components: fixed.components,
            details: fixed.details,
            summary: fixed.summary!,
          }
        : undefined,
      estimation,
      profileCostSummary: null,
      cuttingJobMeta,
    };
  }

  if (productType === "door") {
    const doorSettings =
      estimationInputs.doorSettings ?? createDefaultDoorCuttingOptions("single");
    const door = calculateDoorProduct({
      widthMm,
      heightMm,
      quantity,
      areaSqFt,
      doorSettings,
    });

    const estimation = door.validation.isValid
      ? buildDoorEstimation(
          estimationInputs,
          syncedRates,
          doorSettings,
          doorHardwareMaster,
        )
      : null;

    const profileCostSummary =
      door.validation.isValid && door.cutting
        ? buildDoorProfileCostSummary({
            estimationInputs,
            profileRates: syncedRates,
            runningFeet: estimation?.runningFeet ?? EMPTY_RUNNING_FEET,
            tableRows: door.cutting.tableRows,
            doorQty: quantity,
            productId: cuttingJobMeta.jobName,
            windowRef: cuttingJobMeta.windowLocation || cuttingJobMeta.jobName,
          })
        : null;

    return {
      productType,
      method: door.method,
      profileCode: door.profileCode,
      inputDimensions: door.dimensions,
      validation: door.validation,
      door: door.cutting
        ? {
            cutting: door.cutting,
            doorSettings,
            components: door.components,
            details: door.details,
          }
        : undefined,
      estimation,
      profileCostSummary,
      cuttingJobMeta,
    };
  }

  const trackSystemId = estimationInputs.trackSystemId;
  const window = calculateWindowProduct({
    widthMm,
    heightMm,
    quantity,
    areaSqFt,
    trackSystemId,
    cuttingOptions,
  });

  const estimation = window.validation.isValid
    ? calculateEstimation(estimationInputs, syncedRates, cuttingOptions).selectedTrack
    : null;

  const profileCostSummary =
    window.validation.isValid && window.cutting
      ? buildProfileCostSummary({
          trackSystemId,
          estimationInputs,
          profileRates: syncedRates,
          runningFeet: estimation?.runningFeet ?? EMPTY_RUNNING_FEET,
          tableRows: window.cutting.tableRows,
          profileCode: window.profileCode,
          windowQty: quantity,
          cuttingOptions,
          productId: cuttingJobMeta.jobName,
          windowRef: cuttingJobMeta.windowLocation || cuttingJobMeta.jobName,
        })
      : null;

  return {
    productType,
    method: window.method,
    trackSystemId,
    profileCode: window.profileCode,
    inputDimensions: window.dimensions,
    validation: window.validation,
    window: window.cutting
      ? {
          cutting: window.cutting,
          components: window.components,
          details: window.details,
        }
      : undefined,
    estimation,
    profileCostSummary,
    cuttingJobMeta,
  };
}

export function canExportWorkshopCostPdf(result: ProductCalculationResult): boolean {
  if (!result.validation.isValid || !result.estimation) return false;
  if (result.estimation.hasMissingDoorHardwareRates) return false;
  return true;
}

export function canExportPdf(result: ProductCalculationResult): boolean {
  return (
    result.validation.isValid &&
    (result.window?.cutting != null ||
      result.door?.cutting != null ||
      result.fixedFrame?.cutting != null)
  );
}

export function getProductMethodDisplay(result: ProductCalculationResult): string {
  return formatMethodLabel(result.method);
}

export function getProductProfileCode(result: ProductCalculationResult): string {
  if (result.productType === "door" || result.productType === "fixed-frame") {
    return result.profileCode;
  }
  if (result.trackSystemId) {
    return TRACK_SYSTEM_PRESETS[result.trackSystemId].profileCode;
  }
  return result.profileCode;
}
