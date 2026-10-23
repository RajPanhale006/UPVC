import type { AllCuts, FrameCuts, MaterialCuts, SashCuts, WindowDimensions } from "./types";
import type { ThreeTrackSashConfiguration } from "./types";

/** Fixed Sarik Method constants — two-sash sliding window (2 Glass + 1 Net on 3 Track). */
export const SARIK_FRAME_CUTTING_ADD_MM = 5;
export const SARIK_SASH_CUTTING_ADD_MM = 5;
export const SARIK_SASH_WIDTH_HALF_OFFSET_MM = 1;
export const SARIK_SASH_WIDTH_DEDUCTION_MM = 5;
export const SARIK_SASH_HEIGHT_DEDUCTION_MM = 82;
export const SARIK_GLASS_WIDTH_LESS_MM = 111;
export const SARIK_GLASS_HEIGHT_LESS_MM = 112;
export const SARIK_GLASS_SASH_QTY = 2;
/** @deprecated use SARIK_GLASS_SASH_QTY */
export const SARIK_SASH_QTY = SARIK_GLASS_SASH_QTY;
export const SARIK_GLASS_PANEL_QTY = 2;
export const SARIK_NET_SASH_QTY = 1;
export const SARIK_MESH_PANEL_QTY = 1;
/** @deprecated Net sash now uses the same dimensions as the glass sash. Kept for reference. */
export const SARIK_NET_SASH_WIDTH_GAP_MM = 6;

/** Sarik 3 Glass + No Net (3 Track only). */
export const SARIK_THREE_GLASS_WIDTH_OFFSET_MM = 61;
export const SARIK_THREE_GLASS_GLASS_WIDTH_LESS_MM = 109;
export const SARIK_THREE_GLASS_GLASS_HEIGHT_LESS_MM = 110;
export const SARIK_THREE_GLASS_INTERLOCK_DEDUCTION_MM = 5;
export const SARIK_THREE_GLASS_SASH_QTY = 3;
export const SARIK_THREE_GLASS_PANEL_QTY = 3;

export type SarikComponentSizes = {
  outerFrame: {
    cuttingWidthMm: number;
    cuttingHeightMm: number;
    afterWeldingWidthMm: number;
    afterWeldingHeightMm: number;
  };
  sash: {
    cuttingWidthMm: number;
    cuttingHeightMm: number;
    afterWeldingWidthMm: number;
    afterWeldingHeightMm: number;
  };
  glass: {
    widthMm: number;
    heightMm: number;
  };
  netSash?: {
    cuttingWidthMm: number;
    cuttingHeightMm: number;
    afterWeldingWidthMm: number;
    afterWeldingHeightMm: number;
  };
  mesh?: {
    widthMm: number;
    heightMm: number;
  };
};

function roundSarikMm(value: number): number {
  return Math.round(value);
}

export function isValidSarikDimensions(dimensions: WindowDimensions): boolean {
  return dimensions.widthMm > 0 && dimensions.heightMm > 0;
}

/** Sarik Method — input is final outer frame size after welding (mm). */
export function calculateSarikComponents(
  dimensions: WindowDimensions,
): SarikComponentSizes {
  const { widthMm, heightMm } = dimensions;

  const afterWeldingWidthMm = roundSarikMm(widthMm);
  const afterWeldingHeightMm = roundSarikMm(heightMm);
  const cuttingWidthMm = afterWeldingWidthMm + SARIK_FRAME_CUTTING_ADD_MM;
  const cuttingHeightMm = afterWeldingHeightMm + SARIK_FRAME_CUTTING_ADD_MM;

  const sashAfterWeldingWidthMm = roundSarikMm(
    (afterWeldingWidthMm - SARIK_SASH_WIDTH_HALF_OFFSET_MM) / 2 -
      SARIK_SASH_WIDTH_DEDUCTION_MM,
  );
  const sashAfterWeldingHeightMm = roundSarikMm(
    afterWeldingHeightMm - SARIK_SASH_HEIGHT_DEDUCTION_MM,
  );
  const sashCuttingWidthMm = sashAfterWeldingWidthMm + SARIK_SASH_CUTTING_ADD_MM;
  const sashCuttingHeightMm = sashAfterWeldingHeightMm + SARIK_SASH_CUTTING_ADD_MM;

  const glassWidthMm = sashAfterWeldingWidthMm - SARIK_GLASS_WIDTH_LESS_MM;
  const glassHeightMm = sashAfterWeldingHeightMm - SARIK_GLASS_HEIGHT_LESS_MM;

  return {
    outerFrame: {
      cuttingWidthMm,
      cuttingHeightMm,
      afterWeldingWidthMm,
      afterWeldingHeightMm,
    },
    sash: {
      cuttingWidthMm: sashCuttingWidthMm,
      cuttingHeightMm: sashCuttingHeightMm,
      afterWeldingWidthMm: sashAfterWeldingWidthMm,
      afterWeldingHeightMm: sashAfterWeldingHeightMm,
    },
    glass: {
      widthMm: glassWidthMm,
      heightMm: glassHeightMm,
    },
  };
}

export type SarikCalculationContext = {
  trackSystemId?: string;
  sashConfiguration?: ThreeTrackSashConfiguration;
};

function isThreeGlassNoNetContext(context?: SarikCalculationContext): boolean {
  return (
    context?.trackSystemId === "3-track-t109" &&
    (context?.sashConfiguration ?? "two-glass-one-net") === "three-glass-no-net"
  );
}

export function isSarikTwoGlassOneNetContext(context?: SarikCalculationContext): boolean {
  if (context?.trackSystemId === "2.5-track-t60") {
    return true;
  }
  return (
    context?.trackSystemId === "3-track-t109" &&
    (context?.sashConfiguration ?? "two-glass-one-net") === "two-glass-one-net"
  );
}

function buildNetSashAndMesh(
  sash: SarikComponentSizes["sash"],
): Pick<SarikComponentSizes, "netSash" | "mesh"> {
  /** Net / screen sash uses the same cut and weld sizes as the glass sash. */
  const netSashAfterWeldingWidthMm = sash.afterWeldingWidthMm;
  const netSashAfterWeldingHeightMm = sash.afterWeldingHeightMm;
  const netSashCuttingWidthMm = sash.cuttingWidthMm;
  const netSashCuttingHeightMm = sash.cuttingHeightMm;

  return {
    netSash: {
      cuttingWidthMm: netSashCuttingWidthMm,
      cuttingHeightMm: netSashCuttingHeightMm,
      afterWeldingWidthMm: netSashAfterWeldingWidthMm,
      afterWeldingHeightMm: netSashAfterWeldingHeightMm,
    },
    mesh: {
      widthMm: netSashAfterWeldingWidthMm - SARIK_GLASS_WIDTH_LESS_MM,
      heightMm: netSashAfterWeldingHeightMm - SARIK_GLASS_HEIGHT_LESS_MM,
    },
  };
}

/** Sarik Method — 3 Track, 2 Glass + 1 Net. Glass sash formulas unchanged; adds net sash + mesh. */
export function calculateSarikTwoGlassOneNetComponents(
  dimensions: WindowDimensions,
): SarikComponentSizes {
  const base = calculateSarikComponents(dimensions);
  const { netSash, mesh } = buildNetSashAndMesh(base.sash);
  return { ...base, netSash, mesh };
}

/** Sarik Method — 3 Track, 3 Glass + No Net. Input is final outer frame size after welding (mm). */
export function calculateSarikThreeGlassNoNetComponents(
  dimensions: WindowDimensions,
): SarikComponentSizes {
  const { widthMm, heightMm } = dimensions;

  const afterWeldingWidthMm = roundSarikMm(widthMm);
  const afterWeldingHeightMm = roundSarikMm(heightMm);
  const cuttingWidthMm = afterWeldingWidthMm + SARIK_FRAME_CUTTING_ADD_MM;
  const cuttingHeightMm = afterWeldingHeightMm + SARIK_FRAME_CUTTING_ADD_MM;

  const sashAfterWeldingWidthMm = roundSarikMm(
    (afterWeldingWidthMm + SARIK_THREE_GLASS_WIDTH_OFFSET_MM) / 3,
  );
  const sashAfterWeldingHeightMm = roundSarikMm(
    afterWeldingHeightMm - SARIK_SASH_HEIGHT_DEDUCTION_MM,
  );
  const sashCuttingWidthMm = sashAfterWeldingWidthMm + SARIK_SASH_CUTTING_ADD_MM;
  const sashCuttingHeightMm = sashAfterWeldingHeightMm + SARIK_SASH_CUTTING_ADD_MM;

  const glassWidthMm =
    sashAfterWeldingWidthMm - SARIK_THREE_GLASS_GLASS_WIDTH_LESS_MM;
  const glassHeightMm =
    sashAfterWeldingHeightMm - SARIK_THREE_GLASS_GLASS_HEIGHT_LESS_MM;

  return {
    outerFrame: {
      cuttingWidthMm,
      cuttingHeightMm,
      afterWeldingWidthMm,
      afterWeldingHeightMm,
    },
    sash: {
      cuttingWidthMm: sashCuttingWidthMm,
      cuttingHeightMm: sashCuttingHeightMm,
      afterWeldingWidthMm: sashAfterWeldingWidthMm,
      afterWeldingHeightMm: sashAfterWeldingHeightMm,
    },
    glass: {
      widthMm: glassWidthMm,
      heightMm: glassHeightMm,
    },
  };
}

export function calculateSarikComponentsForContext(
  dimensions: WindowDimensions,
  context?: SarikCalculationContext,
): SarikComponentSizes {
  if (isThreeGlassNoNetContext(context)) {
    return calculateSarikThreeGlassNoNetComponents(dimensions);
  }
  if (isSarikTwoGlassOneNetContext(context)) {
    return calculateSarikTwoGlassOneNetComponents(dimensions);
  }
  return calculateSarikComponents(dimensions);
}

/** Map Sarik components into shared AllCuts shape for PDF/export compatibility. */
export function calculateSarikAllCuts(
  dimensions: WindowDimensions,
  context?: SarikCalculationContext,
): AllCuts {
  const threeGlass = isThreeGlassNoNetContext(context);
  const twoGlassOneNet = isSarikTwoGlassOneNetContext(context);
  const sarik = threeGlass
    ? calculateSarikThreeGlassNoNetComponents(dimensions)
    : twoGlassOneNet
      ? calculateSarikTwoGlassOneNetComponents(dimensions)
      : calculateSarikComponents(dimensions);
  const { outerFrame, sash, glass, netSash, mesh } = sarik;

  const interlockLengthMm = threeGlass
    ? sash.afterWeldingHeightMm - SARIK_THREE_GLASS_INTERLOCK_DEDUCTION_MM
    : sash.cuttingHeightMm;

  const interlockWeldedMm = threeGlass
    ? interlockLengthMm
    : sash.afterWeldingHeightMm;

  const frame: FrameCuts = {
    frameWidth: outerFrame.afterWeldingWidthMm,
    frameHeight: outerFrame.afterWeldingHeightMm,
    frameTop: outerFrame.cuttingWidthMm,
    frameBottom: outerFrame.cuttingWidthMm,
    frameLeft: outerFrame.cuttingHeightMm,
    frameRight: outerFrame.cuttingHeightMm,
  };

  const sashCuts: SashCuts = {
    sashTop: sash.cuttingWidthMm,
    sashBottom: sash.cuttingWidthMm,
    sashSide: sash.cuttingHeightMm,
    sashTopWelded: sash.afterWeldingWidthMm,
    sashBottomWelded: sash.afterWeldingWidthMm,
    sashSideWelded: sash.afterWeldingHeightMm,
    interlock: interlockLengthMm,
    interlockWelded: interlockWeldedMm,
  };

  const materials: MaterialCuts = {
    glassWidth: glass.widthMm,
    glassHeight: glass.heightMm,
    beadingWidth: 0,
    beadingHeight: 0,
    steelFrameH: 0,
    steelFrameV: 0,
    steelSashH: 0,
    steelSashV: 0,
    steelSide: 0,
    steelTop: 0,
    steelBottom: 0,
    meshWidth: mesh?.widthMm ?? 0,
    meshHeight: mesh?.heightMm ?? 0,
  };

  const netSashCuts =
    twoGlassOneNet && netSash
      ? {
          netSashTop: netSash.cuttingWidthMm,
          netSashBottom: netSash.cuttingWidthMm,
          netSashSide: netSash.cuttingHeightMm,
          netSashTopWelded: netSash.afterWeldingWidthMm,
          netSashBottomWelded: netSash.afterWeldingWidthMm,
          netSashSideWelded: netSash.afterWeldingHeightMm,
        }
      : {
          netSashTop: 0,
          netSashBottom: 0,
          netSashSide: 0,
          netSashTopWelded: 0,
          netSashBottomWelded: 0,
          netSashSideWelded: 0,
        };

  return { ...frame, ...sashCuts, ...netSashCuts, ...materials };
}
