import type { EnhancedCutRow } from "@/lib/cutting/types";
import type { TrackSystemId } from "@/lib/cutting/types";
import type { CuttingOptions } from "@/lib/cutting/types";
import { MM_PER_FOOT } from "@/lib/units/conversion";
import type { ProfileRateSettings } from "@/lib/profiles/types";

import {
  extractCutPiecesFromTableRows,
  type CutPieceExtractionSource,
} from "./extract-pieces";
import { optimizeJobBarCuts } from "./optimize-job";
import {
  buildProfileWeightAndRateMaps,
  profileCodeToDoorCategory,
  profileCodeToWindowCategory,
  type DoorProfileCategory,
  type WindowProfileCategory,
} from "./profile-rate-map";
import { buildStockLengthMapForPieces } from "./optimize-workshop-job";
import type { BarOptimizationConfig, JobBarOptimizationResult } from "./types";

export function optimizeProductBarCuts(input: {
  tableRows: EnhancedCutRow[];
  productKind: CutPieceExtractionSource["productKind"];
  productId?: string;
  windowRef?: string;
  jobId?: string;
  profileRates: ProfileRateSettings;
  trackSystemId?: TrackSystemId;
  cuttingOptions?: CuttingOptions;
  config?: Partial<BarOptimizationConfig>;
}): JobBarOptimizationResult {
  const source: CutPieceExtractionSource = {
    jobId: input.jobId,
    productId: input.productId ?? "product",
    productKind: input.productKind,
    windowRef: input.windowRef ?? input.productId ?? "Product",
    sourceSystem: input.productKind,
  };

  const cutPieces = extractCutPiecesFromTableRows(input.tableRows, source);
  const profileCodes = [...new Set(cutPieces.map((piece) => piece.profileCode))];
  const { weightKgPerMetreByProfile, ratePerKgByProfile } = buildProfileWeightAndRateMaps({
    profileRates: input.profileRates,
    profileCodes,
    trackSystemId: input.trackSystemId,
    cuttingOptions: input.cuttingOptions,
  });

  const config: BarOptimizationConfig = {
    standardBarLengthMm:
      input.config?.standardBarLengthMm ?? 5800,
    kerfMm: input.config?.kerfMm ?? 3,
    minimumReusableLengthMm: input.config?.minimumReusableLengthMm ?? 300,
    savedLeftoverInventoryByProfile: input.config?.savedLeftoverInventoryByProfile ?? {},
    savedLeftoverInventoryMm: input.config?.savedLeftoverInventoryMm,
    legacyLeftoverProfileCodes: input.config?.legacyLeftoverProfileCodes,
    profileStockLengthMm: {
      ...buildStockLengthMapForPieces(cutPieces),
      ...input.config?.profileStockLengthMm,
    },
  };

  return optimizeJobBarCuts({
    cutPieces,
    config,
    weightKgPerMetreByProfile,
    ratePerKgByProfile,
  });
}

export function resolveSteelPurchaseCost(
  purchasedLengthMm: number,
  steelRatePerFt: number,
): number {
  return Math.round((purchasedLengthMm / MM_PER_FOOT) * steelRatePerFt * 100) / 100;
}

export type AggregatedCategoryCost = {
  category: WindowProfileCategory | DoorProfileCategory;
  profileCodes: string[];
  newBarsRequired: number;
  theoreticalBars: number;
  netRequiredLengthMm: number;
  purchasedLengthMm: number;
  totalKerfMm: number;
  reusableLeftoverMm: number;
  scrapMm: number;
  purchaseWeightKg: number;
  totalCost: number;
};

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function aggregateWindowCategoryCosts(
  optimization: JobBarOptimizationResult,
  trackSystemId: TrackSystemId,
  cuttingOptions: CuttingOptions | undefined,
  steelRatePerFt: number,
): Map<WindowProfileCategory, AggregatedCategoryCost> {
  const map = new Map<WindowProfileCategory, AggregatedCategoryCost>();

  for (const summary of optimization.profileSummaries) {
    const category = profileCodeToWindowCategory(
      summary.profileCode,
      trackSystemId,
      cuttingOptions,
    );
    if (!category) {
      continue;
    }

    const cost =
      category === "steel"
        ? resolveSteelPurchaseCost(summary.purchasedLengthMm, steelRatePerFt)
        : summary.profileCost;

    const row =
      map.get(category) ??
      {
        category,
        profileCodes: [],
        newBarsRequired: 0,
        theoreticalBars: 0,
        netRequiredLengthMm: 0,
        purchasedLengthMm: 0,
        totalKerfMm: 0,
        reusableLeftoverMm: 0,
        scrapMm: 0,
        purchaseWeightKg: 0,
        totalCost: 0,
      };

    row.profileCodes.push(summary.profileCode);
    row.newBarsRequired += summary.newBarsRequired;
    row.theoreticalBars += summary.theoreticalBars;
    row.netRequiredLengthMm += summary.netRequiredLengthMm;
    row.purchasedLengthMm += summary.purchasedLengthMm;
    row.totalKerfMm += summary.totalKerfMm;
    row.reusableLeftoverMm += summary.reusableLeftoverMm;
    row.scrapMm += summary.scrapMm;
    row.purchaseWeightKg = round2(row.purchaseWeightKg + summary.purchaseWeightKg);
    row.totalCost = round2(row.totalCost + cost);
    map.set(category, row);
  }

  return map;
}

export function aggregateDoorCategoryCosts(
  optimization: JobBarOptimizationResult,
): Map<DoorProfileCategory, AggregatedCategoryCost> {
  const map = new Map<DoorProfileCategory, AggregatedCategoryCost>();

  for (const summary of optimization.profileSummaries) {
    const category = profileCodeToDoorCategory(summary.profileCode);
    if (!category) {
      continue;
    }

    const row =
      map.get(category) ??
      {
        category,
        profileCodes: [],
        newBarsRequired: 0,
        theoreticalBars: 0,
        netRequiredLengthMm: 0,
        purchasedLengthMm: 0,
        totalKerfMm: 0,
        reusableLeftoverMm: 0,
        scrapMm: 0,
        purchaseWeightKg: 0,
        totalCost: 0,
      };

    row.profileCodes.push(summary.profileCode);
    row.newBarsRequired += summary.newBarsRequired;
    row.theoreticalBars += summary.theoreticalBars;
    row.netRequiredLengthMm += summary.netRequiredLengthMm;
    row.purchasedLengthMm += summary.purchasedLengthMm;
    row.totalKerfMm += summary.totalKerfMm;
    row.reusableLeftoverMm += summary.reusableLeftoverMm;
    row.scrapMm += summary.scrapMm;
    row.purchaseWeightKg = round2(row.purchaseWeightKg + summary.purchaseWeightKg);
    row.totalCost = round2(row.totalCost + summary.profileCost);
    map.set(category, row);
  }

  return map;
}

export function summarizeBarOptimizationTotals(
  optimization: JobBarOptimizationResult,
  steelRatePerFt: number,
) {
  let newBarsRequired = 0;
  let theoreticalBars = 0;
  let purchasedLengthMm = 0;
  let totalKerfMm = 0;
  let reusableLeftoverMm = 0;
  let scrapMm = 0;
  let totalCost = 0;
  let purchaseWeightKg = 0;

  for (const summary of optimization.profileSummaries) {
    newBarsRequired += summary.newBarsRequired;
    theoreticalBars += summary.theoreticalBars;
    purchasedLengthMm += summary.purchasedLengthMm;
    totalKerfMm += summary.totalKerfMm;
    reusableLeftoverMm += summary.reusableLeftoverMm;
    scrapMm += summary.scrapMm;
    purchaseWeightKg += summary.purchaseWeightKg;
    totalCost +=
      summary.profileCode === "STEEL"
        ? resolveSteelPurchaseCost(summary.purchasedLengthMm, steelRatePerFt)
        : summary.profileCost;
  }

  const materialUtilizationPercent =
    purchasedLengthMm > 0
      ? round2(
          (optimization.profileSummaries.reduce(
            (sum, row) => sum + row.netRequiredLengthMm,
            0,
          ) /
            purchasedLengthMm) *
            100,
        )
      : 0;

  return {
    newBarsRequired,
    theoreticalBars,
    purchasedLengthMm,
    totalKerfMm,
    reusableLeftoverMm,
    scrapMm,
    purchaseWeightKg: round2(purchaseWeightKg),
    totalProfileCost: round2(totalCost),
    materialUtilizationPercent,
  };
}
