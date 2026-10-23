import { getDefaultEstimationInputs } from "@/lib/estimation";
import type { EstimationInputs, GlassSizeOption, LockType } from "@/lib/estimation/types";

export type SimpleQuoteRateSettings = {
  lockType: LockType;
  handleLockRate: number;
  buttonLockRate: number;
  bearingRatePerPiece: number;
  bearingSteelTrackRatePerFt: number;
  glassSize: GlassSizeOption;
  glassRates: Record<GlassSizeOption, number>;
  profitMarginPercent: number;
  /** Lumpsum customer rate per pc when width < 2 ft or height < 2.5 ft. */
  lowersRateBelowMinimum: number;
  /** Lumpsum customer rate per pc at/above minimum size. */
  lowersRateAboveMinimum: number;
};

const GLASS_SIZES: GlassSizeOption[] = ["3mm", "3.5mm", "5mm"];

function parseGlassSize(value: unknown, fallback: GlassSizeOption): GlassSizeOption {
  return value === "3mm" || value === "3.5mm" || value === "5mm" ? value : fallback;
}

function parseGlassRates(
  parsed: Partial<Record<GlassSizeOption, number>> | undefined,
  defaults: Record<GlassSizeOption, number>,
): Record<GlassSizeOption, number> {
  const next = { ...defaults };
  for (const size of GLASS_SIZES) {
    const value = parsed?.[size];
    if (Number.isFinite(value) && (value ?? 0) >= 0) {
      next[size] = value as number;
    }
  }
  return next;
}

const KEY_PREFIX = "upvc-simple-quote-rates-";

export function getDefaultSimpleQuoteRateSettings(): SimpleQuoteRateSettings {
  const defaults = getDefaultEstimationInputs();
  return {
    lockType: defaults.lockType,
    handleLockRate: defaults.lockRates.handleLockRate,
    buttonLockRate: defaults.lockRates.buttonLockRate,
    bearingRatePerPiece: defaults.bearingRatePerPiece,
    bearingSteelTrackRatePerFt: defaults.bearingSteelTrackRatePerFt,
    glassSize: defaults.glassSize,
    glassRates: { ...defaults.glassRates },
    profitMarginPercent: defaults.profitMarginPercent,
    lowersRateBelowMinimum: 0,
    lowersRateAboveMinimum: 0,
  };
}

export function applySimpleQuoteRateSettings(
  inputs: EstimationInputs,
  rateSettings: SimpleQuoteRateSettings,
): EstimationInputs {
  return {
    ...inputs,
    lockType: rateSettings.lockType,
    lockRates: {
      handleLockRate: rateSettings.handleLockRate,
      buttonLockRate: rateSettings.buttonLockRate,
    },
    bearingRatePerPiece: rateSettings.bearingRatePerPiece,
    bearingSteelTrackRatePerFt: rateSettings.bearingSteelTrackRatePerFt,
    glassSize: rateSettings.glassSize,
    glassRates: { ...rateSettings.glassRates },
    profitMarginPercent: rateSettings.profitMarginPercent,
  };
}

export function loadSimpleQuoteRateSettings(jobId: string): SimpleQuoteRateSettings {
  if (typeof window === "undefined") {
    return getDefaultSimpleQuoteRateSettings();
  }

  const raw = window.localStorage.getItem(`${KEY_PREFIX}${jobId}`);
  if (!raw) {
    return getDefaultSimpleQuoteRateSettings();
  }

  try {
    const parsed = JSON.parse(raw) as Partial<SimpleQuoteRateSettings>;
    const defaults = getDefaultSimpleQuoteRateSettings();
    return {
      lockType:
        parsed.lockType === "Button Lock" || parsed.lockType === "Handle Lock"
          ? parsed.lockType
          : defaults.lockType,
      handleLockRate:
        Number.isFinite(parsed.handleLockRate) && (parsed.handleLockRate ?? 0) >= 0
          ? (parsed.handleLockRate as number)
          : defaults.handleLockRate,
      buttonLockRate:
        Number.isFinite(parsed.buttonLockRate) && (parsed.buttonLockRate ?? 0) >= 0
          ? (parsed.buttonLockRate as number)
          : defaults.buttonLockRate,
      bearingRatePerPiece:
        Number.isFinite(parsed.bearingRatePerPiece) && (parsed.bearingRatePerPiece ?? 0) >= 0
          ? (parsed.bearingRatePerPiece as number)
          : defaults.bearingRatePerPiece,
      bearingSteelTrackRatePerFt:
        Number.isFinite(parsed.bearingSteelTrackRatePerFt) &&
        (parsed.bearingSteelTrackRatePerFt ?? 0) >= 0
          ? (parsed.bearingSteelTrackRatePerFt as number)
          : defaults.bearingSteelTrackRatePerFt,
      glassSize: parseGlassSize(parsed.glassSize, defaults.glassSize),
      glassRates: parseGlassRates(parsed.glassRates, defaults.glassRates),
      profitMarginPercent:
        Number.isFinite(parsed.profitMarginPercent) && (parsed.profitMarginPercent ?? 0) >= 0
          ? (parsed.profitMarginPercent as number)
          : defaults.profitMarginPercent,
      lowersRateBelowMinimum:
        Number.isFinite(parsed.lowersRateBelowMinimum) &&
        (parsed.lowersRateBelowMinimum ?? 0) >= 0
          ? (parsed.lowersRateBelowMinimum as number)
          : defaults.lowersRateBelowMinimum,
      lowersRateAboveMinimum:
        Number.isFinite(parsed.lowersRateAboveMinimum) &&
        (parsed.lowersRateAboveMinimum ?? 0) >= 0
          ? (parsed.lowersRateAboveMinimum as number)
          : defaults.lowersRateAboveMinimum,
    };
  } catch {
    return getDefaultSimpleQuoteRateSettings();
  }
}

export function saveSimpleQuoteRateSettings(
  jobId: string,
  settings: SimpleQuoteRateSettings,
): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(`${KEY_PREFIX}${jobId}`, JSON.stringify(settings));
}
