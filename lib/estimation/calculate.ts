import type { TrackSystemId } from "@/lib/cutting/types";
import type { CuttingOptions } from "@/lib/cutting/types";
import {
  calculateAllCuts,
  calculateCutting,
} from "@/lib/cutting/calculate-sash-cuts";
import { getTrackCuttingOptions } from "./defaults";
import { isSarikTwoGlassOneNet } from "@/lib/cutting/sash-configuration";
import type { ProfileRateSettings } from "@/lib/profiles/types";
import { mmAreaToSqFt } from "@/lib/calculations/format";
import { MM_PER_FOOT } from "@/lib/units/conversion";

import {
  calculateAreaSqft,
  calculatePerimeterFt,
  feetInchesToMm,
  getSelectedGlassRate,
  getSelectedLockRate,
  getBearingSteelTrackRatePerFt,
  HARDWARE_QTY,
  TRACK_LABELS,
} from "./defaults";
import {
  calculateProfileMaterialCostBreakdown,
  calculateRunningFeet,
  getSlidingSashCount,
} from "./running-feet";
import { computeCustomerBasePriceFields } from "./customer-base-price";
import type {
  EstimationBreakdown,
  EstimationInputs,
  EstimationResult,
  MaterialLineItem,
} from "./types";

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function resolveJaaliCost(
  trackSystemId: TrackSystemId,
  inputs: EstimationInputs,
  widthMm: number,
  heightMm: number,
  _areaSqft: number,
  cuttingOptions?: CuttingOptions,
): number {
  if (
    cuttingOptions &&
    isSarikTwoGlassOneNet(cuttingOptions, trackSystemId)
  ) {
    const cuts = calculateAllCuts(
      { widthMm, heightMm },
      cuttingOptions,
      trackSystemId,
    );
    if (cuts.meshWidth > 0 && cuts.meshHeight > 0) {
      const meshAreaSqft = mmAreaToSqFt(cuts.meshWidth, cuts.meshHeight);
      return round2(meshAreaSqft * inputs.jaaliRatePerSqft);
    }
  }
  return 0;
}

function resolveJaaliNote(
  trackSystemId: TrackSystemId,
  jaaliCost: number,
  cuttingOptions?: CuttingOptions,
): string {
  if (
    cuttingOptions &&
    isSarikTwoGlassOneNet(cuttingOptions, trackSystemId)
  ) {
    if (jaaliCost <= 0) {
      return "Mesh panel area not available";
    }
    if (trackSystemId === "2.5-track-t60") {
      return "2.5 Track 2 Glass + 1 Net — mesh panel area";
    }
    return "3 Track 2 Glass + 1 Net — mesh panel area";
  }
  return "Not applicable";
}

function buildTrackEstimation(
  inputs: EstimationInputs,
  trackSystemId: TrackSystemId,
  profileRates: ProfileRateSettings,
  cuttingOptions?: import("@/lib/cutting/types").CuttingOptions,
): EstimationBreakdown {
  const widthMm = feetInchesToMm(inputs.widthFeet, inputs.widthInches);
  const heightMm = feetInchesToMm(inputs.heightFeet, inputs.heightInches);
  const areaSqft = calculateAreaSqft(
    inputs.widthFeet,
    inputs.widthInches,
    inputs.heightFeet,
    inputs.heightInches,
  );
  const perimeterFt = calculatePerimeterFt(
    inputs.widthFeet,
    inputs.widthInches,
    inputs.heightFeet,
    inputs.heightInches,
  );
  const hardware = HARDWARE_QTY[trackSystemId];
  const qty = Math.max(1, Math.floor(inputs.numberOfWindows || 1));
  const runningFeet = calculateRunningFeet(
    widthMm,
    heightMm,
    trackSystemId,
    inputs,
    cuttingOptions,
  );

  const resolvedCuttingOptions =
    cuttingOptions ?? getTrackCuttingOptions(trackSystemId);
  const cutting = calculateCutting(
    { widthMm, heightMm },
    resolvedCuttingOptions,
    trackSystemId,
    qty,
  );

  const profileBreakdown = calculateProfileMaterialCostBreakdown(
    runningFeet,
    trackSystemId,
    inputs,
    profileRates,
    {
      tableRows: cutting.tableRows,
      productKind: "window",
      cuttingOptions: resolvedCuttingOptions,
    },
  );
  const glassCost = round2(areaSqft * getSelectedGlassRate(inputs));
  const lockRate = getSelectedLockRate(inputs);
  const bearingCost = round2(hardware.bearingQty * inputs.bearingRatePerPiece);
  const lockCost = round2(hardware.lockQty * lockRate);
  const screwCost = round2(inputs.screwRatePerWindow);
  const otherHardwareCost = round2(inputs.otherHardwareCostPerWindow);
  const brushRubberCost = round2(perimeterFt * inputs.brushRubberRatePerFt);
  const jaaliCost = resolveJaaliCost(
    trackSystemId,
    inputs,
    widthMm,
    heightMm,
    areaSqft,
    cuttingOptions,
  );
  const slidingSashCount = getSlidingSashCount(trackSystemId, resolvedCuttingOptions);
  const bearingSteelTrackRatePerFt = getBearingSteelTrackRatePerFt(inputs);
  const bearingSteelTrackCost = round2(
    runningFeet.bearingSteelTrackFt * bearingSteelTrackRatePerFt,
  );
  const widthFt = round2(widthMm / MM_PER_FOOT);

  const materials: MaterialLineItem[] = [
    {
      key: "upvc-profiles",
      label: "UPVC profiles (frame + sash + interlock)",
      amount: profileBreakdown.upvcProfilesCost,
      note: profileBreakdown.usesBarOptimization
        ? "Purchase cost from optimized 5800 mm bars"
        : "Frame, sash and interlock with wastage",
    },
    {
      key: "beading",
      label: "Beading profile",
      amount: profileBreakdown.beadingCost,
      note: profileBreakdown.usesBarOptimization
        ? "Purchase cost from optimized 5800 mm bars"
        : `${profileBreakdown.beadingRunFt.toFixed(2)} ft with wastage`,
    },
    {
      key: "steel",
      label: "Steel reinforcement",
      amount: profileBreakdown.steelCost,
      note: profileBreakdown.usesBarOptimization
        ? "Purchase cost from optimized stock lengths"
        : `${runningFeet.steelFt.toFixed(2)} ft × ${(1 + inputs.wastagePercent / 100).toFixed(2)} wastage`,
    },
    {
      key: "glass",
      label: "Glass",
      amount: glassCost,
      note: `Area ${areaSqft} sqft × ₹${getSelectedGlassRate(inputs)}/sqft`,
    },
    {
      key: "bearing",
      label: "Bearing",
      amount: bearingCost,
      note: `${hardware.bearingQty} × ₹${inputs.bearingRatePerPiece}/piece`,
    },
    {
      key: "lock",
      label: "Lock",
      amount: lockCost,
      note: `${hardware.lockQty} × ${inputs.lockType}`,
    },
    {
      key: "screw",
      label: "Screw",
      amount: screwCost,
      note: "Per window",
    },
    {
      key: "brush-rubber",
      label: "Brush rubber",
      amount: brushRubberCost,
      note: `${perimeterFt} ft × ₹${inputs.brushRubberRatePerFt}/ft`,
    },
    {
      key: "jaali",
      label: "Jaali / Net",
      amount: jaaliCost,
      note: resolveJaaliNote(trackSystemId, jaaliCost, cuttingOptions),
    },
    {
      key: "bearing-steel-track",
      label: "Bearing steel track",
      amount: bearingSteelTrackCost,
      note: `${runningFeet.bearingSteelTrackFt.toFixed(2)} ft (${slidingSashCount} sash × ${widthFt.toFixed(2)} ft width) × ₹${bearingSteelTrackRatePerFt}/ft`,
    },
    {
      key: "other-hardware",
      label: "Other hardware",
      amount: otherHardwareCost,
      note: "Packing clips, adjustments, misc. small hardware",
    },
  ];

  const materialTotal = round2(
    materials.reduce((sum, item) => sum + item.amount, 0),
  );
  const labourTotal = round2(areaSqft * inputs.labourRatePerSqft);
  const overheadTotal = round2(
    Object.values(inputs.overheads).reduce((sum, value) => sum + value, 0),
  );
  const workshopTotal = round2(materialTotal + labourTotal + overheadTotal);
  const costPerSqft = areaSqft > 0 ? round2(workshopTotal / areaSqft) : 0;
  const profitAmount = round2(
    workshopTotal * (inputs.profitMarginPercent / 100),
  );
  const baseRatePerSqftAfterProfit = round2(
    costPerSqft * (1 + inputs.profitMarginPercent / 100),
  );
  const profitPerSqft = round2(baseRatePerSqftAfterProfit - costPerSqft);
  const gstPerSqft = round2(
    baseRatePerSqftAfterProfit * (inputs.gstPercent / 100),
  );
  const totalGstAmount = round2(gstPerSqft * areaSqft);
  const ratePerSqftWithGst = round2(baseRatePerSqftAfterProfit + gstPerSqft);
  const ratePerSqftWithoutGst = round2(
    baseRatePerSqftAfterProfit * (1 + inputs.withoutGstLoadingPercent / 100),
  );
  const finalAmountWithGst = round2(areaSqft * ratePerSqftWithGst);
  const finalAmountWithoutGst = round2(areaSqft * ratePerSqftWithoutGst);

  const customerBase = computeCustomerBasePriceFields(
    workshopTotal,
    qty,
    inputs.profitMarginPercent,
    areaSqft,
  );

  return {
    trackLabel: TRACK_LABELS[trackSystemId],
    areaSqft,
    widthMm,
    heightMm,
    numberOfWindows: qty,
    runningFeet,
    materials,
    materialTotal,
    labourTotal,
    overheadTotal,
    workshopTotal,
    costPerSqft,
    profitAmount,
    profitPerSqft,
    baseRatePerSqftAfterProfit,
    gstPerSqft,
    totalGstAmount,
    ratePerSqftWithGst,
    ratePerSqftWithoutGst,
    finalAmountWithGst,
    finalAmountWithoutGst,
    orderWorkshopTotal: round2(workshopTotal * qty),
    orderFinalAmountWithGst: round2(finalAmountWithGst * qty),
    orderFinalAmountWithoutGst: round2(finalAmountWithoutGst * qty),
    orderGstAmount: round2(totalGstAmount * qty),
    ...customerBase,
  };
}

export function calculateEstimation(
  inputs: EstimationInputs,
  profileRates: ProfileRateSettings,
  cuttingOptions?: import("@/lib/cutting/types").CuttingOptions,
): EstimationResult {
  const trackIds: TrackSystemId[] = [
    "2-track-t60",
    "2.5-track-t60",
    "3-track-t109",
  ];

  const allTracks = trackIds.reduce(
    (acc, trackSystemId) => {
      acc[trackSystemId] = buildTrackEstimation(
        inputs,
        trackSystemId,
        profileRates,
        trackSystemId === inputs.trackSystemId ? cuttingOptions : undefined,
      );
      return acc;
    },
    {} as Record<TrackSystemId, EstimationBreakdown>,
  );

  return {
    inputs,
    selectedTrack: allTracks[inputs.trackSystemId],
    allTracks,
  };
}
