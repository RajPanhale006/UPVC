import {
  DEFAULT_KERF_MM,
  DEFAULT_MINIMUM_REUSABLE_LENGTH_MM,
  DEFAULT_STANDARD_BAR_LENGTH_MM,
} from "./constants";
import { summarizeJobBarUsage } from "./summarize";
import type {
  BarOptimizationConfig,
  CutPiece,
  JobBarOptimizationResult,
  OptimizeJobBarCutsInput,
  OptimizedBarCut,
  OptimizedBarPlan,
} from "./types";

type ExpandedCut = {
  pieceId: string;
  lengthMm: number;
  profileCode: string;
  profileKey?: CutPiece["profileKey"];
  windowRef?: string;
  componentType: CutPiece["componentType"];
  componentLabel?: string;
  moduleLabel?: string;
  cuttingAngle?: string;
};

function resolveStockLengthMm(
  profileCode: string,
  config: BarOptimizationConfig,
): number {
  return (
    config.profileStockLengthMm?.[profileCode] ??
    config.standardBarLengthMm ??
    DEFAULT_STANDARD_BAR_LENGTH_MM
  );
}

function groupByProfileCode(pieces: CutPiece[]): Map<string, CutPiece[]> {
  const map = new Map<string, CutPiece[]>();
  for (const piece of pieces) {
    const list = map.get(piece.profileCode) ?? [];
    list.push(piece);
    map.set(piece.profileCode, list);
  }
  return map;
}

function expandCuts(pieces: CutPiece[]): ExpandedCut[] {
  const expanded: ExpandedCut[] = [];
  for (const piece of pieces) {
    for (let i = 0; i < piece.quantity; i += 1) {
      expanded.push({
        pieceId: piece.id,
        lengthMm: piece.lengthMm,
        profileCode: piece.profileCode,
        profileKey: piece.profileKey,
        windowRef: piece.windowRef ?? piece.moduleLabel,
        componentType: piece.componentType,
        componentLabel: piece.componentLabel ?? piece.componentType,
        moduleLabel: piece.moduleLabel,
        cuttingAngle: piece.cuttingAngle,
      });
    }
  }
  return expanded.sort((a, b) => b.lengthMm - a.lengthMm);
}

function buildInitialInventory(
  profileCode: string,
  config: BarOptimizationConfig,
): number[] {
  const minReusable =
    config.minimumReusableLengthMm ?? DEFAULT_MINIMUM_REUSABLE_LENGTH_MM;
  const specific = config.savedLeftoverInventoryByProfile?.[profileCode] ?? [];
  const legacyCodes = config.legacyLeftoverProfileCodes ?? [];
  const legacy =
    legacyCodes.includes(profileCode) && config.savedLeftoverInventoryMm
      ? config.savedLeftoverInventoryMm
      : [];
  return [...specific, ...legacy].filter((length) => length >= minReusable);
}

function packProfileGroup(
  profileCode: string,
  pieces: CutPiece[],
  config: BarOptimizationConfig,
  barCounterStart: number,
): { barPlans: OptimizedBarPlan[]; updatedInventory: number[]; nextBarCounter: number } {
  const stockLengthMm = resolveStockLengthMm(profileCode, config);
  const kerf = config.kerfMm ?? DEFAULT_KERF_MM;
  const minReusable =
    config.minimumReusableLengthMm ?? DEFAULT_MINIMUM_REUSABLE_LENGTH_MM;
  const expanded = expandCuts(pieces);
  const profileKey = pieces[0]?.profileKey;
  let inventory = buildInitialInventory(profileCode, config);
  const barPlans: OptimizedBarPlan[] = [];
  let barCounter = barCounterStart;

  while (expanded.length > 0) {
    let usedInventory = false;
    let remaining = stockLengthMm;
    const barCuts: OptimizedBarCut[] = [];
    let cutIndex = 0;

    const nextCut = expanded[0]!;
    const invIdx = inventory.findIndex((length) => length >= nextCut.lengthMm + kerf);
    if (invIdx >= 0) {
      remaining = inventory[invIdx]!;
      inventory.splice(invIdx, 1);
      usedInventory = true;
    }

    while (expanded.length > 0) {
      const idx = expanded.findIndex((cut) => cut.lengthMm + kerf <= remaining);
      if (idx < 0) break;
      const cut = expanded.splice(idx, 1)[0]!;
      barCuts.push({
        cutIndex: cutIndex++,
        pieceId: cut.pieceId,
        lengthMm: cut.lengthMm,
        windowRef: cut.windowRef,
        componentType: cut.componentType,
        componentLabel: cut.componentLabel,
        moduleLabel: cut.moduleLabel,
        cuttingAngle: cut.cuttingAngle,
      });
      remaining -= cut.lengthMm + kerf;
    }

    if (barCuts.length === 0 && expanded.length > 0) {
      const forced = expanded.shift()!;
      barCuts.push({
        cutIndex: 0,
        pieceId: forced.pieceId,
        lengthMm: forced.lengthMm,
        windowRef: forced.windowRef,
        componentType: forced.componentType,
        componentLabel: forced.componentLabel,
        moduleLabel: forced.moduleLabel,
        cuttingAngle: forced.cuttingAngle,
      });
      remaining = stockLengthMm - forced.lengthMm - kerf;
    }

    const totalCutLengthMm = barCuts.reduce((sum, cut) => sum + cut.lengthMm, 0);
    const totalKerfMm = Math.max(0, barCuts.length - 1) * kerf;
    const usedLengthMm = totalCutLengthMm + totalKerfMm;
    const sourceBarLengthMm = usedInventory ? usedLengthMm + remaining : stockLengthMm;
    const remainingLengthMm = Math.max(0, sourceBarLengthMm - usedLengthMm);
    const reusableLeftoverMm =
      remainingLengthMm >= minReusable ? remainingLengthMm : 0;
    const scrapMm = remainingLengthMm - reusableLeftoverMm;
    const leftoverStatus: OptimizedBarPlan["leftoverStatus"] =
      reusableLeftoverMm > 0 ? "REUSABLE_LEFTOVER" : "SCRAP";

    if (reusableLeftoverMm > 0) {
      inventory.push(reusableLeftoverMm);
    }

    barCounter += 1;
    barPlans.push({
      barNumber: barCounter,
      barId: `B${String(barCounter).padStart(2, "0")}`,
      profileCode,
      profileKey,
      standardBarLengthMm: stockLengthMm,
      cuts: barCuts,
      totalCutLengthMm,
      totalKerfMm,
      usedLengthMm,
      remainingLengthMm,
      leftoverStatus,
      reusableLeftoverMm,
      scrapMm,
      fromInventory: usedInventory,
      sourceBarLengthMm,
    });
  }

  return { barPlans, updatedInventory: inventory, nextBarCounter: barCounter };
}

/**
 * Pack all cut pieces for a whole job (all windows/products) into physical stock bars.
 * Each profile code is optimized independently — profiles are never mixed on one bar.
 */
export function optimizeJobBarCuts(
  input: OptimizeJobBarCutsInput,
): JobBarOptimizationResult {
  const { cutPieces, config } = input;
  const allBarPlans: OptimizedBarPlan[] = [];
  const updatedInventoryByProfile: Record<string, number[]> = {};
  let barCounter = 0;

  for (const [profileCode, pieces] of groupByProfileCode(cutPieces)) {
    const packed = packProfileGroup(profileCode, pieces, config, barCounter);
    allBarPlans.push(...packed.barPlans);
    updatedInventoryByProfile[profileCode] = packed.updatedInventory;
    barCounter = packed.nextBarCounter;
  }

  const profileSummaries = summarizeJobBarUsage(allBarPlans, {
    weightKgPerMetreByProfile: input.weightKgPerMetreByProfile,
    ratePerKgByProfile: input.ratePerKgByProfile,
    defaultWeightKgPerMetre: input.defaultWeightKgPerMetre,
    defaultRatePerKg: input.defaultRatePerKg,
  });

  return {
    barPlans: allBarPlans,
    profileSummaries,
    updatedInventoryByProfile,
  };
}
