import type { ProfileRateKey } from "@/lib/profiles/types";

import type { FixedFrameBarCut, FixedFrameBarPlan, FixedFrameCutPiece } from "../fixed-frame/types";
import type {
  BarOptimizationConfig,
  CutPiece,
  JobBarOptimizationResult,
  OptimizeJobBarCutsInput,
} from "./types";
import { optimizeJobBarCuts } from "./optimize-job";

function inferComponentType(component: string): CutPiece["componentType"] {
  if (component.startsWith("Frame")) return "FRAME";
  if (component.startsWith("Bead")) return "BEADING";
  if (component.includes("Mullion")) return "MULLION";
  if (component.startsWith("Reinforcement")) return "REINFORCEMENT";
  return component;
}

export function cutPiecesFromFixedFrame(
  pieces: FixedFrameCutPiece[],
  jobId?: string,
): CutPiece[] {
  return pieces.map((piece) => ({
    id: piece.id,
    jobId,
    productId: piece.moduleId,
    windowRef: piece.moduleLabel,
    componentType: inferComponentType(piece.component),
    profileCode: piece.profileCode,
    profileKey: piece.profileKey,
    lengthMm: piece.lengthMm,
    quantity: piece.quantity,
    cuttingAngle: piece.angle,
    sourceSystem: "fixed-frame",
    moduleLabel: piece.moduleLabel,
    componentLabel: piece.component,
  }));
}

export function toFixedFrameBarPlans(
  result: JobBarOptimizationResult,
): FixedFrameBarPlan[] {
  return result.barPlans.map((plan) => ({
    barId: plan.barId,
    profileCode: plan.profileCode,
    profileKey: plan.profileKey as ProfileRateKey,
    barLengthMm: plan.sourceBarLengthMm,
    cuts: plan.cuts.map(
      (cut): FixedFrameBarCut => ({
        cutIndex: cut.cutIndex,
        lengthMm: cut.lengthMm,
        moduleLabel: cut.moduleLabel ?? cut.windowRef ?? "",
        component: cut.componentLabel ?? cut.componentType,
      }),
    ),
    consumedMm: plan.usedLengthMm,
    leftoverMm: plan.remainingLengthMm,
    reusableLeftoverMm: plan.reusableLeftoverMm,
    scrapMm: plan.scrapMm,
    fromInventory: plan.fromInventory,
  }));
}

export function buildFixedFrameOptimizationConfig(input: {
  standardBarLengthMm: number;
  kerfMm: number;
  minimumReusableLengthMm: number;
  savedLeftoverInventoryMm: number[];
  frameProfileCode: string;
  profileStockLengthMm?: Record<string, number>;
}): BarOptimizationConfig {
  return {
    standardBarLengthMm: input.standardBarLengthMm,
    kerfMm: input.kerfMm,
    minimumReusableLengthMm: input.minimumReusableLengthMm,
    savedLeftoverInventoryByProfile: {
      [input.frameProfileCode]: input.savedLeftoverInventoryMm,
    },
    profileStockLengthMm: input.profileStockLengthMm,
  };
}

export function optimizeFixedFrameBarCuts(
  pieces: FixedFrameCutPiece[],
  config: BarOptimizationConfig,
  options?: Omit<OptimizeJobBarCutsInput, "cutPieces" | "config">,
): JobBarOptimizationResult {
  return optimizeJobBarCuts({
    cutPieces: cutPiecesFromFixedFrame(pieces),
    config,
    ...options,
  });
}
