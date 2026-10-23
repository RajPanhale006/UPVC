import {
  calculateFixedFrameCutting,
  createDefaultFixedFrameSettings,
  FIXED_FRAME_METHOD_LABEL,
  validateFixedFrameSettings,
  type FixedFrameSettings,
} from "@/lib/cutting/fixed-frame";
import { formatMmPair } from "@/lib/summary/format";
import type { SummaryComponentRow, SummaryDetailRow } from "@/lib/summary/types";

import { getFixedFrameMethodMeta } from "./method-metadata";
import type { ProductDimensions } from "./types";
import { invalidValidation } from "./validation/validate-calculation";

function buildComponents(
  modules: NonNullable<ReturnType<typeof calculateFixedFrameCutting>>["components"],
): SummaryComponentRow[] {
  return modules.map((mod) => ({
    part: mod.label,
    quantity: "1 Module",
    cuttingSize: formatMmPair(mod.widthMm, mod.heightMm),
    afterWeldingSize: formatMmPair(mod.weldedWidthMm, mod.weldedHeightMm),
  }));
}

function buildDetails(
  cutting: NonNullable<ReturnType<typeof calculateFixedFrameCutting>>,
): SummaryDetailRow[] {
  return cutting.tableRows.map((row) => ({
    name: `${row.moduleLabel} · ${row.component}`,
    qty: row.quantity,
    cuttingSize: `${Math.round(row.lengthMm)} mm`,
    afterWeldingSize: "—",
    angle: row.angle,
  }));
}

export function calculateFixedFrameProduct(input: {
  widthMm: number;
  heightMm: number;
  quantity: number;
  areaSqFt: number;
  fixedFrameSettings?: FixedFrameSettings;
  profileRatePerKg: number;
}) {
  const settings = input.fixedFrameSettings ?? createDefaultFixedFrameSettings();
  const method = getFixedFrameMethodMeta();
  const profileCode = `${settings.profiles.frameProfileCode} / ${settings.profiles.beadProfileCode}`;
  const dimensions: ProductDimensions = {
    widthMm: input.widthMm,
    heightMm: input.heightMm,
    quantity: input.quantity,
    areaSqFt: input.areaSqFt,
  };

  const settingsError = validateFixedFrameSettings(settings, input.widthMm, input.heightMm);
  if (settingsError) {
    return {
      method,
      profileCode,
      fixedFrameSettings: settings,
      dimensions,
      cutting: null,
      validation: invalidValidation(settingsError),
      components: [] as SummaryComponentRow[],
      details: [] as SummaryDetailRow[],
      summary: null,
    };
  }

  const cutting = calculateFixedFrameCutting({
    openingWidthMm: input.widthMm,
    openingHeightMm: input.heightMm,
    quantity: input.quantity,
    settings,
    profileRatePerKg: input.profileRatePerKg,
  });

  if (!cutting) {
    return {
      method,
      profileCode,
      fixedFrameSettings: settings,
      dimensions,
      cutting: null,
      validation: invalidValidation("Fixed frame calculation failed. Check dimensions and module settings."),
      components: [] as SummaryComponentRow[],
      details: [] as SummaryDetailRow[],
      summary: null,
    };
  }

  const hasBadGlass = cutting.glassPanels.some(
    (g) => g.widthMm <= 0 || g.heightMm <= 0,
  );
  if (hasBadGlass) {
    return {
      method,
      profileCode,
      fixedFrameSettings: settings,
      dimensions,
      cutting: null,
      validation: invalidValidation("Calculated glass size is zero or negative. Adjust opening or module division."),
      components: [] as SummaryComponentRow[],
      details: [] as SummaryDetailRow[],
      summary: null,
    };
  }

  return {
    method,
    profileCode,
    fixedFrameSettings: settings,
    dimensions,
    cutting,
    validation: { isValid: true, blockingMessage: null, issues: [] },
    components: buildComponents(cutting.components),
    details: buildDetails(cutting),
    summary: cutting.summary,
    methodLabel: FIXED_FRAME_METHOD_LABEL,
  };
}

export function getFixedFrameConstructionLabel(
  mode: FixedFrameSettings["constructionMode"],
): string {
  const labels: Record<FixedFrameSettings["constructionMode"], string> = {
    SINGLE_FRAME: "Single Frame",
    SEPARATE_MODULES: "Separate Modules",
    INTERNAL_PARTITIONS: "Internal Partitions",
  };
  return labels[mode];
}
