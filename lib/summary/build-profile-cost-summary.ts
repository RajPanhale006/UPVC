import type { EnhancedCutRow } from "@/lib/cutting/types";
import type { CuttingOptions, TrackSystemId } from "@/lib/cutting/types";
import {
  aggregateWindowCategoryCosts,
  optimizeProductBarCuts,
  summarizeBarOptimizationTotals,
} from "@/lib/cutting/bar-optimization/build-profile-cost";
import { getFrameProfileKey } from "@/lib/estimation/running-feet";
import type { EstimationInputs, RunningFeetBreakdown } from "@/lib/estimation/types";
import type { ProfileRateKey, ProfileRateSettings } from "@/lib/profiles/types";

import type {
  ProfileCostBreakdownItem,
  ProfileCostSummary,
  ProfileCostSummaryRow,
} from "./types";

type ProfileCategory = "frame" | "sash" | "screen-sash" | "interlock" | "beading" | "steel";

const CATEGORY_ORDER: ProfileCategory[] = [
  "frame",
  "sash",
  "screen-sash",
  "interlock",
  "beading",
  "steel",
];

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function getCategoryForItem(item: string): ProfileCategory | null {
  if (item.startsWith("Frame")) return "frame";
  if (item.startsWith("Glass Sash")) return "sash";
  if (item.startsWith("Net Sash")) return "screen-sash";
  if (item.startsWith("Sash")) return "sash";
  if (item === "Interlock") return "interlock";
  if (item.startsWith("Beading")) return "beading";
  if (item.startsWith("Steel")) return "steel";
  return null;
}

function getProfileKeyForCategory(
  category: ProfileCategory,
  trackSystemId: TrackSystemId,
): ProfileRateKey | null {
  if (category === "frame") return getFrameProfileKey(trackSystemId);
  if (category === "screen-sash") return "screen-sash";
  if (category === "steel") return null;
  return category;
}

function getEstimationRunFt(
  runningFeet: RunningFeetBreakdown,
  category: ProfileCategory,
  wastageFactor: number,
): { required: number; costing: number } {
  switch (category) {
    case "frame":
      return {
        required: runningFeet.frameFt,
        costing: runningFeet.frameFtWithWastage,
      };
    case "sash":
      return {
        required: runningFeet.sashFt,
        costing: runningFeet.sashFtWithWastage,
      };
    case "screen-sash":
      return {
        required: runningFeet.screenSashFt,
        costing: runningFeet.screenSashFtWithWastage,
      };
    case "interlock":
      return {
        required: runningFeet.interlockFt,
        costing: runningFeet.interlockFtWithWastage,
      };
    case "beading":
      return {
        required: runningFeet.beadingFt,
        costing: runningFeet.beadingFtWithWastage,
      };
    case "steel":
      return {
        required: runningFeet.steelFt,
        costing: round2(runningFeet.steelFt * wastageFactor),
      };
    default:
      return { required: 0, costing: 0 };
  }
}

function buildBreakdownByCategory(
  tableRows: EnhancedCutRow[],
): Map<ProfileCategory, ProfileCostBreakdownItem[]> {
  const map = new Map<ProfileCategory, ProfileCostBreakdownItem[]>();

  for (const row of tableRows) {
    const category = getCategoryForItem(row.item);
    if (!category) continue;

    const items = map.get(category) ?? [];
    items.push({
      cuttingItem: row.item,
      qty: row.totalQty,
      runFt: round2(row.totalRunningFt),
    });
    map.set(category, items);
  }

  return map;
}

function sumRequiredFromCutting(
  breakdown: ProfileCostBreakdownItem[],
  windowQty: number,
): number {
  if (breakdown.length === 0) return 0;
  const perWindow = breakdown.reduce((sum, item) => sum + item.runFt, 0);
  return round2(perWindow * windowQty);
}

export function buildProfileCostSummary(input: {
  trackSystemId: TrackSystemId;
  estimationInputs: EstimationInputs;
  profileRates: ProfileRateSettings;
  runningFeet: RunningFeetBreakdown;
  tableRows: EnhancedCutRow[];
  profileCode: string;
  windowQty: number;
  cuttingOptions?: CuttingOptions;
  productId?: string;
  windowRef?: string;
}): ProfileCostSummary {
  const {
    trackSystemId,
    estimationInputs,
    profileRates,
    runningFeet,
    tableRows,
    profileCode,
    windowQty,
    cuttingOptions,
    productId,
    windowRef,
  } = input;

  const qty = Math.max(1, windowQty);
  const wastageFactor = 1 + estimationInputs.wastagePercent / 100;
  const profileMap = new Map(
    profileRates.profiles.map((profile) => [profile.key, profile]),
  );
  const breakdownByCategory = buildBreakdownByCategory(tableRows);

  const optimization = optimizeProductBarCuts({
    tableRows,
    productKind: "window",
    productId,
    windowRef,
    profileRates,
    trackSystemId,
    cuttingOptions,
  });

  const categoryCosts = aggregateWindowCategoryCosts(
    optimization,
    trackSystemId,
    cuttingOptions,
    estimationInputs.steelReinforcementRatePerFt,
  );

  const barTotals = summarizeBarOptimizationTotals(
    optimization,
    estimationInputs.steelReinforcementRatePerFt,
  );

  const rows: ProfileCostSummaryRow[] = [];
  let hasMissingConfig = false;

  for (const category of CATEGORY_ORDER) {
    const estimationFt = getEstimationRunFt(
      runningFeet,
      category,
      wastageFactor,
    );
    const breakdown = breakdownByCategory.get(category) ?? [];
    const practical = categoryCosts.get(category);

    const requiredRunFt =
      breakdown.length > 0
        ? sumRequiredFromCutting(breakdown, qty)
        : round2(estimationFt.required * qty);

    const legacyCostingRunFt = round2(estimationFt.costing * qty);

    if (requiredRunFt <= 0 && legacyCostingRunFt <= 0 && !practical) {
      continue;
    }

    if (category === "steel") {
      const steelRate = estimationInputs.steelReinforcementRatePerFt;
      const missingRate = steelRate <= 0;
      if (missingRate) hasMissingConfig = true;

      rows.push({
        id: category,
        profileName: "Steel reinforcement",
        profileCode: "STEEL",
        requiredRunFt,
        costingRunFt: legacyCostingRunFt,
        weightPerFt: null,
        totalWeight: null,
        ratePerKg: null,
        ratePerFt: steelRate > 0 ? steelRate : null,
        totalCost: practical?.totalCost ?? round2(legacyCostingRunFt * steelRate),
        isSteel: true,
        missingWeight: false,
        missingRate,
        breakdown,
        newBarsRequired: practical?.newBarsRequired,
        theoreticalBars: practical?.theoreticalBars,
        purchasedLengthMm: practical?.purchasedLengthMm,
        totalKerfMm: practical?.totalKerfMm,
        reusableLeftoverMm: practical?.reusableLeftoverMm,
        scrapMm: practical?.scrapMm,
      });
      continue;
    }

    const profileKey = getProfileKeyForCategory(category, trackSystemId);
    const profile = profileKey ? profileMap.get(profileKey) : undefined;
    const missingWeight = !profile || profile.weightPerFt <= 0;
    const missingRate = !profile || profile.ratePerKg <= 0;
    if (missingWeight || missingRate) hasMissingConfig = true;

    const weightPerFt = profile?.weightPerFt ?? null;
    const ratePerKg = profile?.ratePerKg ?? null;
    const ratePerFt = profile?.ratePerFt ?? null;
    const purchaseWeight = practical?.purchaseWeightKg ?? null;
    let totalCost = practical?.totalCost ?? 0;
    let resolvedWeight = purchaseWeight;

    if (
      totalCost <= 0 &&
      !practical &&
      legacyCostingRunFt > 0 &&
      weightPerFt != null &&
      weightPerFt > 0 &&
      ratePerKg != null &&
      ratePerKg > 0
    ) {
      resolvedWeight = round2(legacyCostingRunFt * weightPerFt);
      totalCost = round2(resolvedWeight * ratePerKg);
    }

    rows.push({
      id: category,
      profileName: profile?.description ?? profileKey ?? category,
      profileCode:
        category === "frame"
          ? profileCode
          : practical?.profileCodes[0] ??
            profile?.description.split(" ").slice(-1)[0] ??
            profileKey ??
            "",
      requiredRunFt,
      costingRunFt: legacyCostingRunFt,
      weightPerFt,
      totalWeight: resolvedWeight,
      ratePerKg,
      ratePerFt,
      totalCost,
      isSteel: false,
      missingWeight,
      missingRate,
      breakdown,
      newBarsRequired: practical?.newBarsRequired,
      theoreticalBars: practical?.theoreticalBars,
      purchasedLengthMm: practical?.purchasedLengthMm,
      totalKerfMm: practical?.totalKerfMm,
      reusableLeftoverMm: practical?.reusableLeftoverMm,
      scrapMm: practical?.scrapMm,
    });
  }

  return {
    rows,
    totalRequiredRunFt: round2(
      rows.reduce((sum, row) => sum + row.requiredRunFt, 0),
    ),
    totalCostingRunFt: round2(
      rows.reduce((sum, row) => sum + row.costingRunFt, 0),
    ),
    totalUpvcWeight: round2(
      rows
        .filter((row) => !row.isSteel && row.totalWeight != null)
        .reduce((sum, row) => sum + (row.totalWeight ?? 0), 0),
    ),
    totalProfileCost: barTotals.totalProfileCost,
    hasMissingConfig,
    wastagePercent: estimationInputs.wastagePercent,
    usesBarOptimization: true,
    barOptimization: {
      ...barTotals,
      labourReportedBars: estimationInputs.labourReportedBars ?? null,
    },
  };
}
