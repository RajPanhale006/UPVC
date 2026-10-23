import type { OptimizedBarPlan, ProfileBarUsageSummary } from "./types";

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export type SummarizeJobBarUsageOptions = {
  weightKgPerMetreByProfile?: Record<string, number>;
  ratePerKgByProfile?: Record<string, number>;
  defaultWeightKgPerMetre?: number;
  defaultRatePerKg?: number;
};

/**
 * Purchase-based profile summary.
 * Cost uses new full bars purchased — not net consumed length and not legacy wastage %.
 */
export function summarizeJobBarUsage(
  barPlans: OptimizedBarPlan[],
  options: SummarizeJobBarUsageOptions = {},
): ProfileBarUsageSummary[] {
  const byProfile = new Map<
    string,
    {
      profileCode: string;
      profileKey?: ProfileBarUsageSummary["profileKey"];
      standardBarLengthMm: number;
      totalBarsUsed: number;
      newBarsRequired: number;
      inventoryBarsConsumed: number;
      purchasedLengthMm: number;
      netRequiredLengthMm: number;
      consumedLengthMm: number;
      reusableLeftoverMm: number;
      scrapMm: number;
      totalKerfMm: number;
    }
  >();

  for (const plan of barPlans) {
    const row =
      byProfile.get(plan.profileCode) ??
      {
        profileCode: plan.profileCode,
        profileKey: plan.profileKey,
        standardBarLengthMm: plan.standardBarLengthMm,
        totalBarsUsed: 0,
        newBarsRequired: 0,
        inventoryBarsConsumed: 0,
        purchasedLengthMm: 0,
        netRequiredLengthMm: 0,
        consumedLengthMm: 0,
        reusableLeftoverMm: 0,
        scrapMm: 0,
        totalKerfMm: 0,
      };

    row.totalBarsUsed += 1;
    if (plan.fromInventory) {
      row.inventoryBarsConsumed += 1;
    } else {
      row.newBarsRequired += 1;
      row.purchasedLengthMm += plan.standardBarLengthMm;
    }
    row.netRequiredLengthMm += plan.totalCutLengthMm;
    row.consumedLengthMm += plan.usedLengthMm;
    row.reusableLeftoverMm += plan.reusableLeftoverMm;
    row.scrapMm += plan.scrapMm;
    row.totalKerfMm += plan.totalKerfMm;
    byProfile.set(plan.profileCode, row);
  }

  return [...byProfile.values()].map((row) => {
    const weightKgPerMetre =
      options.weightKgPerMetreByProfile?.[row.profileCode] ??
      options.defaultWeightKgPerMetre ??
      0;
    const ratePerKg =
      options.ratePerKgByProfile?.[row.profileCode] ??
      options.defaultRatePerKg ??
      0;

    const purchaseLengthM = row.purchasedLengthMm / 1000;
    const purchaseWeightKg = round3(purchaseLengthM * weightKgPerMetre);
    const profileCost = round2(purchaseWeightKg * ratePerKg);

    const theoreticalBars =
      row.standardBarLengthMm > 0
        ? Math.ceil(row.netRequiredLengthMm / row.standardBarLengthMm)
        : 0;

    const purchasedMaterialMm = row.purchasedLengthMm;
    const optimizationWastePercent =
      purchasedMaterialMm > 0
        ? round2(((purchasedMaterialMm - row.netRequiredLengthMm) / purchasedMaterialMm) * 100)
        : 0;

    const materialUtilizationPercent =
      purchasedMaterialMm > 0
        ? round2((row.netRequiredLengthMm / purchasedMaterialMm) * 100)
        : row.netRequiredLengthMm > 0
          ? 100
          : 0;

    return {
      ...row,
      theoreticalBars,
      optimizationWastePercent,
      materialUtilizationPercent,
      purchaseWeightKg,
      profileCost,
    };
  });
}

/** @deprecated Use summarizeJobBarUsage — kept for fixed-frame adapter compatibility. */
export function summarizeProfileBarUsage(
  barPlans: OptimizedBarPlan[],
  weightPerMetreKg: number,
  ratePerKg: number,
): Array<{
  profileCode: string;
  profileKey?: ProfileBarUsageSummary["profileKey"];
  requiredBars: number;
  newBarsRequired: number;
  purchasedLengthMm: number;
  consumedLengthMm: number;
  reusableLeftoverMm: number;
  scrapMm: number;
  totalWeightKg: number;
  totalCost: number;
}> {
  return summarizeJobBarUsage(barPlans, {
    defaultWeightKgPerMetre: weightPerMetreKg,
    defaultRatePerKg: ratePerKg,
  }).map((row) => ({
    profileCode: row.profileCode,
    profileKey: row.profileKey,
    requiredBars: row.totalBarsUsed,
    newBarsRequired: row.newBarsRequired,
    purchasedLengthMm: row.purchasedLengthMm,
    consumedLengthMm: row.consumedLengthMm,
    reusableLeftoverMm: row.reusableLeftoverMm,
    scrapMm: row.scrapMm,
    totalWeightKg: row.purchaseWeightKg,
    totalCost: row.profileCost,
  }));
}
