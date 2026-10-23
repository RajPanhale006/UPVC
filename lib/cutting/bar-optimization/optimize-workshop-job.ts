import {
  DEFAULT_KERF_MM,
  DEFAULT_MINIMUM_REUSABLE_LENGTH_MM,
  DEFAULT_STANDARD_BAR_LENGTH_MM,
} from "./constants";
import {
  extractCutPiecesFromJobProducts,
} from "./extract-from-product";
import {
  groupCutPiecesByProfileCode,
  summarizeCutPiecesByComponentType,
} from "./extract-pieces";
import {
  buildProfileWeightAndRateMaps,
} from "./profile-rate-map";
import { optimizeJobBarCuts } from "./optimize-job";
import type {
  BarOptimizationConfig,
  CutPiece,
  JobBarOptimizationResult,
} from "./types";

import type { JobProduct } from "@/lib/jobs/types";
import type { ProfileRateSettings } from "@/lib/profiles/types";

export type WorkshopJobOptimizationInput = {
  jobId: string;
  products: JobProduct[];
  profileRates?: ProfileRateSettings;
  config?: Partial<BarOptimizationConfig>;
  profileRatePerKg?: number;
};

export type WorkshopJobOptimizationResult = {
  jobId: string;
  cutPieces: CutPiece[];
  piecesByProfileCode: Record<string, CutPiece[]>;
  componentSummary: ReturnType<typeof summarizeCutPiecesByComponentType>;
  optimization: JobBarOptimizationResult;
};

function buildDefaultConfig(
  overrides?: Partial<BarOptimizationConfig>,
): BarOptimizationConfig {
  return {
    standardBarLengthMm:
      overrides?.standardBarLengthMm ?? DEFAULT_STANDARD_BAR_LENGTH_MM,
    kerfMm: overrides?.kerfMm ?? DEFAULT_KERF_MM,
    minimumReusableLengthMm:
      overrides?.minimumReusableLengthMm ?? DEFAULT_MINIMUM_REUSABLE_LENGTH_MM,
    savedLeftoverInventoryByProfile:
      overrides?.savedLeftoverInventoryByProfile ?? {},
    savedLeftoverInventoryMm: overrides?.savedLeftoverInventoryMm,
    legacyLeftoverProfileCodes: overrides?.legacyLeftoverProfileCodes,
    profileStockLengthMm: overrides?.profileStockLengthMm ?? {},
  };
}

/** Known Tonish / workshop profile codes default to 5800 mm unless overridden. */
export function buildStockLengthMapForPieces(
  pieces: CutPiece[],
): Record<string, number> {
  const map: Record<string, number> = {};
  for (const piece of pieces) {
    if (!(piece.profileCode in map)) {
      map[piece.profileCode] = DEFAULT_STANDARD_BAR_LENGTH_MM;
    }
  }
  return map;
}

/**
 * Extract physical cut pieces from all job products and optimize once at job level,
 * grouped by exact profile code. Does not apply legacy UPVC wastage %.
 */
export function optimizeWorkshopJob(
  input: WorkshopJobOptimizationInput,
): WorkshopJobOptimizationResult {
  const cutPieces = extractCutPiecesFromJobProducts(
    input.jobId,
    input.products,
    input.profileRatePerKg ?? input.profileRates?.marketRatePerKg ?? 150,
  );

  const profileStockLengthMmMap = buildStockLengthMapForPieces(cutPieces);

  const config = buildDefaultConfig({
    ...input.config,
    profileStockLengthMm: {
      ...profileStockLengthMmMap,
      ...input.config?.profileStockLengthMm,
    },
  });

  const profileCodes = [...new Set(cutPieces.map((piece) => piece.profileCode))];
  const { weightKgPerMetreByProfile, ratePerKgByProfile } = input.profileRates
    ? buildProfileWeightAndRateMaps({
        profileRates: input.profileRates,
        profileCodes,
      })
    : { weightKgPerMetreByProfile: {}, ratePerKgByProfile: {} };

  const optimization = optimizeJobBarCuts({
    cutPieces,
    config,
    weightKgPerMetreByProfile,
    ratePerKgByProfile,
    defaultWeightKgPerMetre: 0,
    defaultRatePerKg: input.profileRatePerKg ?? input.profileRates?.marketRatePerKg ?? 150,
  });

  return {
    jobId: input.jobId,
    cutPieces,
    piecesByProfileCode: groupCutPiecesByProfileCode(cutPieces),
    componentSummary: summarizeCutPiecesByComponentType(cutPieces),
    optimization,
  };
}
