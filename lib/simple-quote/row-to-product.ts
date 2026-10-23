import {
  createDefaultCuttingOptions,
  ensureCuttingPresetApplied,
  syncCuttingOptionsForTrack,
} from "@/lib/cutting";
import { applyThreeTrackSashConfiguration, applyTwoGlassOneNetSashConfiguration } from "@/lib/cutting/sash-configuration";
import type { CuttingOptions } from "@/lib/cutting/types";
import {
  getDefaultEstimationInputs,
  normalizeEstimationDimensions,
} from "@/lib/estimation";
import type { EstimationInputs } from "@/lib/estimation/types";
import type { JobProductKind } from "@/lib/jobs";
import { applyPartnerProductType, type PartnerProductType } from "@/lib/partner-workspace";
import type { ProfileRateSettings } from "@/lib/profiles";

import type { SimpleQuoteRateSettings } from "./rate-settings";
import { applySimpleQuoteRateSettings } from "./rate-settings";
import type { SimpleQuoteProductType, SimpleQuoteRow } from "./types";
import { getRowHeightMm, getRowWidthMm, mmToFeetInchesExact } from "./row-dimensions";

function partnerTypeFromQuoteType(type: SimpleQuoteProductType): PartnerProductType {
  switch (type) {
    case "single-door":
      return "single-door";
    case "double-door":
      return "double-door";
    case "fixed-frame":
      return "fixed-frame";
    default:
      return "window";
  }
}

function trackFromQuoteType(type: SimpleQuoteProductType): EstimationInputs["trackSystemId"] {
  switch (type) {
    case "2-track":
      return "2-track-t60";
    case "2.5-track":
      return "2.5-track-t60";
    case "3-track-2g1n":
    case "3-track-3g":
      return "3-track-t109";
    default:
      return "3-track-t109";
  }
}

function productKindFromQuoteType(type: SimpleQuoteProductType): JobProductKind {
  if (type === "single-door" || type === "double-door") return "door";
  if (type === "fixed-frame") return "fixed-frame";
  return "window";
}

export function rowToProductInputs(
  row: SimpleQuoteRow,
  profileRates: ProfileRateSettings,
  rateSettings?: SimpleQuoteRateSettings,
): {
  estimationInputs: EstimationInputs;
  cuttingOptions: CuttingOptions;
  productKind: JobProductKind;
} {
  const defaults = getDefaultEstimationInputs();
  const partnerType = partnerTypeFromQuoteType(row.productType);
  const trackId = trackFromQuoteType(row.productType);

  const widthMm = getRowWidthMm(row);
  const heightMm = getRowHeightMm(row);
  const widthFi = mmToFeetInchesExact(widthMm);
  const heightFi = mmToFeetInchesExact(heightMm);

  let estimationInputs = normalizeEstimationDimensions({
    ...defaults,
    profileRatePerKg: profileRates.marketRatePerKg,
    widthFeet: widthFi.feet,
    widthInches: widthFi.inches,
    heightFeet: heightFi.feet,
    heightInches: heightFi.inches,
    numberOfWindows: 1,
    trackSystemId: trackId,
  });

  estimationInputs = applyPartnerProductType(partnerType, estimationInputs);

  if (rateSettings) {
    estimationInputs = applySimpleQuoteRateSettings(estimationInputs, rateSettings);
  }

  let cuttingOptions = ensureCuttingPresetApplied(
    createDefaultCuttingOptions(trackId, "sarik"),
    trackId,
  );
  cuttingOptions = syncCuttingOptionsForTrack(cuttingOptions, trackId);

  if (row.productType === "2.5-track") {
    cuttingOptions = applyTwoGlassOneNetSashConfiguration(cuttingOptions, trackId);
  } else if (row.productType === "3-track-2g1n") {
    cuttingOptions = applyThreeTrackSashConfiguration(
      cuttingOptions,
      trackId,
      "two-glass-one-net",
    );
  } else if (row.productType === "3-track-3g") {
    cuttingOptions = applyThreeTrackSashConfiguration(
      cuttingOptions,
      trackId,
      "three-glass-no-net",
    );
  }

  return {
    estimationInputs,
    cuttingOptions,
    productKind: productKindFromQuoteType(row.productType),
  };
}
