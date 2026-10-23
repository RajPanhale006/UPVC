import {
  CUTTING_METHOD_LABELS,
  getThreeTrackSashConfiguration,
  THREE_TRACK_SASH_CONFIGURATION_LABELS,
  type CuttingOptions,
} from "@/lib/cutting";
import {
  calculateProduct,
  formatMethodLabel,
  getDoorConfigurationLabel,
  getFixedFrameConstructionLabel,
} from "@/lib/calculations";
import type { EstimationInputs } from "@/lib/estimation/types";
import {
  DOOR_METHOD_LABEL,
  formatDoorHardwareSummary,
} from "@/lib/cutting/door";
import { TRACK_LABELS } from "@/lib/estimation/defaults";
import type { ProfileRateSettings } from "@/lib/profiles/types";

import { formatMmPair } from "./format";
import type {
  CuttingJobMeta,
  ProfileCostSummary,
  SummaryData,
  SummaryDoorEntry,
  SummaryFixedFrameEntry,
  SummaryWindowEntry,
} from "./types";

const EMPTY_PROFILE_COST_SUMMARY: ProfileCostSummary = {
  rows: [],
  totalRequiredRunFt: 0,
  totalCostingRunFt: 0,
  totalUpvcWeight: 0,
  totalProfileCost: 0,
  hasMissingConfig: false,
  wastagePercent: 0,
  usesBarOptimization: false,
};

function emptySummary(
  estimationInputs: EstimationInputs,
  cuttingJobMeta: CuttingJobMeta,
  productKind: "window" | "door" | "fixed-frame",
  workshopRatePerSqft: number,
  profileCostSummary: ProfileCostSummary,
): SummaryData {
  return {
    productKind,
    hasWindows: false,
    customerName: estimationInputs.customerName,
    location: estimationInputs.location,
    jobNotes: cuttingJobMeta.jobNotes,
    totalWindows: 0,
    totalAreaSqft: 0,
    totalProfileWeight: 0,
    totalProfileCost: 0,
    workshopRatePerSqft,
    totalWorkshopCost: 0,
    customerBasePriceAvailable: false,
    profileCostSummary,
    windows: [],
    doors: [],
    fixedFrames: [],
  };
}

export function buildSummaryForProduct(input: {
  estimationInputs: EstimationInputs;
  cuttingOptions: CuttingOptions;
  profileRates: ProfileRateSettings;
  cuttingJobMeta: CuttingJobMeta;
}): SummaryData {
  const product = calculateProduct(input);
  const { estimationInputs, cuttingOptions, cuttingJobMeta } = input;
  const qty = Math.max(1, Math.floor(estimationInputs.numberOfWindows || 1));
  const profileCostSummary =
    product.profileCostSummary ?? {
      ...EMPTY_PROFILE_COST_SUMMARY,
      wastagePercent: estimationInputs.wastagePercent,
    };
  const workshopRate = product.estimation?.costPerSqft ?? 0;

  if (!product.validation.isValid) {
    return emptySummary(
      estimationInputs,
      cuttingJobMeta,
      product.productType,
      workshopRate,
      profileCostSummary,
    );
  }

  if (product.productType === "fixed-frame" && product.fixedFrame && product.estimation) {
    const { fixedFrameSettings, components, details, summary: ffSummary } = product.fixedFrame;
    const estimation = product.estimation;
    const widthMm = product.inputDimensions.widthMm;
    const heightMm = product.inputDimensions.heightMm;
    const frameName =
      cuttingJobMeta.jobName.trim() ||
      formatMmPair(widthMm, heightMm) ||
      "Fixed Frame 1";

    const fixedEntry: SummaryFixedFrameEntry = {
      index: 1,
      name: frameName,
      widthMm,
      heightMm,
      quantity: qty,
      constructionMode: fixedFrameSettings.constructionMode,
      constructionLabel: getFixedFrameConstructionLabel(fixedFrameSettings.constructionMode),
      divisionMode: fixedFrameSettings.divisionMode,
      moduleCount: ffSummary.moduleCount,
      methodLabel: formatMethodLabel(product.method),
      location: cuttingJobMeta.windowLocation,
      profileCode: product.profileCode,
      areaSqft: estimation.areaSqft,
      totalAreaSqft: estimation.areaSqft * qty,
      totalGlassAreaSqFt: ffSummary.totalGlassAreaSqFt,
      workshopRatePerSqft: estimation.costPerSqft,
      workshopCostPerWindow: estimation.workshopTotal,
      workshopCostTotal: estimation.orderWorkshopTotal,
      components,
      details,
    };

    return {
      productKind: "fixed-frame",
      hasWindows: true,
      customerName: estimationInputs.customerName,
      location: estimationInputs.location,
      jobNotes: cuttingJobMeta.jobNotes,
      totalWindows: qty,
      totalAreaSqft: estimation.areaSqft * qty,
      totalProfileWeight: ffSummary.profileCostRows.reduce((s, r) => s + r.totalWeightKg, 0),
      totalProfileCost: ffSummary.workshopCost.profileCost,
      workshopRatePerSqft: estimation.costPerSqft,
      totalWorkshopCost: estimation.orderWorkshopTotal,
      customerBaseMarginPercent: estimation.customerBaseMarginPercent,
      customerBaseMarginAmount: estimation.orderCustomerBaseMarginAmount,
      suggestedCustomerBasePrice: estimation.orderSuggestedCustomerBasePrice,
      suggestedCustomerRatePerSqFt: estimation.suggestedCustomerRatePerSqFt,
      customerBasePriceAvailable: estimation.customerBasePriceAvailable,
      customerRateAvailable: estimation.customerRateAvailable,
      profileCostSummary,
      windows: [],
      doors: [],
      fixedFrames: [fixedEntry],
    };
  }

  if (product.productType === "door" && product.door && product.estimation) {
    const { doorSettings, components, details } = product.door;
    const estimation = product.estimation;
    const widthMm = product.inputDimensions.widthMm;
    const heightMm = product.inputDimensions.heightMm;
    const doorName =
      cuttingJobMeta.jobName.trim() ||
      formatMmPair(widthMm, heightMm) ||
      "Door 1";

    const doorEntry: SummaryDoorEntry = {
      index: 1,
      name: doorName,
      widthMm,
      heightMm,
      quantity: qty,
      configuration: doorSettings.configuration,
      configurationLabel: getDoorConfigurationLabel(doorSettings.configuration),
      openingSide: doorSettings.openingSide,
      openingDirection: doorSettings.openingDirection,
      methodLabel: formatMethodLabel(product.method) || DOOR_METHOD_LABEL,
      doorLocation: cuttingJobMeta.windowLocation,
      profileCode: product.profileCode,
      flatMullionMm: product.door.cutting.components.flatMullionMm,
      areaSqft: estimation.areaSqft,
      totalAreaSqft: estimation.areaSqft * qty,
      workshopRatePerSqft: estimation.costPerSqft,
      workshopCostPerWindow: estimation.workshopTotal,
      workshopCostTotal: estimation.orderWorkshopTotal,
      hardwareSummary: formatDoorHardwareSummary(doorSettings),
      components,
      details,
    };

    return {
      productKind: "door",
      hasWindows: true,
      customerName: estimationInputs.customerName,
      location: estimationInputs.location,
      jobNotes: cuttingJobMeta.jobNotes,
      totalWindows: qty,
      totalAreaSqft: estimation.areaSqft * qty,
      totalProfileWeight: profileCostSummary.totalUpvcWeight,
      totalProfileCost: profileCostSummary.totalProfileCost,
      workshopRatePerSqft: estimation.costPerSqft,
      totalWorkshopCost: estimation.orderWorkshopTotal,
      customerBaseMarginPercent: estimation.customerBaseMarginPercent,
      customerBaseMarginAmount: estimation.orderCustomerBaseMarginAmount,
      suggestedCustomerBasePrice: estimation.orderSuggestedCustomerBasePrice,
      suggestedCustomerRatePerSqFt: estimation.suggestedCustomerRatePerSqFt,
      customerBasePriceAvailable: estimation.customerBasePriceAvailable,
      customerRateAvailable: estimation.customerRateAvailable,
      profileCostSummary,
      windows: [],
      doors: [doorEntry],
    };
  }

  if (product.window && product.estimation && product.trackSystemId) {
    const estimation = product.estimation;
    const systemId = product.trackSystemId;
    const widthMm = product.inputDimensions.widthMm;
    const heightMm = product.inputDimensions.heightMm;
    const windowName =
      cuttingJobMeta.jobName.trim() ||
      formatMmPair(widthMm, heightMm) ||
      "Window 1";

    const sashConfigurationLabel =
      systemId === "3-track-t109"
        ? THREE_TRACK_SASH_CONFIGURATION_LABELS[
            getThreeTrackSashConfiguration(cuttingOptions)
          ]
        : systemId === "2.5-track-t60"
          ? "2 Glass + 1 Net"
          : undefined;

    const windowEntry: SummaryWindowEntry = {
      index: 1,
      name: windowName,
      widthMm,
      heightMm,
      quantity: qty,
      trackSystemId: systemId,
      trackLabel: TRACK_LABELS[systemId],
      profileCode: product.profileCode,
      method: cuttingOptions.cuttingMethod,
      methodLabel:
        formatMethodLabel(product.method) ||
        CUTTING_METHOD_LABELS[cuttingOptions.cuttingMethod],
      sashConfigurationLabel,
      windowLocation: cuttingJobMeta.windowLocation,
      areaSqft: estimation.areaSqft,
      totalAreaSqft: estimation.areaSqft * qty,
      workshopRatePerSqft: estimation.costPerSqft,
      workshopCostPerWindow: estimation.workshopTotal,
      workshopCostTotal: estimation.orderWorkshopTotal,
      components: product.window.components,
      details: product.window.details,
    };

    return {
      productKind: "window",
      hasWindows: true,
      customerName: estimationInputs.customerName,
      location: estimationInputs.location,
      jobNotes: cuttingJobMeta.jobNotes,
      totalWindows: qty,
      totalAreaSqft: estimation.areaSqft * qty,
      totalProfileWeight: profileCostSummary.totalUpvcWeight,
      totalProfileCost: profileCostSummary.totalProfileCost,
      workshopRatePerSqft: estimation.costPerSqft,
      totalWorkshopCost: estimation.orderWorkshopTotal,
      customerBaseMarginPercent: estimation.customerBaseMarginPercent,
      customerBaseMarginAmount: estimation.orderCustomerBaseMarginAmount,
      suggestedCustomerBasePrice: estimation.orderSuggestedCustomerBasePrice,
      suggestedCustomerRatePerSqFt: estimation.suggestedCustomerRatePerSqFt,
      customerBasePriceAvailable: estimation.customerBasePriceAvailable,
      customerRateAvailable: estimation.customerRateAvailable,
      profileCostSummary,
      windows: [windowEntry],
      doors: [],
    };
  }

  return emptySummary(
    estimationInputs,
    cuttingJobMeta,
    product.productType,
    workshopRate,
    profileCostSummary,
  );
}
