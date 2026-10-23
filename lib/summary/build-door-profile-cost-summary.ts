import type { EnhancedCutRow } from "@/lib/cutting/types";
import {
  aggregateDoorCategoryCosts,
  optimizeProductBarCuts,
  summarizeBarOptimizationTotals,
} from "@/lib/cutting/bar-optimization/build-profile-cost";
import type { EstimationInputs, RunningFeetBreakdown } from "@/lib/estimation/types";
import type { ProfileRateKey, ProfileRateSettings } from "@/lib/profiles/types";

import type {
  ProfileCostBreakdownItem,
  ProfileCostSummary,
  ProfileCostSummaryRow,
} from "./types";

const DOOR_PROFILE_KEYS = {
  frame: "casement-frame" as ProfileRateKey,
  sash: "door-sash" as ProfileRateKey,
  beading: "gb36-beading" as ProfileRateKey,
};

type DoorProfileCategory = "frame" | "sash" | "beading";

const CATEGORY_ORDER: DoorProfileCategory[] = ["frame", "sash", "beading"];

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function getDoorCategory(item: string): DoorProfileCategory | null {
  if (item.startsWith("Frame") || item === "Flat Mullion") return "frame";
  if (item.startsWith("Sash")) return "sash";
  if (item.startsWith("Beading")) return "beading";
  return null;
}

function buildBreakdownByCategory(
  tableRows: EnhancedCutRow[],
): Map<DoorProfileCategory, ProfileCostBreakdownItem[]> {
  const map = new Map<DoorProfileCategory, ProfileCostBreakdownItem[]>();

  for (const row of tableRows) {
    const category = getDoorCategory(row.item);
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
  doorQty: number,
): number {
  if (breakdown.length === 0) return 0;
  const perDoor = breakdown.reduce((sum, item) => sum + item.runFt, 0);
  return round2(perDoor * doorQty);
}

function getEstimationRunFt(
  runningFeet: RunningFeetBreakdown,
  category: DoorProfileCategory,
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
    case "beading":
      return {
        required: runningFeet.beadingFt,
        costing: runningFeet.beadingFtWithWastage,
      };
  }
}

export function buildDoorProfileCostSummary(input: {
  estimationInputs: EstimationInputs;
  profileRates: ProfileRateSettings;
  runningFeet: RunningFeetBreakdown;
  tableRows: EnhancedCutRow[];
  doorQty: number;
  productId?: string;
  windowRef?: string;
}): ProfileCostSummary {
  const { estimationInputs, profileRates, runningFeet, tableRows, doorQty, productId, windowRef } =
    input;
  const qty = Math.max(1, doorQty);
  const wastageFactor = 1 + estimationInputs.wastagePercent / 100;
  const profileMap = new Map(
    profileRates.profiles.map((profile) => [profile.key, profile]),
  );
  const breakdownByCategory = buildBreakdownByCategory(tableRows);

  const optimization = optimizeProductBarCuts({
    tableRows,
    productKind: "door",
    productId,
    windowRef,
    profileRates,
  });

  const categoryCosts = aggregateDoorCategoryCosts(optimization);
  const barTotals = summarizeBarOptimizationTotals(
    optimization,
    estimationInputs.steelReinforcementRatePerFt,
  );

  const rows: ProfileCostSummaryRow[] = [];
  let hasMissingConfig = false;

  for (const category of CATEGORY_ORDER) {
    const estimationFt = getEstimationRunFt(runningFeet, category, wastageFactor);
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

    const profileKey = DOOR_PROFILE_KEYS[category];
    const profile = profileMap.get(profileKey);
    const missingWeight = !profile || profile.weightPerFt <= 0;
    const missingRate = !profile || profile.ratePerKg <= 0;
    if (missingWeight || missingRate) hasMissingConfig = true;

    const weightPerFt = profile?.weightPerFt ?? null;
    const ratePerKg = profile?.ratePerKg ?? null;
    const ratePerFt = profile?.ratePerFt ?? null;

    rows.push({
      id: category,
      profileName: profile?.description ?? profileKey,
      profileCode:
        practical?.profileCodes[0] ??
        profile?.description.split(" ").slice(-1)[0] ??
        profileKey,
      requiredRunFt,
      costingRunFt: legacyCostingRunFt,
      weightPerFt,
      totalWeight: practical?.purchaseWeightKg ?? null,
      ratePerKg,
      ratePerFt,
      totalCost: practical?.totalCost ?? 0,
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
    totalRequiredRunFt: round2(rows.reduce((sum, row) => sum + row.requiredRunFt, 0)),
    totalCostingRunFt: round2(rows.reduce((sum, row) => sum + row.costingRunFt, 0)),
    totalUpvcWeight: round2(
      rows
        .filter((row) => row.totalWeight != null)
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
