import { calculateProduct } from "@/lib/calculations";
import {
  resolveSteelPurchaseCost,
} from "@/lib/cutting/bar-optimization/build-profile-cost";
import { STEEL_PROFILE_CODE } from "@/lib/cutting/bar-optimization/extract-pieces";
import { resolveProfileDisplayName as resolveLabourProfileName } from "@/lib/cutting/bar-optimization/labour-working-pdf/profile-names";
import {
  buildProfileWeightAndRateMaps,
} from "@/lib/cutting/bar-optimization/profile-rate-map";
import { optimizeWorkshopJob } from "@/lib/cutting/bar-optimization/optimize-workshop-job";
import type { CutPiece } from "@/lib/cutting/bar-optimization/types";
import type { OptimizedBarPlan } from "@/lib/cutting/bar-optimization/types";
import {
  getThreeTrackSashConfiguration,
  isSarikTwoGlassOneNet,
  THREE_TRACK_SASH_CONFIGURATION_LABELS,
} from "@/lib/cutting/sash-configuration";
import { TRACK_LABELS } from "@/lib/estimation/defaults";
import type { DoorHardwareMasterSettings } from "@/lib/door-hardware";
import type { MaterialLineItem } from "@/lib/estimation/types";
import type { WorkshopJob } from "@/lib/jobs/types";
import { profileWeightKgPerMetre } from "@/lib/profiles/stock-length";
import type { ProfileRateSettings } from "@/lib/profiles/types";
import { mmAreaToSqFt } from "@/lib/calculations/format";
import { MM_PER_FOOT } from "@/lib/units/conversion";
import type { CuttingJobMeta } from "@/lib/summary/types";

import {
  resolveCatalogKgPerMetre,
  resolveProfileCategory,
  resolveProfileDisplayName,
} from "./profile-master";
import type {
  MaterialRequiredGlassRow,
  MaterialRequiredHardwareRow,
  MaterialRequiredMeshRow,
  MaterialRequiredProfileRow,
  MaterialRequiredPurchaseSection,
  MaterialRequiredResult,
  MaterialRequiredSteelRow,
  MaterialRequiredStatus,
} from "./types";

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function countCutPieces(
  piecesByProfileCode: Record<string, CutPiece[]>,
  profileCode: string,
): number {
  return (piecesByProfileCode[profileCode] ?? []).reduce(
    (sum, piece) => sum + piece.quantity,
    0,
  );
}

function inventoryLengthUsedMm(barPlans: OptimizedBarPlan[]): number {
  return barPlans
    .filter((bar) => bar.fromInventory)
    .reduce((sum, bar) => sum + bar.sourceBarLengthMm, 0);
}

function resolveStatus(valid: number, total: number): MaterialRequiredStatus {
  if (total === 0) return "invalid";
  if (valid === total) return "ready";
  return "partial";
}

function buildHardwareRows(
  materials: MaterialLineItem[],
  quantity: number,
): MaterialRequiredHardwareRow[] {
  const hardwareKeys = new Set([
    "bearing",
    "lock",
    "screw",
    "brush-rubber",
    "other-hardware",
  ]);

  return materials
    .filter((item) => hardwareKeys.has(item.key))
    .map((item) => ({
      key: `${item.key}`,
      item: item.label,
      sku: item.key.toUpperCase(),
      quantity,
      unit: "set",
      rate: quantity > 0 ? round2(item.amount / quantity) : item.amount,
      amount: item.amount,
      stockAvailable: null,
      purchaseRequired: quantity,
    }));
}

export function buildMaterialRequiredForJob(input: {
  job: WorkshopJob;
  profileRates: ProfileRateSettings;
  doorHardwareMaster: DoorHardwareMasterSettings;
}): MaterialRequiredResult {
  const { job, profileRates, doorHardwareMaster } = input;
  const optimization = optimizeWorkshopJob({
    jobId: job.id,
    products: job.products,
    profileRates,
  });

  const profileCodes = Object.keys(optimization.piecesByProfileCode);
  const { weightKgPerMetreByProfile, ratePerKgByProfile } = buildProfileWeightAndRateMaps({
    profileRates,
    profileCodes,
  });

  const profileMap = new Map(profileRates.profiles.map((row) => [row.key, row]));
  const upvcProfiles: MaterialRequiredProfileRow[] = [];
  const steelRows: MaterialRequiredSteelRow[] = [];

  let steelRatePerFt = 0;

  for (const summary of optimization.optimization.profileSummaries) {
    const barPlans = optimization.optimization.barPlans.filter(
      (bar) => bar.profileCode === summary.profileCode,
    );
    const labourName = resolveLabourProfileName(summary.profileCode, profileRates);

    if (summary.profileCode === STEEL_PROFILE_CODE) {
      const steelRate =
        job.products[0]?.estimationInputs.steelReinforcementRatePerFt ?? steelRatePerFt;
      steelRatePerFt = steelRate;
      steelRows.push({
        profileCode: summary.profileCode,
        profileName: resolveProfileDisplayName(summary.profileCode, labourName),
        kgPerMetre: null,
        standardBarLengthMm: summary.standardBarLengthMm,
        cutPiecesCount: countCutPieces(optimization.piecesByProfileCode, summary.profileCode),
        netRequiredLengthMm: summary.netRequiredLengthMm,
        inventoryBarsConsumed: summary.inventoryBarsConsumed,
        inventoryLengthUsedMm: inventoryLengthUsedMm(barPlans),
        newBarsRequired: summary.newBarsRequired,
        purchasedLengthMm: summary.purchasedLengthMm,
        purchaseRunningFt: round2(summary.purchasedLengthMm / MM_PER_FOOT),
        purchaseWeightKg: summary.purchaseWeightKg,
        rateBasis: "PER_RUNNING_FOOT",
        rate: steelRate,
        amount: resolveSteelPurchaseCost(summary.purchasedLengthMm, steelRate),
        reusableLeftoverMm: summary.reusableLeftoverMm,
        scrapMm: summary.scrapMm,
        totalKerfMm: summary.totalKerfMm,
        barPlans,
      });
      continue;
    }

    const rateKey = optimization.cutPieces.find((piece) => piece.profileCode === summary.profileCode)?.profileKey;
    const profileRate = rateKey ? profileMap.get(rateKey) : undefined;
    const kgPerMetre =
      weightKgPerMetreByProfile[summary.profileCode] ??
      (profileRate ? profileWeightKgPerMetre(profileRate) : null) ??
      resolveCatalogKgPerMetre(summary.profileCode);

    upvcProfiles.push({
      profileCode: summary.profileCode,
      profileName: resolveProfileDisplayName(summary.profileCode, labourName),
      category: resolveProfileCategory(summary.profileCode),
      kgPerMetre,
      standardBarLengthMm: summary.standardBarLengthMm,
      cutPiecesCount: countCutPieces(optimization.piecesByProfileCode, summary.profileCode),
      netRequiredLengthMm: summary.netRequiredLengthMm,
      inventoryBarsConsumed: summary.inventoryBarsConsumed,
      inventoryLengthUsedMm: inventoryLengthUsedMm(barPlans),
      newBarsRequired: summary.newBarsRequired,
      purchasedLengthMm: summary.purchasedLengthMm,
      purchaseWeightKg: summary.purchaseWeightKg,
      ratePerKg: ratePerKgByProfile[summary.profileCode] ?? profileRates.marketRatePerKg,
      amount: summary.profileCost,
      reusableLeftoverMm: summary.reusableLeftoverMm,
      scrapMm: summary.scrapMm,
      totalKerfMm: summary.totalKerfMm,
      materialUtilizationPercent: summary.materialUtilizationPercent,
      optimizationWastePercent: summary.optimizationWastePercent,
      theoreticalBars: summary.theoreticalBars,
      barPlans,
    });
  }

  const glassRows: MaterialRequiredGlassRow[] = [];
  const meshRows: MaterialRequiredMeshRow[] = [];
  const hardwareMap = new Map<string, MaterialRequiredHardwareRow>();

  let validProducts = 0;
  let totalAreaSqft = 0;
  const systems = new Set<string>();

  for (const product of job.products) {
    const meta: CuttingJobMeta = {
      ...job.cuttingJobMeta,
      windowLocation: product.location || job.cuttingJobMeta.windowLocation,
      jobName: product.label || job.cuttingJobMeta.jobName,
    };

    const result = calculateProduct({
      estimationInputs: product.estimationInputs,
      cuttingOptions: product.cuttingOptions,
      profileRates,
      cuttingJobMeta: meta,
      doorHardwareMaster,
    });

    const qty = Math.max(1, product.estimationInputs.numberOfWindows || 1);
    if (!result.validation.isValid || !result.estimation) {
      continue;
    }
    validProducts += 1;
    totalAreaSqft += result.inputDimensions.areaSqFt * qty;

    if (product.productKind === "window" && result.trackSystemId) {
      systems.add(TRACK_LABELS[result.trackSystemId]);
      const sashConfig =
        result.trackSystemId === "3-track-t109"
          ? THREE_TRACK_SASH_CONFIGURATION_LABELS[
              getThreeTrackSashConfiguration(product.cuttingOptions)
            ]
          : null;
      if (sashConfig) {
        systems.add(sashConfig);
      }
    } else if (product.productKind === "door") {
      systems.add("UPVC Door");
    } else {
      systems.add("Fixed Frame");
    }

    const est = result.estimation;
    const glassMaterial = est.materials.find((item) => item.key === "glass");
    const jaaliMaterial = est.materials.find((item) => item.key === "jaali");

    if (result.window?.cutting) {
      const cuts = result.window.cutting.cuts;
      const glassPieces =
        product.productKind === "window" &&
        result.trackSystemId != null &&
        isSarikTwoGlassOneNet(product.cuttingOptions, result.trackSystemId)
          ? 2
          : Math.max(1, qty);

      if (cuts.glassWidth > 0 && cuts.glassHeight > 0) {
        glassRows.push({
          productId: product.id,
          productLabel: product.label,
          productKind: product.productKind,
          quantity: qty,
          glassThickness: product.estimationInputs.glassSize,
          glassType: product.estimationInputs.glassSize,
          pieceCount: glassPieces * qty,
          cutWidthMm: cuts.glassWidth,
          cutHeightMm: cuts.glassHeight,
          actualCutAreaSqft: round2(
            mmAreaToSqFt(cuts.glassWidth, cuts.glassHeight) * glassPieces * qty,
          ),
          costingAreaSqft: round2(est.areaSqft * qty),
          ratePerSqft: round2(
            glassMaterial && est.areaSqft > 0
              ? glassMaterial.amount / (est.areaSqft * qty)
              : 0,
          ),
          amount: glassMaterial?.amount ?? 0,
        });
      }

      if (cuts.meshWidth > 0 && cuts.meshHeight > 0) {
        meshRows.push({
          productId: product.id,
          productLabel: product.label,
          quantity: qty,
          meshWidthMm: cuts.meshWidth,
          meshHeightMm: cuts.meshHeight,
          meshAreaSqft: round2(mmAreaToSqFt(cuts.meshWidth, cuts.meshHeight) * qty),
          ratePerSqft: product.estimationInputs.jaaliRatePerSqft,
          amount: jaaliMaterial?.amount ?? 0,
        });
      }
    }

    if (result.door?.cutting) {
      const cuts = result.door.cutting.cuts;
      if (cuts.glassWidth > 0 && cuts.glassHeight > 0) {
        glassRows.push({
          productId: product.id,
          productLabel: product.label,
          productKind: "door",
          quantity: qty,
          glassThickness: product.estimationInputs.glassSize,
          glassType: product.estimationInputs.glassSize,
          pieceCount: qty,
          cutWidthMm: cuts.glassWidth,
          cutHeightMm: cuts.glassHeight,
          actualCutAreaSqft: round2(mmAreaToSqFt(cuts.glassWidth, cuts.glassHeight) * qty),
          costingAreaSqft: round2(est.areaSqft * qty),
          ratePerSqft: round2(
            glassMaterial && est.areaSqft > 0
              ? glassMaterial.amount / (est.areaSqft * qty)
              : 0,
          ),
          amount: glassMaterial?.amount ?? 0,
        });
      }
    }

    for (const row of buildHardwareRows(est.materials, qty)) {
      const existing = hardwareMap.get(row.key);
      if (existing) {
        existing.quantity += row.quantity;
        existing.amount = round2(existing.amount + row.amount);
        existing.purchaseRequired += row.purchaseRequired;
      } else {
        hardwareMap.set(row.key, { ...row });
      }
    }
  }

  const upvcTotal = round2(upvcProfiles.reduce((sum, row) => sum + row.amount, 0));
  const steelTotal = round2(steelRows.reduce((sum, row) => sum + row.amount, 0));
  const glassTotal = round2(glassRows.reduce((sum, row) => sum + row.amount, 0));
  const meshTotal = round2(meshRows.reduce((sum, row) => sum + row.amount, 0));
  const hardwareTotal = round2(
    [...hardwareMap.values()].reduce((sum, row) => sum + row.amount, 0),
  );

  const purchaseSummary: MaterialRequiredPurchaseSection[] = [
    { id: "upvc", label: "UPVC Profiles", total: upvcTotal },
    { id: "steel", label: "Steel Reinforcement", total: steelTotal },
    { id: "glass", label: "Glass", total: glassTotal },
    { id: "mesh", label: "Mesh / Jaali", total: meshTotal },
    { id: "hardware", label: "Hardware", total: hardwareTotal },
    { id: "consumables", label: "Consumables", total: 0 },
  ];

  const grandTotal = round2(purchaseSummary.reduce((sum, section) => sum + section.total, 0));
  const labourBarCount = optimization.optimization.barPlans.length;
  const materialRequiredBarCount = optimization.optimization.barPlans.filter(
    (bar) => !bar.fromInventory,
  ).length;

  return {
    header: {
      jobId: job.id,
      customerName: job.customerName,
      siteName: job.siteAddress || job.cuttingJobMeta.windowLocation,
      projectName: job.projectName,
      date: new Date().toISOString(),
      totalProducts: job.products.length,
      validProducts,
      totalAreaSqft: round2(totalAreaSqft),
      systemsIncluded: [...systems],
      calculationStatus: resolveStatus(validProducts, job.products.length),
      optimizerStatus:
        optimization.optimization.barPlans.length > 0 ? "ready" : "invalid",
    },
    upvcProfiles: upvcProfiles.sort((a, b) => a.profileCode.localeCompare(b.profileCode)),
    steel: steelRows,
    glass: glassRows,
    mesh: meshRows,
    hardware: [...hardwareMap.values()],
    consumables: [],
    purchaseSummary,
    grandTotal,
    optimization,
    labourBarCount,
    materialRequiredBarCount,
  };
}

export function getMaterialRequiredNewBarTotal(result: MaterialRequiredResult): number {
  return result.upvcProfiles.reduce((sum, row) => sum + row.newBarsRequired, 0) +
    result.steel.reduce((sum, row) => sum + row.newBarsRequired, 0);
}
