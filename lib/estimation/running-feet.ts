import { calculateAllCuts, calculateSashCuts } from "@/lib/cutting/calculate-sash-cuts";
import type { CuttingOptions, EnhancedCutRow, TrackSystemId } from "@/lib/cutting/types";
import {
  aggregateDoorCategoryCosts,
  aggregateWindowCategoryCosts,
  optimizeProductBarCuts,
} from "@/lib/cutting/bar-optimization/build-profile-cost";
import {
  isSarikThreeGlassNoNet,
  isSarikTwoGlassOneNet,
} from "@/lib/cutting/sash-configuration";
import {
  SARIK_GLASS_SASH_QTY,
  SARIK_NET_SASH_QTY,
  SARIK_THREE_GLASS_SASH_QTY,
} from "@/lib/cutting/sarik-method";
import type { ProfileRateKey, ProfileRateSettings } from "@/lib/profiles/types";
import { MM_PER_FOOT } from "@/lib/units/conversion";

import {
  getShutterPanelQty,
  getTrackCuttingOptions,
  HARDWARE_QTY,
} from "./defaults";
import type { EstimationInputs, RunningFeetBreakdown } from "./types";

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Sliding sash count — each sash needs one bottom steel track rail of full opening width. */
export function getSlidingSashCount(
  trackSystemId: TrackSystemId,
  cuttingOptions?: CuttingOptions,
): number {
  if (cuttingOptions != null && isSarikTwoGlassOneNet(cuttingOptions, trackSystemId)) {
    return SARIK_GLASS_SASH_QTY + SARIK_NET_SASH_QTY;
  }
  if (cuttingOptions != null && isSarikThreeGlassNoNet(cuttingOptions, trackSystemId)) {
    return SARIK_THREE_GLASS_SASH_QTY;
  }
  return getShutterPanelQty(trackSystemId);
}

export function calculateBearingSteelTrackFt(
  widthMm: number,
  trackSystemId: TrackSystemId,
  cuttingOptions?: CuttingOptions,
): number {
  const widthFt = widthMm / MM_PER_FOOT;
  const sashCount = getSlidingSashCount(trackSystemId, cuttingOptions);
  return round2(widthFt * sashCount);
}

function getFrameProfileKey(trackSystemId: TrackSystemId): ProfileRateKey {
  switch (trackSystemId) {
    case "2-track-t60":
      return "frame-2-track";
    case "2.5-track-t60":
      return "frame-2-5-track";
    case "3-track-t109":
      return "frame-3-track";
  }
}

export function calculateRunningFeet(
  widthMm: number,
  heightMm: number,
  trackSystemId: TrackSystemId,
  inputs: EstimationInputs,
  cuttingOptions?: CuttingOptions,
): RunningFeetBreakdown {
  const useSarikThreeGlass =
    cuttingOptions != null &&
    isSarikThreeGlassNoNet(cuttingOptions, trackSystemId);
  const useSarikTwoGlassOneNet =
    cuttingOptions != null &&
    isSarikTwoGlassOneNet(cuttingOptions, trackSystemId);

  const options = useSarikThreeGlass || useSarikTwoGlassOneNet
    ? cuttingOptions!
    : getTrackCuttingOptions(trackSystemId);
  const standardCuts = calculateSashCuts(
    { widthMm, heightMm },
    getTrackCuttingOptions(trackSystemId),
    trackSystemId,
  );
  const sarikCuts =
    useSarikThreeGlass || useSarikTwoGlassOneNet
      ? calculateAllCuts({ widthMm, heightMm }, options, trackSystemId)
      : null;
  const cuts = sarikCuts ?? standardCuts;
  const shutterPanels = getShutterPanelQty(trackSystemId);
  const hardware = HARDWARE_QTY[trackSystemId];
  const glassPanelQty = useSarikTwoGlassOneNet ? 2 : hardware.glassQty;

  const frameFt = round2((2 * (widthMm + heightMm)) / MM_PER_FOOT);

  let sashFt: number;
  let screenSashFt = 0;
  if (useSarikTwoGlassOneNet && sarikCuts) {
    sashFt = round2(
      (2 * SARIK_GLASS_SASH_QTY * sarikCuts.sashTop +
        2 * SARIK_GLASS_SASH_QTY * sarikCuts.sashSide) /
        MM_PER_FOOT,
    );
    screenSashFt = round2(
      (2 * SARIK_NET_SASH_QTY * sarikCuts.netSashTop +
        2 * SARIK_NET_SASH_QTY * sarikCuts.netSashSide) /
        MM_PER_FOOT,
    );
  } else {
    sashFt = round2(
      ((2 * shutterPanels * cuts.sashTop + 2 * shutterPanels * cuts.sashSide) /
        MM_PER_FOOT),
    );
  }

  const interlockLength = useSarikThreeGlass ? cuts.interlock : cuts.sashSide;
  const interlockFt = round2(
    (hardware.interlockQty * interlockLength) / MM_PER_FOOT,
  );

  const glassWidth =
    sarikCuts != null
      ? round1(sarikCuts.glassWidth)
      : round1(cuts.sashTop - options.glassWidthDeductionMm);
  const glassHeight =
    sarikCuts != null
      ? round1(sarikCuts.glassHeight)
      : round1(cuts.sashSide - options.glassHeightDeductionMm);
  const beadingHorizontalMm =
    2 * glassPanelQty * (glassWidth + inputs.beadAddMm);
  const beadingVerticalMm =
    2 * glassPanelQty * (glassHeight + inputs.beadAddMm);
  const beadingFt = round2((beadingHorizontalMm + beadingVerticalMm) / MM_PER_FOOT);

  const steelSashCount = useSarikTwoGlassOneNet
    ? SARIK_GLASS_SASH_QTY + SARIK_NET_SASH_QTY
    : shutterPanels;
  const steelMm =
    2 * (widthMm - 10) +
    2 * (heightMm - 10) +
    2 * steelSashCount * (cuts.sashTop - 10) +
    2 * steelSashCount * (cuts.sashSide - 10);
  const steelFt = round2(steelMm / MM_PER_FOOT);
  const bearingSteelTrackFt = calculateBearingSteelTrackFt(
    widthMm,
    trackSystemId,
    cuttingOptions,
  );

  const totalUpvcFt = round2(frameFt + sashFt + screenSashFt + interlockFt + beadingFt);
  const wastageFactor = 1 + inputs.wastagePercent / 100;

  return {
    perimeterFt: round2((2 * (widthMm + heightMm)) / MM_PER_FOOT),
    frameFt,
    sashFt,
    screenSashFt,
    interlockFt,
    beadingFt,
    steelFt,
    bearingSteelTrackFt,
    totalUpvcFt,
    frameFtWithWastage: round2(frameFt * wastageFactor),
    sashFtWithWastage: round2(sashFt * wastageFactor),
    screenSashFtWithWastage: round2(screenSashFt * wastageFactor),
    interlockFtWithWastage: round2(interlockFt * wastageFactor),
    beadingFtWithWastage: round2(beadingFt * wastageFactor),
    totalUpvcFtWithWastage: round2(totalUpvcFt * wastageFactor),
  };
}

export function calculateProfileMaterialCost(
  runningFeet: RunningFeetBreakdown,
  trackSystemId: TrackSystemId,
  inputs: EstimationInputs,
  profileRates: ProfileRateSettings,
): number {
  const breakdown = calculateProfileMaterialCostBreakdown(
    runningFeet,
    trackSystemId,
    inputs,
    profileRates,
  );
  return breakdown.totalCost;
}

export type ProfileMaterialCostBreakdown = {
  upvcProfilesCost: number;
  beadingCost: number;
  steelCost: number;
  totalCost: number;
  beadingRunFt: number;
  usesBarOptimization: boolean;
};

export type ProfileMaterialCostContext = {
  tableRows: EnhancedCutRow[];
  productKind: "window" | "door";
  cuttingOptions?: CuttingOptions;
  productId?: string;
  windowRef?: string;
};

/** Split profile material cost so beading is visible in estimation materials. */
export function calculateProfileMaterialCostBreakdown(
  runningFeet: RunningFeetBreakdown,
  trackSystemId: TrackSystemId,
  inputs: EstimationInputs,
  profileRates: ProfileRateSettings,
  context?: ProfileMaterialCostContext,
): ProfileMaterialCostBreakdown {
  if (context?.tableRows?.length) {
    const optimization = optimizeProductBarCuts({
      tableRows: context.tableRows,
      productKind: context.productKind,
      productId: context.productId,
      windowRef: context.windowRef,
      profileRates,
      trackSystemId: context.productKind === "window" ? trackSystemId : undefined,
      cuttingOptions: context.cuttingOptions,
    });

    if (context.productKind === "window") {
      const categories = aggregateWindowCategoryCosts(
        optimization,
        trackSystemId,
        context.cuttingOptions,
        inputs.steelReinforcementRatePerFt,
      );
      const frame = categories.get("frame");
      const sash = categories.get("sash");
      const screen = categories.get("screen-sash");
      const interlock = categories.get("interlock");
      const beading = categories.get("beading");
      const steel = categories.get("steel");

      const upvcProfilesCost = round2(
        (frame?.totalCost ?? 0) +
          (sash?.totalCost ?? 0) +
          (screen?.totalCost ?? 0) +
          (interlock?.totalCost ?? 0),
      );

      return {
        upvcProfilesCost,
        beadingCost: beading?.totalCost ?? 0,
        steelCost: steel?.totalCost ?? 0,
        totalCost: round2(
          upvcProfilesCost + (beading?.totalCost ?? 0) + (steel?.totalCost ?? 0),
        ),
        beadingRunFt: runningFeet.beadingFt,
        usesBarOptimization: true,
      };
    }

    const categories = aggregateDoorCategoryCosts(optimization);
    const frame = categories.get("frame");
    const sash = categories.get("sash");
    const beading = categories.get("beading");
    const upvcProfilesCost = round2((frame?.totalCost ?? 0) + (sash?.totalCost ?? 0));

    return {
      upvcProfilesCost,
      beadingCost: beading?.totalCost ?? 0,
      steelCost: 0,
      totalCost: round2(upvcProfilesCost + (beading?.totalCost ?? 0)),
      beadingRunFt: runningFeet.beadingFt,
      usesBarOptimization: true,
    };
  }

  const profileMap = new Map(
    profileRates.profiles.map((profile) => [profile.key, profile]),
  );
  const frameRate = profileMap.get(getFrameProfileKey(trackSystemId))?.ratePerFt ?? 0;
  const sashRate = profileMap.get("sash")?.ratePerFt ?? 0;
  const screenSashRate = profileMap.get("screen-sash")?.ratePerFt ?? 0;
  const interlockRate = profileMap.get("interlock")?.ratePerFt ?? 0;
  const beadingRate = profileMap.get("beading")?.ratePerFt ?? 0;
  const wastageFactor = 1 + inputs.wastagePercent / 100;

  const upvcProfilesCost = round2(
    runningFeet.frameFt * wastageFactor * frameRate +
      runningFeet.sashFt * wastageFactor * sashRate +
      runningFeet.screenSashFt * wastageFactor * screenSashRate +
      runningFeet.interlockFt * wastageFactor * interlockRate,
  );
  const beadingCost = round2(
    runningFeet.beadingFt * wastageFactor * beadingRate,
  );
  const steelCost = round2(
    runningFeet.steelFt * wastageFactor * inputs.steelReinforcementRatePerFt,
  );

  return {
    upvcProfilesCost,
    beadingCost,
    steelCost,
    totalCost: round2(upvcProfilesCost + beadingCost + steelCost),
    beadingRunFt: runningFeet.beadingFtWithWastage,
    usesBarOptimization: false,
  };
}

export { getFrameProfileKey };
