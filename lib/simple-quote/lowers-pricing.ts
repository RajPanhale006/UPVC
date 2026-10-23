import { MM_PER_FOOT } from "@/lib/units/conversion";

import { getRowHeightMm, getRowWidthMm } from "./row-dimensions";
import type { SimpleQuoteRateSettings } from "./rate-settings";
import type { SimpleQuoteProductType, SimpleQuoteRow } from "./types";

export const LOWERS_MIN_WIDTH_FT = 2;
export const LOWERS_MIN_HEIGHT_FT = 2.5;

export const LOWERS_MATERIALS = [
  "Casement frame (P60A-052)",
  "Lowers blade",
  "Lowers glass",
] as const;

export type LowersPricingTier = "below-minimum" | "above-minimum";

export function isLowersProduct(type: SimpleQuoteProductType): boolean {
  return type === "lowers";
}

export function getRowWidthFt(row: SimpleQuoteRow): number {
  return getRowWidthMm(row) / MM_PER_FOOT;
}

export function getRowHeightFt(row: SimpleQuoteRow): number {
  return getRowHeightMm(row) / MM_PER_FOOT;
}

export function isBelowLowersMinimumSize(row: SimpleQuoteRow): boolean {
  return (
    getRowWidthFt(row) < LOWERS_MIN_WIDTH_FT || getRowHeightFt(row) < LOWERS_MIN_HEIGHT_FT
  );
}

export function resolveLowersRatePerPiece(
  row: SimpleQuoteRow,
  settings: SimpleQuoteRateSettings,
): { ratePerPiece: number; tier: LowersPricingTier } {
  if (isBelowLowersMinimumSize(row)) {
    return {
      ratePerPiece: settings.lowersRateBelowMinimum,
      tier: "below-minimum",
    };
  }
  return {
    ratePerPiece: settings.lowersRateAboveMinimum,
    tier: "above-minimum",
  };
}

export function formatLowersPricingNote(tier: LowersPricingTier, ratePerPiece: number): string {
  if (tier === "below-minimum") {
    return `Below ${LOWERS_MIN_WIDTH_FT}×${LOWERS_MIN_HEIGHT_FT} ft — ₹${ratePerPiece}/pc lumpsum`;
  }
  return `At/above ${LOWERS_MIN_WIDTH_FT}×${LOWERS_MIN_HEIGHT_FT} ft — ₹${ratePerPiece}/pc lumpsum`;
}
