import {
  DEFAULT_JOINT_GAP_MM,
  DEFAULT_MANUAL_WIDTH_TOLERANCE_MM,
  DEFAULT_MAXIMUM_MODULE_WIDTH_MM,
} from "./constants";
import type {
  FixedFrameConstructionMode,
  FixedFrameDivisionMode,
  FixedFrameSettings,
} from "./types";

export type ModuleDivisionInput = {
  openingWidthMm: number;
  openingHeightMm: number;
  constructionMode: FixedFrameConstructionMode;
  divisionMode: FixedFrameDivisionMode;
  maximumModuleWidthMm: number;
  moduleCount: number;
  sectionCount: number;
  moduleWidthsMm: number[];
  leftClearanceMm: number;
  rightClearanceMm: number;
  topClearanceMm: number;
  bottomClearanceMm: number;
  jointGapMm: number;
  manualWidthToleranceMm: number;
};

export type ModuleDivisionResult =
  | {
      ok: true;
      moduleWidthsMm: number[];
      moduleHeightMm: number;
      moduleCount: number;
      sectionCount: number;
      usableWidthMm: number;
      warnings: string[];
    }
  | {
      ok: false;
      error: string;
      warnings: string[];
    };

function roundMm(value: number): number {
  return Math.round(value);
}

export function resolveModuleCount(input: ModuleDivisionInput): number {
  const { constructionMode, divisionMode, moduleCount, maximumModuleWidthMm } = input;
  if (constructionMode === "SINGLE_FRAME") return 1;
  if (constructionMode === "INTERNAL_PARTITIONS") return input.sectionCount;

  if (divisionMode === "AUTO") {
    const usable =
      input.openingWidthMm -
      input.leftClearanceMm -
      input.rightClearanceMm -
      Math.max(0, 0); // no joint gap yet for count calc
    const maxW = maximumModuleWidthMm || DEFAULT_MAXIMUM_MODULE_WIDTH_MM;
    return Math.max(2, Math.ceil(usable / maxW));
  }

  return Math.max(2, moduleCount);
}

export function calculateModuleDivision(
  input: ModuleDivisionInput,
): ModuleDivisionResult {
  const warnings: string[] = [];
  const moduleHeightMm = roundMm(
    input.openingHeightMm - input.topClearanceMm - input.bottomClearanceMm,
  );

  if (moduleHeightMm <= 0) {
    return { ok: false, error: "Module height must be positive after clearances.", warnings };
  }

  if (input.constructionMode === "SINGLE_FRAME") {
    if (input.divisionMode !== "NONE") {
      warnings.push("SINGLE_FRAME ignores division mode — using one module.");
    }
    const widthMm = roundMm(
      input.openingWidthMm - input.leftClearanceMm - input.rightClearanceMm,
    );
    if (widthMm <= 0) {
      return { ok: false, error: "Module width must be positive after clearances.", warnings };
    }
    return {
      ok: true,
      moduleWidthsMm: [widthMm],
      moduleHeightMm,
      moduleCount: 1,
      sectionCount: 1,
      usableWidthMm: widthMm,
      warnings,
    };
  }

  if (input.constructionMode === "INTERNAL_PARTITIONS") {
    const sectionCount = Math.max(2, input.sectionCount);
    const outerWidthMm = roundMm(
      input.openingWidthMm - input.leftClearanceMm - input.rightClearanceMm,
    );
    if (outerWidthMm <= 0) {
      return { ok: false, error: "Outer frame width must be positive.", warnings };
    }
    const partitionCount = sectionCount - 1;
    const mullionTotal = partitionCount * input.jointGapMm;
    const sectionWidth = roundMm((outerWidthMm - mullionTotal) / sectionCount);
    if (sectionWidth <= 0) {
      return {
        ok: false,
        error: "Section width is too small for the selected section count.",
        warnings,
      };
    }
    const moduleWidths = Array.from({ length: sectionCount }, () => sectionWidth);
    return {
      ok: true,
      moduleWidthsMm: moduleWidths,
      moduleHeightMm,
      moduleCount: sectionCount,
      sectionCount,
      usableWidthMm: outerWidthMm,
      warnings,
    };
  }

  // SEPARATE_MODULES
  const resolvedCount = resolveModuleCount(input);
  const jointGaps = Math.max(0, resolvedCount - 1) * input.jointGapMm;
  const usableWidthMm = roundMm(
    input.openingWidthMm -
      input.leftClearanceMm -
      input.rightClearanceMm -
      jointGaps,
  );

  if (usableWidthMm <= 0) {
    return { ok: false, error: "Usable width must be positive after clearances and joint gaps.", warnings };
  }

  if (input.divisionMode === "MANUAL") {
    const manual = input.moduleWidthsMm.filter((w) => w > 0);
    if (manual.length !== resolvedCount) {
      return {
        ok: false,
        error: `Enter ${resolvedCount} manual module widths.`,
        warnings,
      };
    }
    const manualTotal = roundMm(manual.reduce((s, w) => s + w, 0));
    const expectedTotal = roundMm(
      input.openingWidthMm -
        input.leftClearanceMm -
        input.rightClearanceMm -
        jointGaps,
    );
    const tolerance = input.manualWidthToleranceMm || DEFAULT_MANUAL_WIDTH_TOLERANCE_MM;
    if (Math.abs(manualTotal - expectedTotal) > tolerance) {
      return {
        ok: false,
        error: `Manual module widths total ${manualTotal} mm but usable width is ${expectedTotal} mm (±${tolerance} mm).`,
        warnings,
      };
    }
    if (manual.some((w) => w > input.maximumModuleWidthMm)) {
      warnings.push(
        `One or more modules exceed maximum module width (${input.maximumModuleWidthMm} mm).`,
      );
    }
    return {
      ok: true,
      moduleWidthsMm: manual.map(roundMm),
      moduleHeightMm,
      moduleCount: resolvedCount,
      sectionCount: resolvedCount,
      usableWidthMm,
      warnings,
    };
  }

  const equalWidth = roundMm(usableWidthMm / resolvedCount);
  if (equalWidth <= 0) {
    return { ok: false, error: "Equal module width is too small.", warnings };
  }

  const moduleWidths = Array.from({ length: resolvedCount }, () => equalWidth);
  const distributed = roundMm(equalWidth * resolvedCount);
  if (distributed !== usableWidthMm && moduleWidths.length > 0) {
    moduleWidths[moduleWidths.length - 1] += usableWidthMm - distributed;
  }

  if (equalWidth > input.maximumModuleWidthMm) {
    warnings.push(
      `Module width ${equalWidth} mm exceeds maximum (${input.maximumModuleWidthMm} mm). Consider more modules.`,
    );
  }

  return {
    ok: true,
    moduleWidthsMm: moduleWidths,
    moduleHeightMm,
    moduleCount: resolvedCount,
    sectionCount: resolvedCount,
    usableWidthMm,
    warnings,
  };
}

export function divisionInputFromSettings(
  openingWidthMm: number,
  openingHeightMm: number,
  settings: FixedFrameSettings,
): ModuleDivisionInput {
  return {
    openingWidthMm,
    openingHeightMm,
    constructionMode: settings.constructionMode,
    divisionMode: settings.divisionMode,
    maximumModuleWidthMm: settings.maximumModuleWidthMm || DEFAULT_MAXIMUM_MODULE_WIDTH_MM,
    moduleCount: settings.moduleCount,
    sectionCount: settings.sectionCount,
    moduleWidthsMm: settings.moduleWidthsMm,
    leftClearanceMm: settings.leftClearanceMm,
    rightClearanceMm: settings.rightClearanceMm,
    topClearanceMm: settings.topClearanceMm,
    bottomClearanceMm: settings.bottomClearanceMm,
    jointGapMm: settings.jointGapMm || DEFAULT_JOINT_GAP_MM,
    manualWidthToleranceMm:
      settings.manualWidthToleranceMm || DEFAULT_MANUAL_WIDTH_TOLERANCE_MM,
  };
}

export function validateFixedFrameSettings(
  settings: FixedFrameSettings,
  openingWidthMm: number,
  openingHeightMm: number,
): string | null {
  if (openingWidthMm <= 0 || openingHeightMm <= 0) {
    return "Enter valid opening width and height.";
  }

  if (settings.constructionMode === "SINGLE_FRAME") {
    if (settings.moduleCount !== 1 && settings.divisionMode !== "NONE") {
      // auto-corrected at calculation time
    }
    return null;
  }

  if (settings.constructionMode === "SEPARATE_MODULES") {
    if (settings.divisionMode === "NONE") {
      return "SEPARATE_MODULES requires AUTO, EQUAL, or MANUAL division.";
    }
    const count =
      settings.divisionMode === "AUTO"
        ? resolveModuleCount(divisionInputFromSettings(openingWidthMm, openingHeightMm, settings))
        : settings.moduleCount;
    if (count < 2) {
      return "SEPARATE_MODULES requires at least 2 modules.";
    }
  }

  if (settings.constructionMode === "INTERNAL_PARTITIONS") {
    if (settings.sectionCount < 2) {
      return "INTERNAL_PARTITIONS requires at least 2 sections.";
    }
  }

  if (
    !settings.profiles.beadProfileKey ||
    !settings.profiles.frameProfileKey
  ) {
    return "Select frame and bead profiles.";
  }

  return null;
}
