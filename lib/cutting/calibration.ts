import { calculateAllCuts } from "./calculate-sash-cuts";
import { calculateSarikComponents } from "./sarik-method";
import type {
  CalibrationInput,
  CalibrationResult,
  CuttingOptions,
  SarikCuttingParams,
  WorkshopCuttingParams,
} from "./types";

const TOLERANCE_MM = 1;

export function compareWithinTolerance(
  calculated: number,
  expected: number,
  tolerance = TOLERANCE_MM,
): { diff: number; ok: boolean } {
  const diff = Math.round((calculated - expected) * 10) / 10;
  return { diff, ok: Math.abs(diff) <= tolerance };
}

export function runCalibration(
  input: CalibrationInput,
  options: CuttingOptions,
): CalibrationResult {
  const calculatedCuts = calculateAllCuts(
    { widthMm: input.sampleWidthMm, heightMm: input.sampleHeightMm },
    options,
  );

  if (options.cuttingMethod === "sarik") {
    const sarik = calculateSarikComponents({
      widthMm: input.sampleWidthMm,
      heightMm: input.sampleHeightMm,
    });

    const calculated = {
      frameCutWidth: sarik.outerFrame.cuttingWidthMm,
      frameCutHeight: sarik.outerFrame.cuttingHeightMm,
      frameWidth: sarik.outerFrame.afterWeldingWidthMm,
      frameHeight: sarik.outerFrame.afterWeldingHeightMm,
      sashCutWidth: sarik.sash.cuttingWidthMm,
      sashCutHeight: sarik.sash.cuttingHeightMm,
      sashAfterWidth: sarik.sash.afterWeldingWidthMm,
      sashAfterHeight: sarik.sash.afterWeldingHeightMm,
      glassWidth: sarik.glass.widthMm,
      glassHeight: sarik.glass.heightMm,
    };

    const differences: Record<string, number> = {
      frameCutWidth:
        calculated.frameCutWidth - (input.actualFrameCutWidth ?? input.actualFrameWidth),
      frameCutHeight:
        calculated.frameCutHeight - (input.actualFrameCutHeight ?? input.actualFrameHeight),
      frameWidth: calculated.frameWidth - input.actualFrameWidth,
      frameHeight: calculated.frameHeight - input.actualFrameHeight,
      sashCutWidth:
        calculated.sashCutWidth - (input.actualSashTopCut ?? input.actualSashTop),
      sashCutHeight:
        calculated.sashCutHeight - (input.actualSashSideCut ?? input.actualSashSide),
      sashAfterWidth: calculated.sashAfterWidth - input.actualSashTop,
      sashAfterHeight: calculated.sashAfterHeight - input.actualSashSide,
      glassWidth: calculated.glassWidth - input.actualGlassWidth,
      glassHeight: calculated.glassHeight - input.actualGlassHeight,
    };

    return { calculated, differences, suggestedAdjustments: {} };
  }

  const calculated = {
    frameWidth: calculatedCuts.frameWidth,
    frameHeight: calculatedCuts.frameHeight,
    sashTop: calculatedCuts.sashTopWelded,
    sashSide: calculatedCuts.sashSideWelded,
    interlock: calculatedCuts.interlockWelded,
    glassWidth: calculatedCuts.glassWidth,
    glassHeight: calculatedCuts.glassHeight,
  };

  const differences: Record<string, number> = {
    frameWidth: calculated.frameWidth - input.actualFrameWidth,
    frameHeight: calculated.frameHeight - input.actualFrameHeight,
    sashTop: calculated.sashTop - input.actualSashTop,
    sashSide: calculated.sashSide - input.actualSashSide,
    interlock: calculated.interlock - input.actualInterlock,
    glassWidth: calculated.glassWidth - input.actualGlassWidth,
    glassHeight: calculated.glassHeight - input.actualGlassHeight,
  };

  const suggestedAdjustments: Partial<WorkshopCuttingParams> = {};

  if (options.cuttingMethod === "workshop-confirmed") {
    const frameWidthDiff = differences.frameWidth ?? 0;
    const frameHeightDiff = differences.frameHeight ?? 0;
    const sashTopDiff = differences.sashTop ?? 0;
    const sashSideDiff = differences.sashSide ?? 0;

    suggestedAdjustments.frameAddWidthMm =
      options.frameAddWidthMm - frameWidthDiff;
    suggestedAdjustments.frameAddHeightMm =
      options.frameAddHeightMm - frameHeightDiff;
    suggestedAdjustments.sashWidthTotalDeductionMm =
      options.sashWidthTotalDeductionMm + sashTopDiff * options.divider;
    suggestedAdjustments.sashHeightDeductionMm =
      options.sashHeightDeductionMm + sashSideDiff;

    if (options.interlockHeightDeductionMm != null) {
      suggestedAdjustments.interlockHeightDeductionMm =
        options.interlockHeightDeductionMm +
        (differences.interlock ?? 0);
    }
  }

  return { calculated, differences, suggestedAdjustments };
}

export function applyCalibrationAdjustments(
  options: CuttingOptions,
  suggested: Partial<WorkshopCuttingParams & SarikCuttingParams>,
): CuttingOptions {
  return {
    ...options,
    frameAddWidthMm: suggested.frameAddWidthMm ?? options.frameAddWidthMm,
    frameAddHeightMm: suggested.frameAddHeightMm ?? options.frameAddHeightMm,
    sashWidthTotalDeductionMm:
      suggested.sashWidthTotalDeductionMm ?? options.sashWidthTotalDeductionMm,
    sashHeightDeductionMm:
      suggested.sashHeightDeductionMm ?? options.sashHeightDeductionMm,
    interlockHeightDeductionMm:
      suggested.interlockHeightDeductionMm !== undefined
        ? suggested.interlockHeightDeductionMm
        : options.interlockHeightDeductionMm,
    frameCuttingExtraWidthMm:
      suggested.frameCuttingExtraWidthMm ?? options.frameCuttingExtraWidthMm,
    frameCuttingExtraHeightMm:
      suggested.frameCuttingExtraHeightMm ?? options.frameCuttingExtraHeightMm,
    sashCuttingExtraWidthMm:
      suggested.sashCuttingExtraWidthMm ?? options.sashCuttingExtraWidthMm,
    sashCuttingExtraHeightMm:
      suggested.sashCuttingExtraHeightMm ?? options.sashCuttingExtraHeightMm,
    weldingLossWidthMm: suggested.weldingLossWidthMm ?? options.weldingLossWidthMm,
    weldingLossHeightMm: suggested.weldingLossHeightMm ?? options.weldingLossHeightMm,
    glassWidthLessMm: suggested.glassWidthLessMm ?? options.glassWidthLessMm,
    glassHeightStandardLessMm:
      suggested.glassHeightStandardLessMm ?? options.glassHeightStandardLessMm,
  };
}

export type VerificationRow = {
  label: string;
  calculated: number;
  expected: number;
  diff: number;
  ok: boolean;
};

export function buildVerificationRows(
  calculated: Record<string, number>,
  expected: Record<string, number>,
): VerificationRow[] {
  return Object.keys(expected).map((key) => {
    const calc = calculated[key] ?? 0;
    const exp = expected[key] ?? 0;
    const { diff, ok } = compareWithinTolerance(calc, exp);
    return { label: key, calculated: calc, expected: exp, diff, ok };
  });
}
