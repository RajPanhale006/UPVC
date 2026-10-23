import { formatFtInches, formatInches, lengthToRunningFt } from "./format-units";
import { getGlassSashProfileCode, getProfileCodeForOptions, getScreenSashProfileCode } from "./presets";
import {
  calculateSarikAllCuts,
  isValidSarikDimensions,
  SARIK_GLASS_PANEL_QTY,
  SARIK_GLASS_SASH_QTY,
  SARIK_GLASS_HEIGHT_LESS_MM,
  SARIK_GLASS_WIDTH_LESS_MM,
  SARIK_MESH_PANEL_QTY,
  SARIK_NET_SASH_QTY,
  SARIK_THREE_GLASS_GLASS_HEIGHT_LESS_MM,
  SARIK_THREE_GLASS_GLASS_WIDTH_LESS_MM,
  SARIK_THREE_GLASS_PANEL_QTY,
  SARIK_THREE_GLASS_SASH_QTY,
} from "./sarik-method";
import {
  getThreeTrackSashConfiguration,
  isSarikThreeGlassNoNet,
  isSarikTwoGlassOneNet,
} from "./sash-configuration";
import type {
  AllCuts,
  CutAngle,
  CuttingOptions,
  CuttingResult,
  EnhancedCutRow,
  FrameCuts,
  MaterialCuts,
  RunningFeetLine,
  SashCuts,
  TrackSystemId,
  WindowDimensions,
} from "./types";

export function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

function calculateFrameStandard(dimensions: WindowDimensions): FrameCuts {
  const frameWidth = dimensions.widthMm;
  const frameHeight = dimensions.heightMm;
  return {
    frameWidth,
    frameHeight,
    frameTop: frameWidth,
    frameBottom: frameWidth,
    frameLeft: frameHeight,
    frameRight: frameHeight,
  };
}

function calculateFrameWorkshop(
  dimensions: WindowDimensions,
  options: CuttingOptions,
): FrameCuts {
  const addW = options.sizeType === "final-frame" ? 0 : options.frameAddWidthMm;
  const addH = options.sizeType === "final-frame" ? 0 : options.frameAddHeightMm;
  const frameWidth = dimensions.widthMm + addW;
  const frameHeight = dimensions.heightMm + addH;
  return {
    frameWidth,
    frameHeight,
    frameTop: frameWidth,
    frameBottom: frameWidth,
    frameLeft: frameHeight,
    frameRight: frameHeight,
  };
}

function calculateSashStandard(
  frame: FrameCuts,
  options: CuttingOptions,
): SashCuts {
  const sashSide = roundToOneDecimal(
    frame.frameHeight -
      (options.profileSectionMm * 2 - options.standardHeightMinusMm),
  );
  const sashTop = roundToOneDecimal(
    (frame.frameWidth -
      (options.profileSectionMm - options.standardWidthMinusMm)) /
      options.divider,
  );

  let interlock = sashSide;
  if (options.customInterlockDeductionEnabled) {
    interlock = roundToOneDecimal(sashSide - options.customInterlockDeductionMm);
  }

  return {
    sashSide,
    sashTop,
    sashBottom: sashTop,
    interlock,
    sashSideWelded: sashSide,
    sashTopWelded: sashTop,
    sashBottomWelded: sashTop,
    interlockWelded: interlock,
  };
}

function calculateSashWorkshop(
  frame: FrameCuts,
  options: CuttingOptions,
  _dimensions: WindowDimensions,
): SashCuts {
  // Sash CUT size (long-point to long-point, before welding).
  // Computed from FRAME cut size (which already includes the +5mm add).
  const sashTop = roundToOneDecimal(
    (frame.frameWidth - options.sashWidthTotalDeductionMm) / options.divider,
  );
  const sashSide = roundToOneDecimal(
    frame.frameHeight - options.sashHeightDeductionMm,
  );

  let interlock = sashSide;
  if (
    options.interlockHeightDeductionMm != null &&
    Number.isFinite(options.interlockHeightDeductionMm)
  ) {
    interlock = roundToOneDecimal(
      frame.frameHeight - options.interlockHeightDeductionMm,
    );
  }

  // Welded (finished) size = cut − welding allowance.
  const w = options.weldingAllowanceMm;
  const sashTopWelded = roundToOneDecimal(sashTop - w);
  const sashSideWelded = roundToOneDecimal(sashSide - w);
  const interlockWelded = roundToOneDecimal(interlock - w);

  return {
    sashSide,
    sashTop,
    sashBottom: sashTop,
    interlock,
    sashSideWelded,
    sashTopWelded,
    sashBottomWelded: sashTopWelded,
    interlockWelded,
  };
}

export function calculateWorkshopGlassSize(
  sashTopCut: number,
  sashSideCut: number,
  options: Pick<
    CuttingOptions,
    "glassWidthLessMm" | "glassHeightStandardLessMm" | "profileSectionMm"
  >,
): { glassWidth: number; glassHeight: number } {
  const glassWidth = roundToOneDecimal(sashTopCut - options.glassWidthLessMm);
  const glassHeight = roundToOneDecimal(
    sashSideCut -
      (options.profileSectionMm * 2 - options.glassHeightStandardLessMm),
  );
  return { glassWidth, glassHeight };
}

export function formatWorkshopGlassTableNotes(options: CuttingOptions): string {
  return `W = Sash Top − ${options.glassWidthLessMm} | H = Sash Side − ((${options.profileSectionMm}×2) − ${options.glassHeightStandardLessMm})`;
}

function sarikContext(
  options: CuttingOptions,
  systemId: TrackSystemId,
) {
  return {
    trackSystemId: systemId,
    sashConfiguration: getThreeTrackSashConfiguration(options),
  };
}

function calculateMaterialCuts(
  frame: FrameCuts,
  sash: SashCuts,
  options: CuttingOptions,
  systemId: TrackSystemId,
): MaterialCuts {
  let glassWidth: number;
  let glassHeight: number;

  if (options.cuttingMethod === "workshop-confirmed") {
    ({ glassWidth, glassHeight } = calculateWorkshopGlassSize(
      sash.sashTop,
      sash.sashSide,
      options,
    ));
  } else if (options.cuttingMethod !== "sarik") {
    glassWidth = roundToOneDecimal(
      sash.sashTop - options.glassWidthDeductionMm,
    );
    glassHeight = roundToOneDecimal(
      sash.sashSide - options.glassHeightDeductionMm,
    );
  } else {
    const threeGlass = isSarikThreeGlassNoNet(options, systemId);
    const glassWidthLess = threeGlass
      ? SARIK_THREE_GLASS_GLASS_WIDTH_LESS_MM
      : SARIK_GLASS_WIDTH_LESS_MM;
    const glassHeightLess = threeGlass
      ? SARIK_THREE_GLASS_GLASS_HEIGHT_LESS_MM
      : SARIK_GLASS_HEIGHT_LESS_MM;
    glassWidth = roundToOneDecimal(sash.sashTopWelded - glassWidthLess);
    glassHeight = roundToOneDecimal(sash.sashSideWelded - glassHeightLess);
  }

  if (options.cuttingMethod === "sarik") {
    const steelFrameH = roundToOneDecimal(
      frame.frameTop - options.steelDeductionMm,
    );
    const steelFrameV = roundToOneDecimal(
      frame.frameLeft - options.steelDeductionMm,
    );
    const steelSashH = roundToOneDecimal(sash.sashTop - options.steelDeductionMm);
    const steelSashV = roundToOneDecimal(sash.sashSide - options.steelDeductionMm);

    return {
      glassWidth,
      glassHeight,
      beadingWidth: roundToOneDecimal(glassWidth + options.beadingAddMm),
      beadingHeight: roundToOneDecimal(glassHeight + options.beadingAddMm),
      steelFrameH,
      steelFrameV,
      steelSashH,
      steelSashV,
      steelSide: steelSashV,
      steelTop: steelSashH,
      steelBottom: steelSashH,
      meshWidth: 0,
      meshHeight: 0,
    };
  }

  const steelFrameH = roundToOneDecimal(
    frame.frameTop - options.steelDeductionMm,
  );
  const steelFrameV = roundToOneDecimal(
    frame.frameLeft - options.steelDeductionMm,
  );
  const steelSashH = roundToOneDecimal(sash.sashTop - options.steelDeductionMm);
  const steelSashV = roundToOneDecimal(sash.sashSide - options.steelDeductionMm);

  return {
    glassWidth,
    glassHeight,
    beadingWidth: roundToOneDecimal(glassWidth + options.beadingAddMm),
    beadingHeight: roundToOneDecimal(glassHeight + options.beadingAddMm),
    steelFrameH,
    steelFrameV,
    steelSashH,
    steelSashV,
    steelSide: steelSashV,
    steelTop: steelSashH,
    steelBottom: steelSashH,
    meshWidth: 0,
    meshHeight: 0,
  };
}

export function calculateAllCuts(
  dimensions: WindowDimensions,
  options: CuttingOptions,
  systemId: TrackSystemId = "2-track-t60",
): AllCuts {
  if (options.cuttingMethod === "sarik") {
    if (!isValidSarikDimensions(dimensions)) {
      return calculateSarikAllCuts({ widthMm: 0, heightMm: 0 });
    }
    const cuts = calculateSarikAllCuts(dimensions, sarikContext(options, systemId));
    const frame: FrameCuts = {
      frameWidth: cuts.frameWidth,
      frameHeight: cuts.frameHeight,
      frameTop: cuts.frameTop,
      frameBottom: cuts.frameBottom,
      frameLeft: cuts.frameLeft,
      frameRight: cuts.frameRight,
    };
    const sash: SashCuts = {
      sashSide: cuts.sashSide,
      sashTop: cuts.sashTop,
      sashBottom: cuts.sashBottom,
      interlock: cuts.interlock,
      sashSideWelded: cuts.sashSideWelded,
      sashTopWelded: cuts.sashTopWelded,
      sashBottomWelded: cuts.sashBottomWelded,
      interlockWelded: cuts.interlockWelded,
    };
    const materials = calculateMaterialCuts(frame, sash, options, systemId);
    return {
      ...cuts,
      ...materials,
      meshWidth: cuts.meshWidth,
      meshHeight: cuts.meshHeight,
    };
  }

  const emptyNetSash = {
    netSashTop: 0,
    netSashBottom: 0,
    netSashSide: 0,
    netSashTopWelded: 0,
    netSashBottomWelded: 0,
    netSashSideWelded: 0,
  };

  const frame =
    options.cuttingMethod === "workshop-confirmed"
      ? calculateFrameWorkshop(dimensions, options)
      : calculateFrameStandard(dimensions);

  const sash =
    options.cuttingMethod === "workshop-confirmed"
      ? calculateSashWorkshop(frame, options, dimensions)
      : calculateSashStandard(frame, options);

  return {
    ...frame,
    ...sash,
    ...emptyNetSash,
    ...calculateMaterialCuts(frame, sash, options, systemId),
  };
}

/** Legacy helpers used by estimation */
export function calculateSashSide(
  heightMm: number,
  profileSectionMm: number,
  standardHeightMinusMm: number,
): number {
  return roundToOneDecimal(
    heightMm - (profileSectionMm * 2 - standardHeightMinusMm),
  );
}

export function calculateSashTop(
  widthMm: number,
  profileSectionMm: number,
  standardWidthMinusMm: number,
  divider: number,
): number {
  return roundToOneDecimal(
    (widthMm - (profileSectionMm - standardWidthMinusMm)) / divider,
  );
}

export function calculateSashCuts(
  dimensions: WindowDimensions,
  options: CuttingOptions,
  systemId: TrackSystemId = "2-track-t60",
): SashCuts {
  const cuts = calculateAllCuts(dimensions, options, systemId);
  return {
    sashSide: cuts.sashSide,
    sashTop: cuts.sashTop,
    sashBottom: cuts.sashBottom,
    interlock: cuts.interlock,
    sashSideWelded: cuts.sashSideWelded,
    sashTopWelded: cuts.sashTopWelded,
    sashBottomWelded: cuts.sashBottomWelded,
    interlockWelded: cuts.interlockWelded,
  };
}

export function buildCutList(
  cuts: AllCuts,
  options: CuttingOptions,
  systemId: TrackSystemId = "2-track-t60",
): CuttingResult["cutList"] {
  const glassQty =
    options.cuttingMethod === "sarik"
      ? isSarikThreeGlassNoNet(options, systemId)
        ? options.glassPanelQty || SARIK_THREE_GLASS_PANEL_QTY
        : options.glassPanelQty || SARIK_GLASS_PANEL_QTY
      : options.glassPanelQty || options.divider;

  if (options.cuttingMethod === "sarik") {
    const twoGlassOneNet = isSarikTwoGlassOneNet(options, systemId);
    const glassSashQty = twoGlassOneNet
      ? SARIK_GLASS_SASH_QTY
      : isSarikThreeGlassNoNet(options, systemId)
        ? options.glassPanelQty || SARIK_THREE_GLASS_PANEL_QTY
        : options.shutterQty;
    const beadingQty = twoGlassOneNet
      ? SARIK_GLASS_SASH_QTY
      : options.shutterQty;
    const steelSashQty = twoGlassOneNet
      ? SARIK_GLASS_SASH_QTY + SARIK_NET_SASH_QTY
      : options.shutterQty;

    const list: CuttingResult["cutList"] = [
      { name: "Frame Top", lengthMm: cuts.frameTop, qty: 1 },
      { name: "Frame Bottom", lengthMm: cuts.frameBottom, qty: 1 },
      { name: "Frame Left", lengthMm: cuts.frameLeft, qty: 1 },
      { name: "Frame Right", lengthMm: cuts.frameRight, qty: 1 },
      {
        name: twoGlassOneNet ? "Glass Sash Side" : "Sash Side",
        lengthMm: cuts.sashSide,
        qty: glassSashQty,
      },
      {
        name: twoGlassOneNet ? "Glass Sash Top" : "Sash Top",
        lengthMm: cuts.sashTop,
        qty: glassSashQty,
      },
      {
        name: twoGlassOneNet ? "Glass Sash Bottom" : "Sash Bottom",
        lengthMm: cuts.sashBottom,
        qty: glassSashQty,
      },
      { name: "Interlock", lengthMm: cuts.interlock, qty: options.interlockQty },
      {
        name: "Glass",
        lengthMm: cuts.glassWidth,
        crossSectionMm: cuts.glassHeight,
        qty: glassQty,
      },
      {
        name: "Beading Width",
        lengthMm: cuts.beadingWidth,
        qty: beadingQty,
      },
      {
        name: "Beading Height",
        lengthMm: cuts.beadingHeight,
        qty: beadingQty,
      },
      { name: "Steel Frame H", lengthMm: cuts.steelFrameH, qty: 2 },
      { name: "Steel Frame V", lengthMm: cuts.steelFrameV, qty: 2 },
      { name: "Steel Sash H", lengthMm: cuts.steelSashH, qty: steelSashQty },
      { name: "Steel Sash V", lengthMm: cuts.steelSashV, qty: steelSashQty },
    ];

    if (twoGlassOneNet) {
      list.splice(7, 0,
        { name: "Net Sash Side", lengthMm: cuts.netSashSide, qty: SARIK_NET_SASH_QTY },
        { name: "Net Sash Top", lengthMm: cuts.netSashTop, qty: SARIK_NET_SASH_QTY },
        { name: "Net Sash Bottom", lengthMm: cuts.netSashBottom, qty: SARIK_NET_SASH_QTY },
      );
      list.splice(
        list.findIndex((item) => item.name === "Glass") + 1,
        0,
        {
          name: "Jaali / Mesh",
          lengthMm: cuts.meshWidth,
          crossSectionMm: cuts.meshHeight,
          qty: SARIK_MESH_PANEL_QTY,
        },
      );
    }

    return list;
  }

  return [
    { name: "Frame Top", lengthMm: cuts.frameTop, qty: 1 },
    { name: "Frame Bottom", lengthMm: cuts.frameBottom, qty: 1 },
    { name: "Frame Left", lengthMm: cuts.frameLeft, qty: 1 },
    { name: "Frame Right", lengthMm: cuts.frameRight, qty: 1 },
    { name: "Sash Side", lengthMm: cuts.sashSide, qty: options.shutterQty },
    { name: "Sash Top", lengthMm: cuts.sashTop, qty: options.shutterQty },
    { name: "Sash Bottom", lengthMm: cuts.sashBottom, qty: options.shutterQty },
    { name: "Interlock", lengthMm: cuts.interlock, qty: options.interlockQty },
    {
      name: "Glass",
      lengthMm: cuts.glassWidth,
      crossSectionMm: cuts.glassHeight,
      qty: glassQty,
    },
    {
      name: "Beading Width",
      lengthMm: cuts.beadingWidth,
      qty: options.shutterQty,
    },
    {
      name: "Beading Height",
      lengthMm: cuts.beadingHeight,
      qty: options.shutterQty,
    },
    { name: "Steel Frame H", lengthMm: cuts.steelFrameH, qty: 2 },
    { name: "Steel Frame V", lengthMm: cuts.steelFrameV, qty: 2 },
    { name: "Steel Sash H", lengthMm: cuts.steelSashH, qty: options.shutterQty },
    { name: "Steel Sash V", lengthMm: cuts.steelSashV, qty: options.shutterQty },
  ];
}

export function buildRunningFeetSummary(
  cuts: AllCuts,
  options: CuttingOptions,
  numberOfWindows: number,
  systemId: TrackSystemId = "2-track-t60",
): RunningFeetLine[] {
  const n = Math.max(1, numberOfWindows);
  const twoGlassOneNet =
    options.cuttingMethod === "sarik" && isSarikTwoGlassOneNet(options, systemId);
  const glassQty =
    options.cuttingMethod === "sarik"
      ? isSarikThreeGlassNoNet(options, systemId)
        ? options.glassPanelQty || SARIK_THREE_GLASS_PANEL_QTY
        : options.glassPanelQty || SARIK_GLASS_PANEL_QTY
      : options.glassPanelQty || options.divider;

  const glassSashQty = twoGlassOneNet ? SARIK_GLASS_SASH_QTY : options.shutterQty;
  const beadingQty = twoGlassOneNet ? SARIK_GLASS_SASH_QTY : options.shutterQty;
  const steelSashQty = twoGlassOneNet
    ? SARIK_GLASS_SASH_QTY + SARIK_NET_SASH_QTY
    : options.shutterQty;

  const lines: { label: string; mm: number; qty: number }[] = [
    { label: "Frame", mm: cuts.frameTop, qty: 2 * n },
    { label: "Frame", mm: cuts.frameLeft, qty: 2 * n },
    {
      label: twoGlassOneNet ? "Glass sash" : "Sash",
      mm: cuts.sashTop,
      qty: glassSashQty * n,
    },
    {
      label: twoGlassOneNet ? "Glass sash" : "Sash",
      mm: cuts.sashSide,
      qty: glassSashQty * n,
    },
    { label: "Interlock", mm: cuts.interlock, qty: options.interlockQty * n },
    { label: "Beading", mm: cuts.beadingWidth, qty: beadingQty * n },
    { label: "Beading", mm: cuts.beadingHeight, qty: beadingQty * n },
    { label: "Steel frame", mm: cuts.steelFrameH, qty: 2 * n },
    { label: "Steel sash", mm: cuts.steelSashH, qty: steelSashQty * n },
    { label: "Glass width", mm: cuts.glassWidth, qty: glassQty * n },
  ];

  if (twoGlassOneNet) {
    lines.splice(
      4,
      0,
      { label: "Net sash", mm: cuts.netSashTop, qty: SARIK_NET_SASH_QTY * n },
      { label: "Net sash", mm: cuts.netSashSide, qty: SARIK_NET_SASH_QTY * n },
    );
    lines.push({
      label: "Jaali / mesh",
      mm: cuts.meshWidth,
      qty: SARIK_MESH_PANEL_QTY * n,
    });
  }

  const grouped = new Map<string, number>();
  for (const line of lines) {
    grouped.set(line.label, (grouped.get(line.label) ?? 0) + lengthToRunningFt(line.mm, line.qty));
  }

  return Array.from(grouped.entries()).map(([label, feet]) => ({
    label,
    feet: Math.round(feet * 100) / 100,
  }));
}

export function buildEnhancedCutTable(
  cuts: AllCuts,
  options: CuttingOptions,
  systemId: TrackSystemId,
  numberOfWindows: number,
): EnhancedCutRow[] {
  const profileCode = getProfileCodeForOptions(systemId, options);
  const glassSashProfileCode = getGlassSashProfileCode();
  const screenSashProfileCode = getScreenSashProfileCode(systemId, options);
  const n = Math.max(1, numberOfWindows);
  const isSarik = options.cuttingMethod === "sarik";
  const isWorkshop = options.cuttingMethod === "workshop-confirmed";
  const threeGlassSarik = isSarik && isSarikThreeGlassNoNet(options, systemId);
  const twoGlassOneNet = isSarik && isSarikTwoGlassOneNet(options, systemId);
  const glassQty = isSarik
    ? threeGlassSarik
      ? options.glassPanelQty || SARIK_THREE_GLASS_PANEL_QTY
      : options.glassPanelQty || SARIK_GLASS_PANEL_QTY
    : options.glassPanelQty || options.divider;
  const sashHalfQty = Math.max(1, options.shutterQty / 2);
  const glassSashQty = twoGlassOneNet
    ? SARIK_GLASS_SASH_QTY
    : threeGlassSarik
      ? SARIK_THREE_GLASS_SASH_QTY
      : sashHalfQty;
  const sashLabelPrefix = twoGlassOneNet || threeGlassSarik ? "Glass Sash" : "Sash";
  /** Sliding glass sash is always T60-051 — not the frame SKU (T60-431-1 / T109-600). */
  const sashProfileCode = glassSashProfileCode;
  const beadingQty = twoGlassOneNet ? SARIK_GLASS_SASH_QTY : options.shutterQty;
  const steelSashQty = twoGlassOneNet
    ? SARIK_GLASS_SASH_QTY + SARIK_NET_SASH_QTY
    : options.shutterQty;

  type RowDef = {
    item: string;
    code: string;
    qty: number;
    mm: number;
    afterWelding?: number | null;
    afterWeldingCross?: number | null;
    cross?: number;
    angle: CutAngle;
    notes: string;
  };

  const rows: RowDef[] = [
    {
      item: "Frame Top",
      code: profileCode,
      qty: 1,
      mm: cuts.frameTop,
      afterWelding: isSarik ? cuts.frameWidth : undefined,
      angle: "45° both side",
      notes: "Long point to long point",
    },
    {
      item: "Frame Bottom",
      code: profileCode,
      qty: 1,
      mm: cuts.frameBottom,
      afterWelding: isSarik ? cuts.frameWidth : undefined,
      angle: "45° both side",
      notes: "Long point to long point",
    },
    {
      item: "Frame Left",
      code: profileCode,
      qty: 1,
      mm: cuts.frameLeft,
      afterWelding: isSarik ? cuts.frameHeight : undefined,
      angle: "45° both side",
      notes: "Long point to long point",
    },
    {
      item: "Frame Right",
      code: profileCode,
      qty: 1,
      mm: cuts.frameRight,
      afterWelding: isSarik ? cuts.frameHeight : undefined,
      angle: "45° both side",
      notes: "Long point to long point",
    },
    {
      item: `${sashLabelPrefix} Top`,
      code: sashProfileCode,
      qty: glassSashQty,
      mm: cuts.sashTop,
      afterWelding: isSarik || isWorkshop ? cuts.sashTopWelded : undefined,
      angle: "45° both side",
      notes: "Long point to long point",
    },
    {
      item: `${sashLabelPrefix} Bottom`,
      code: sashProfileCode,
      qty: glassSashQty,
      mm: cuts.sashBottom,
      afterWelding: isSarik || isWorkshop ? cuts.sashBottomWelded : undefined,
      angle: "45° both side",
      notes: "Long point to long point",
    },
    {
      item: `${sashLabelPrefix} Side`,
      code: sashProfileCode,
      qty: glassSashQty,
      mm: cuts.sashSide,
      afterWelding: isSarik || isWorkshop ? cuts.sashSideWelded : undefined,
      angle: "45° both side",
      notes: "Long point to long point",
    },
    {
      item: "Interlock",
      code: profileCode,
      qty: options.interlockQty,
      mm: cuts.interlock,
      afterWelding: isSarik || isWorkshop ? cuts.interlockWelded : undefined,
      angle: "90° straight",
      notes: "",
    },
    {
      item: "Glass",
      code: "GLASS",
      qty: glassQty,
      mm: cuts.glassWidth,
      cross: cuts.glassHeight,
      angle: "90° straight",
      notes: isSarik
        ? threeGlassSarik
          ? `W = Sash after-weld W − ${SARIK_THREE_GLASS_GLASS_WIDTH_LESS_MM} | H = Sash after-weld H − ${SARIK_THREE_GLASS_GLASS_HEIGHT_LESS_MM}`
          : `W = Sash after-weld W − ${SARIK_GLASS_WIDTH_LESS_MM} | H = Sash after-weld H − ${SARIK_GLASS_HEIGHT_LESS_MM}`
        : isWorkshop
          ? formatWorkshopGlassTableNotes(options)
          : "",
    },
    {
      item: "Beading H",
      code: profileCode,
      qty: beadingQty,
      mm: cuts.beadingWidth,
      angle: "45° both side",
      notes: "Long point to long point",
    },
    {
      item: "Beading V",
      code: profileCode,
      qty: beadingQty,
      mm: cuts.beadingHeight,
      angle: "45° both side",
      notes: "Long point to long point",
    },
    {
      item: "Steel Frame H",
      code: "STEEL",
      qty: 2,
      mm: cuts.steelFrameH,
      angle: "90° straight",
      notes: "",
    },
    {
      item: "Steel Frame V",
      code: "STEEL",
      qty: 2,
      mm: cuts.steelFrameV,
      angle: "90° straight",
      notes: "",
    },
    {
      item: "Steel Sash H",
      code: "STEEL",
      qty: steelSashQty,
      mm: cuts.steelSashH,
      angle: "90° straight",
      notes: "",
    },
    {
      item: "Steel Sash V",
      code: "STEEL",
      qty: steelSashQty,
      mm: cuts.steelSashV,
      angle: "90° straight",
      notes: "",
    },
  ];

  if (twoGlassOneNet) {
    const interlockIndex = rows.findIndex((row) => row.item === "Interlock");
    rows.splice(
      interlockIndex,
      0,
      {
        item: "Net Sash Top",
        code: screenSashProfileCode,
        qty: SARIK_NET_SASH_QTY,
        mm: cuts.netSashTop,
        afterWelding: cuts.netSashTopWelded,
        angle: "45° both side",
        notes: "Third track screen sash",
      },
      {
        item: "Net Sash Bottom",
        code: screenSashProfileCode,
        qty: SARIK_NET_SASH_QTY,
        mm: cuts.netSashBottom,
        afterWelding: cuts.netSashBottomWelded,
        angle: "45° both side",
        notes: "Third track screen sash",
      },
      {
        item: "Net Sash Side",
        code: screenSashProfileCode,
        qty: SARIK_NET_SASH_QTY,
        mm: cuts.netSashSide,
        afterWelding: cuts.netSashSideWelded,
        angle: "45° both side",
        notes: "Third track screen sash",
      },
    );

    const glassIndex = rows.findIndex((row) => row.item === "Glass");
    rows.splice(glassIndex + 1, 0, {
      item: "Jaali / Mesh",
      code: "JAALI",
      qty: SARIK_MESH_PANEL_QTY,
      mm: cuts.meshWidth,
      cross: cuts.meshHeight,
      angle: "90° straight",
      notes: `W = Net sash after-weld W − ${SARIK_GLASS_WIDTH_LESS_MM} | H = Net sash after-weld H − ${SARIK_GLASS_HEIGHT_LESS_MM}`,
    });
  }

  return mapTableRows(rows, n);
}

function mapTableRows(rows: {
  item: string;
  code: string;
  qty: number;
  mm: number;
  afterWelding?: number | null;
  afterWeldingCross?: number | null;
  cross?: number;
  angle: CutAngle;
  notes: string;
}[], n: number): EnhancedCutRow[] {
  return rows.map((row, index) => ({
    srNo: index + 1,
    item: row.item,
    profileCode: row.code,
    qtyPerWindow: row.qty,
    cutSizeMm: row.mm,
    afterWeldingMm: row.afterWelding,
    afterWeldingCrossMm: row.afterWeldingCross,
    cutSizeCrossMm: row.cross,
    cutSizeInch: row.cross != null
      ? `${formatInches(row.mm)} × ${formatInches(row.cross)}`
      : formatInches(row.mm),
    cutSizeFtInch: row.cross != null
      ? `${formatFtInches(row.mm)} × ${formatFtInches(row.cross)}`
      : formatFtInches(row.mm),
    cutAngle: row.angle,
    totalQty: row.qty * n,
    totalRunningFt: lengthToRunningFt(row.mm, row.qty * n),
    notes: row.notes,
  }));
}

export function calculateCutting(
  dimensions: WindowDimensions,
  options: CuttingOptions,
  systemId: TrackSystemId = "2-track-t60",
  numberOfWindows = 1,
): CuttingResult {
  const cuts = calculateAllCuts(dimensions, options, systemId);

  return {
    cuts,
    cutList: buildCutList(cuts, options, systemId),
    tableRows: buildEnhancedCutTable(cuts, options, systemId, numberOfWindows),
    runningFeetSummary: buildRunningFeetSummary(
      cuts,
      options,
      numberOfWindows,
      systemId,
    ),
  };
}

export { feetToMm } from "@/lib/units/conversion";
