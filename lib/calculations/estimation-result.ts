import { calculateEstimation, isDoorProduct, TRACK_LABELS } from "@/lib/estimation";
import { feetInchesToMm } from "@/lib/estimation/defaults";
import type {
  EstimationBreakdown,
  EstimationInputs,
  EstimationResult,
  RunningFeetBreakdown,
} from "@/lib/estimation/types";
import type { CuttingOptions } from "@/lib/cutting/types";
import type { ProfileRateSettings } from "@/lib/profiles/types";

import type { ProductCalculationResult } from "./types";

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

function emptyEstimationBreakdown(
  inputs: EstimationInputs,
  trackLabel: string,
): EstimationBreakdown {
  const widthMm = feetInchesToMm(inputs.widthFeet, inputs.widthInches);
  const heightMm = feetInchesToMm(inputs.heightFeet, inputs.heightInches);
  const qty = Math.max(1, Math.floor(inputs.numberOfWindows || 1));

  return {
    trackLabel,
    areaSqft: 0,
    widthMm,
    heightMm,
    numberOfWindows: qty,
    runningFeet: { ...EMPTY_RUNNING_FEET },
    materials: [],
    materialTotal: 0,
    labourTotal: 0,
    overheadTotal: 0,
    workshopTotal: 0,
    costPerSqft: 0,
    profitAmount: 0,
    profitPerSqft: 0,
    baseRatePerSqftAfterProfit: 0,
    gstPerSqft: 0,
    totalGstAmount: 0,
    ratePerSqftWithGst: 0,
    ratePerSqftWithoutGst: 0,
    finalAmountWithGst: 0,
    finalAmountWithoutGst: 0,
    orderWorkshopTotal: 0,
    orderFinalAmountWithGst: 0,
    orderFinalAmountWithoutGst: 0,
    orderGstAmount: 0,
    customerBaseMarginPercent: 0,
    customerBaseMarginAmount: 0,
    suggestedCustomerBasePrice: 0,
    orderCustomerBaseMarginAmount: 0,
    orderSuggestedCustomerBasePrice: 0,
    customerBasePriceAvailable: false,
    suggestedCustomerRatePerSqFt: 0,
    customerRateAvailable: false,
    doorHardwareItems: [],
    totalDoorHardwareCost: 0,
    hasMissingDoorHardwareRates: false,
    missingDoorHardwareRateItems: [],
  };
}

/** Estimation UI/PDF payload when calculation validation fails — no costs or rates. */
export function buildBlockedEstimationResult(inputs: EstimationInputs): EstimationResult {
  const trackLabel = isDoorProduct(inputs)
    ? "UPVC Door"
    : TRACK_LABELS[inputs.trackSystemId];
  const blocked = emptyEstimationBreakdown(inputs, trackLabel);

  return {
    inputs,
    selectedTrack: blocked,
    allTracks: {
      "2-track-t60": blocked,
      "2.5-track-t60": blocked,
      "3-track-t109": blocked,
    },
  };
}

/** Map shared product calculation to Estimation tab / PDF result. */
export function buildEstimationResultFromProduct(
  product: ProductCalculationResult,
  inputs: EstimationInputs,
  profileRates: ProfileRateSettings,
  cuttingOptions: CuttingOptions,
): EstimationResult {
  if (!product.validation.isValid || !product.estimation) {
    return buildBlockedEstimationResult(inputs);
  }

  if (product.productType === "door") {
    const selectedTrack = product.estimation;
    return {
      inputs,
      selectedTrack,
      allTracks: {
        "2-track-t60": selectedTrack,
        "2.5-track-t60": selectedTrack,
        "3-track-t109": selectedTrack,
      },
    };
  }

  return calculateEstimation(inputs, profileRates, cuttingOptions);
}
