import {
  calculateCutting,
  calculateSarikComponentsForContext,
  getProfileCodeForOptions,
  getThreeTrackSashConfiguration,
  isSarikThreeGlassNoNet,
  isSarikTwoGlassOneNet,
  THREE_TRACK_SASH_CONFIGURATION_LABELS,
  type CuttingOptions,
  type CuttingResult,
  type TrackSystemId,
} from "@/lib/cutting";
import { formatMmPair, formatNotApplicable } from "@/lib/summary/format";
import type { SummaryComponentRow, SummaryDetailRow } from "@/lib/summary/types";

import { getWindowMethodMeta } from "./method-metadata";
import type { CalculationValidation, ProductDimensions } from "./types";
import { getMinimumDimensionsMessage } from "./validation/product-rules";
import {
  invalidValidation,
  mergeValidations,
  validateWindowCuts,
} from "./validation/validate-calculation";

export type WindowCalculationOutput = {
  method: ReturnType<typeof getWindowMethodMeta>;
  trackSystemId: TrackSystemId;
  profileCode: string;
  dimensions: ProductDimensions;
  cutting: CuttingResult | null;
  validation: CalculationValidation;
  components: SummaryComponentRow[];
  details: SummaryDetailRow[];
};

function buildSarikComponents(
  widthMm: number,
  heightMm: number,
  options: CuttingOptions,
  systemId: TrackSystemId,
): SummaryComponentRow[] {
  const threeGlass = isSarikThreeGlassNoNet(options, systemId);
  const twoGlassOneNet = isSarikTwoGlassOneNet(options, systemId);
  const sarik = calculateSarikComponentsForContext(
    { widthMm, heightMm },
    {
      trackSystemId: systemId,
      sashConfiguration: getThreeTrackSashConfiguration(options),
    },
  );
  const glassSashQty = threeGlass ? 3 : 2;
  const glassQty = threeGlass ? 3 : 2;
  const rows: SummaryComponentRow[] = [
    {
      part: "Outer Frame",
      quantity: "1 Set",
      cuttingSize: formatMmPair(
        sarik.outerFrame.cuttingWidthMm,
        sarik.outerFrame.cuttingHeightMm,
      ),
      afterWeldingSize: formatMmPair(
        sarik.outerFrame.afterWeldingWidthMm,
        sarik.outerFrame.afterWeldingHeightMm,
      ),
    },
    {
      part: threeGlass || twoGlassOneNet ? "Glass Sash" : "Sash",
      quantity: `${glassSashQty} Nos`,
      cuttingSize: formatMmPair(sarik.sash.cuttingWidthMm, sarik.sash.cuttingHeightMm),
      afterWeldingSize: formatMmPair(
        sarik.sash.afterWeldingWidthMm,
        sarik.sash.afterWeldingHeightMm,
      ),
    },
    {
      part: "Glass",
      quantity: `${glassQty} Nos`,
      cuttingSize: formatMmPair(sarik.glass.widthMm, sarik.glass.heightMm),
      afterWeldingSize: formatNotApplicable(),
    },
  ];
  if (twoGlassOneNet && sarik.netSash && sarik.mesh) {
    rows.splice(2, 0, {
      part: "Net / Screen Sash",
      quantity: "1 No",
      cuttingSize: formatMmPair(
        sarik.netSash.cuttingWidthMm,
        sarik.netSash.cuttingHeightMm,
      ),
      afterWeldingSize: formatMmPair(
        sarik.netSash.afterWeldingWidthMm,
        sarik.netSash.afterWeldingHeightMm,
      ),
    });
    rows.push({
      part: "Mesh / Jaali",
      quantity: "1 No",
      cuttingSize: formatMmPair(sarik.mesh.widthMm, sarik.mesh.heightMm),
      afterWeldingSize: formatNotApplicable(),
    });
  }
  if (threeGlass) {
    rows.splice(2, 0, {
      part: "Interlock",
      quantity: `${options.interlockQty} Nos`,
      cuttingSize: `${Math.round(sarik.sash.afterWeldingHeightMm - 5)} mm`,
      afterWeldingSize: `${Math.round(sarik.sash.afterWeldingHeightMm - 5)} mm`,
    });
  }
  return rows;
}

function buildStandardWorkshopComponents(
  cuts: CuttingResult["cuts"],
  options: CuttingOptions,
  trackSystemId: TrackSystemId,
): SummaryComponentRow[] {
  const rows: SummaryComponentRow[] = [
    {
      part: "Outer Frame",
      quantity: "1 Set",
      cuttingSize: formatMmPair(cuts.frameTop, cuts.frameLeft),
      afterWeldingSize:
        options.cuttingMethod === "workshop-confirmed"
          ? formatMmPair(cuts.frameWidth, cuts.frameHeight)
          : formatNotApplicable(),
    },
    {
      part: "Sash",
      quantity: `${options.shutterQty} Nos`,
      cuttingSize: formatMmPair(cuts.sashTop, cuts.sashSide),
      afterWeldingSize:
        options.cuttingMethod === "workshop-confirmed"
          ? formatMmPair(cuts.sashTopWelded, cuts.sashSideWelded)
          : formatNotApplicable(),
    },
    {
      part: "Glass",
      quantity: `${options.glassPanelQty || options.divider} Nos`,
      cuttingSize: formatMmPair(cuts.glassWidth, cuts.glassHeight),
      afterWeldingSize: formatNotApplicable(),
    },
  ];
  if (options.interlockQty > 0) {
    rows.splice(2, 0, {
      part: "Interlock",
      quantity: `${options.interlockQty} Nos`,
      cuttingSize: `${Math.round(cuts.interlock)} mm`,
      afterWeldingSize:
        options.cuttingMethod === "workshop-confirmed"
          ? `${Math.round(cuts.interlockWelded)} mm`
          : formatNotApplicable(),
    });
  }
  if (trackSystemId === "2.5-track-t60") {
    rows.push({
      part: "Mesh / Jaali",
      quantity: "1 Set",
      cuttingSize: formatMmPair(cuts.glassWidth, cuts.glassHeight),
      afterWeldingSize: formatNotApplicable(),
    });
  }
  return rows;
}

function buildDetailRows(result: CuttingResult): SummaryDetailRow[] {
  return result.tableRows.map((row) => ({
    name: row.item,
    qty: row.qtyPerWindow,
    cuttingSize:
      row.cutSizeCrossMm != null
        ? formatMmPair(row.cutSizeMm, row.cutSizeCrossMm)
        : `${Math.round(row.cutSizeMm)} mm`,
    afterWeldingSize:
      row.afterWeldingMm != null && row.afterWeldingCrossMm != null
        ? formatMmPair(row.afterWeldingMm, row.afterWeldingCrossMm)
        : row.afterWeldingMm != null
          ? `${Math.round(row.afterWeldingMm)} mm`
          : formatNotApplicable(),
    angle: row.cutAngle,
  }));
}

export function calculateWindowProduct(input: {
  widthMm: number;
  heightMm: number;
  quantity: number;
  areaSqFt: number;
  trackSystemId: TrackSystemId;
  cuttingOptions: CuttingOptions;
}): WindowCalculationOutput {
  const { widthMm, heightMm, quantity, areaSqFt, trackSystemId, cuttingOptions } =
    input;
  const method = getWindowMethodMeta(cuttingOptions.cuttingMethod);
  const profileCode = getProfileCodeForOptions(trackSystemId, cuttingOptions);
  const dimensions: ProductDimensions = {
    widthMm,
    heightMm,
    quantity,
    areaSqFt,
  };

  const sizeMessage = getMinimumDimensionsMessage(
    "window",
    trackSystemId,
    widthMm,
    heightMm,
  );
  if (sizeMessage) {
    return {
      method,
      trackSystemId,
      profileCode,
      dimensions,
      cutting: null,
      validation: invalidValidation(sizeMessage),
      components: [],
      details: [],
    };
  }

  if (cuttingOptions.cuttingMethod !== "sarik" && cuttingOptions.divider <= 0) {
    return {
      method,
      trackSystemId,
      profileCode,
      dimensions,
      cutting: null,
      validation: invalidValidation("Shutter count must be greater than zero.", "divider"),
      components: [],
      details: [],
    };
  }

  const cutting = calculateCutting(
    { widthMm, heightMm },
    cuttingOptions,
    trackSystemId,
    quantity,
  );

  const cutValidation = validateWindowCuts(cutting.cuts);
  let configValidation: CalculationValidation = { isValid: true, blockingMessage: null, issues: [] };

  if (
    trackSystemId === "3-track-t109" &&
    cuttingOptions.cuttingMethod === "sarik" &&
    !cutValidation.isValid
  ) {
    const sashLabel =
      THREE_TRACK_SASH_CONFIGURATION_LABELS[getThreeTrackSashConfiguration(cuttingOptions)];
    configValidation = invalidValidation(
      `Invalid 3-track window size for ${sashLabel}. The entered width or height is too small for this sash configuration.`,
      "sashConfiguration",
    );
  }

  const validation = mergeValidations(cutValidation, configValidation);

  const components =
    cuttingOptions.cuttingMethod === "sarik"
      ? buildSarikComponents(widthMm, heightMm, cuttingOptions, trackSystemId)
      : buildStandardWorkshopComponents(cutting.cuts, cuttingOptions, trackSystemId);

  return {
    method,
    trackSystemId,
    profileCode,
    dimensions,
    cutting: validation.isValid ? cutting : null,
    validation,
    components: validation.isValid ? components : [],
    details: validation.isValid ? buildDetailRows(cutting) : [],
  };
}
