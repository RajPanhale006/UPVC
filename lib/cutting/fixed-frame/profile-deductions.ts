import type { ProfileRateKey } from "@/lib/profiles/types";

import type { FixedFrameGlassThicknessMm } from "./types";

export type FixedFrameGlassDeductionKey = `${ProfileRateKey}:${ProfileRateKey}:${FixedFrameGlassThicknessMm}`;

export type FixedFrameProfileDeductions = {
  frameSideDeductionMm: number;
  frameTopBottomDeductionMm: number;
  glassWidthDeductionMm: number;
  glassHeightDeductionMm: number;
  mullionWidthMm: number;
  beadSupportedThicknesses: FixedFrameGlassThicknessMm[];
};

const BASE_DEDUCTIONS: Record<
  ProfileRateKey,
  Pick<
    FixedFrameProfileDeductions,
    "frameSideDeductionMm" | "frameTopBottomDeductionMm" | "mullionWidthMm" | "beadSupportedThicknesses"
  >
> = {
  "casement-frame": {
    frameSideDeductionMm: 58,
    frameTopBottomDeductionMm: 58,
    mullionWidthMm: 58,
    beadSupportedThicknesses: [4, 5, 6, 8, 10, 12],
  },
  "frame-2-track": {
    frameSideDeductionMm: 50,
    frameTopBottomDeductionMm: 50,
    mullionWidthMm: 50,
    beadSupportedThicknesses: [4, 5, 6, 8],
  },
  "frame-2-5-track": {
    frameSideDeductionMm: 50,
    frameTopBottomDeductionMm: 50,
    mullionWidthMm: 50,
    beadSupportedThicknesses: [4, 5, 6, 8],
  },
  "frame-3-track": {
    frameSideDeductionMm: 52,
    frameTopBottomDeductionMm: 52,
    mullionWidthMm: 52,
    beadSupportedThicknesses: [4, 5, 6, 8, 10],
  },
  sash: {
    frameSideDeductionMm: 52,
    frameTopBottomDeductionMm: 52,
    mullionWidthMm: 52,
    beadSupportedThicknesses: [4, 5, 6],
  },
  "screen-sash": {
    frameSideDeductionMm: 52,
    frameTopBottomDeductionMm: 52,
    mullionWidthMm: 52,
    beadSupportedThicknesses: [4, 5, 6],
  },
  beading: {
    frameSideDeductionMm: 50,
    frameTopBottomDeductionMm: 50,
    mullionWidthMm: 50,
    beadSupportedThicknesses: [4, 5, 6],
  },
  interlock: {
    frameSideDeductionMm: 50,
    frameTopBottomDeductionMm: 50,
    mullionWidthMm: 50,
    beadSupportedThicknesses: [4, 5, 6],
  },
  "casement-sash": {
    frameSideDeductionMm: 58,
    frameTopBottomDeductionMm: 58,
    mullionWidthMm: 58,
    beadSupportedThicknesses: [4, 5, 6, 8],
  },
  "door-sash": {
    frameSideDeductionMm: 58,
    frameTopBottomDeductionMm: 58,
    mullionWidthMm: 58,
    beadSupportedThicknesses: [4, 5, 6, 8, 10],
  },
  "gb36-beading": {
    frameSideDeductionMm: 0,
    frameTopBottomDeductionMm: 0,
    mullionWidthMm: 0,
    beadSupportedThicknesses: [4, 5, 6, 8, 10, 12],
  },
};

/** Glass deduction from welded internal size — profile + bead + thickness specific. */
const GLASS_DEDUCTION_TABLE: Partial<
  Record<FixedFrameGlassDeductionKey, { width: number; height: number }>
> = {
  "casement-frame:gb36-beading:4": { width: 24, height: 24 },
  "casement-frame:gb36-beading:5": { width: 26, height: 26 },
  "casement-frame:gb36-beading:6": { width: 28, height: 28 },
  "casement-frame:gb36-beading:8": { width: 32, height: 32 },
  "casement-frame:gb36-beading:10": { width: 36, height: 36 },
  "casement-frame:gb36-beading:12": { width: 40, height: 40 },
  "frame-2-track:beading:5": { width: 26, height: 26 },
  "frame-2-track:beading:6": { width: 28, height: 28 },
  "frame-3-track:beading:5": { width: 26, height: 26 },
  "frame-3-track:beading:6": { width: 28, height: 28 },
};

function fallbackGlassDeduction(thicknessMm: FixedFrameGlassThicknessMm): {
  width: number;
  height: number;
} {
  const base = 20 + thicknessMm * 1.2;
  return { width: Math.round(base), height: Math.round(base) };
}

export function getFixedFrameProfileDeductions(
  frameProfileKey: ProfileRateKey,
  beadProfileKey: ProfileRateKey,
  glassThicknessMm: FixedFrameGlassThicknessMm,
): FixedFrameProfileDeductions {
  const frameBase = BASE_DEDUCTIONS[frameProfileKey] ?? BASE_DEDUCTIONS["casement-frame"];
  const beadBase = BASE_DEDUCTIONS[beadProfileKey] ?? BASE_DEDUCTIONS["gb36-beading"];
  const key = `${frameProfileKey}:${beadProfileKey}:${glassThicknessMm}` as FixedFrameGlassDeductionKey;
  const glassDeduction =
    GLASS_DEDUCTION_TABLE[key] ?? fallbackGlassDeduction(glassThicknessMm);

  return {
    frameSideDeductionMm: frameBase.frameSideDeductionMm,
    frameTopBottomDeductionMm: frameBase.frameTopBottomDeductionMm,
    mullionWidthMm: frameBase.mullionWidthMm,
    beadSupportedThicknesses: beadBase.beadSupportedThicknesses,
    glassWidthDeductionMm: glassDeduction.width,
    glassHeightDeductionMm: glassDeduction.height,
  };
}

export function isBeadCompatibleWithGlass(
  beadProfileKey: ProfileRateKey,
  glassThicknessMm: FixedFrameGlassThicknessMm,
): boolean {
  const bead = BASE_DEDUCTIONS[beadProfileKey] ?? BASE_DEDUCTIONS["gb36-beading"];
  return bead.beadSupportedThicknesses.includes(glassThicknessMm);
}
