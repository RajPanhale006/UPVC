import type { ProfileRateKey } from "@/lib/profiles/types";

export type CutPieceComponentType =
  | "FRAME"
  | "GLASS_SASH"
  | "SCREEN_SASH"
  | "INTERLOCK"
  | "BEADING"
  | "MULLION"
  | "DOOR_SASH"
  | "REINFORCEMENT"
  | (string & {});

export type CutPiece = {
  id: string;
  jobId?: string;
  productId?: string;
  windowRef?: string;
  componentType: CutPieceComponentType;
  profileCode: string;
  profileKey?: ProfileRateKey;
  lengthMm: number;
  quantity: number;
  cuttingAngle?: string;
  sourceSystem?: string;
  /** Display label (module / opening reference). */
  moduleLabel?: string;
  /** Human-readable component name. */
  componentLabel?: string;
};

export type OptimizedBarCut = {
  cutIndex: number;
  pieceId: string;
  lengthMm: number;
  windowRef?: string;
  componentType: CutPieceComponentType;
  componentLabel?: string;
  moduleLabel?: string;
  cuttingAngle?: string;
};

export type LeftoverStatus = "REUSABLE_LEFTOVER" | "SCRAP";

export type OptimizedBarPlan = {
  barNumber: number;
  barId: string;
  profileCode: string;
  profileKey?: ProfileRateKey;
  standardBarLengthMm: number;
  cuts: OptimizedBarCut[];
  totalCutLengthMm: number;
  totalKerfMm: number;
  usedLengthMm: number;
  remainingLengthMm: number;
  leftoverStatus: LeftoverStatus;
  reusableLeftoverMm: number;
  scrapMm: number;
  fromInventory: boolean;
  /** Physical source length (full bar or leftover piece consumed). */
  sourceBarLengthMm: number;
};

export type LeftoverInventoryEntry = {
  profileCode: string;
  lengthMm: number;
};

export type BarOptimizationConfig = {
  /** Default stock length when a profile has no override (mm). */
  standardBarLengthMm: number;
  kerfMm: number;
  minimumReusableLengthMm: number;
  /** Reusable leftovers available before opening new bars — keyed by profile code. */
  savedLeftoverInventoryByProfile?: Record<string, number[]>;
  /**
   * Legacy untagged leftover lengths — applied only to profiles listed in
   * `legacyLeftoverProfileCodes` (fixed-frame frame profile by default).
   */
  savedLeftoverInventoryMm?: number[];
  legacyLeftoverProfileCodes?: string[];
  /** Per-profile stock length overrides from profile master (mm). */
  profileStockLengthMm?: Record<string, number>;
};

export type ProfileBarUsageSummary = {
  profileCode: string;
  profileKey?: ProfileRateKey;
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
  theoreticalBars: number;
  optimizationWastePercent: number;
  materialUtilizationPercent: number;
  purchaseWeightKg: number;
  profileCost: number;
};

export type JobBarOptimizationResult = {
  barPlans: OptimizedBarPlan[];
  profileSummaries: ProfileBarUsageSummary[];
  updatedInventoryByProfile: Record<string, number[]>;
};

export type OptimizeJobBarCutsInput = {
  cutPieces: CutPiece[];
  config: BarOptimizationConfig;
  weightKgPerMetreByProfile?: Record<string, number>;
  ratePerKgByProfile?: Record<string, number>;
  defaultWeightKgPerMetre?: number;
  defaultRatePerKg?: number;
};
