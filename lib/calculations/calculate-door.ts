import {
  calculateDoorCutting,
  createDefaultDoorCuttingOptions,
  DOOR_CONFIGURATION_LABELS,
  DOOR_PROFILE_CODES,
  validateDoorDimensions,
  type DoorCuttingOptions,
} from "@/lib/cutting/door";
import { formatMmPair, formatNotApplicable } from "@/lib/summary/format";
import type { SummaryComponentRow, SummaryDetailRow } from "@/lib/summary/types";

import { getDoorMethodMeta } from "./method-metadata";
import type { ProductDimensions } from "./types";
import { getMinimumDimensionsMessage } from "./validation/product-rules";
import {
  invalidValidation,
  validateDoorComponents,
} from "./validation/validate-calculation";

export type DoorCalculationOutput = {
  method: ReturnType<typeof getDoorMethodMeta>;
  profileCode: string;
  doorSettings: DoorCuttingOptions;
  dimensions: ProductDimensions;
  cutting: NonNullable<ReturnType<typeof calculateDoorCutting>>;
  validation: ReturnType<typeof validateDoorComponents>;
  components: SummaryComponentRow[];
  details: SummaryDetailRow[];
};

function buildDoorComponents(
  doorSettings: DoorCuttingOptions,
  components: NonNullable<ReturnType<typeof calculateDoorCutting>>["components"],
): SummaryComponentRow[] {
  const rows: SummaryComponentRow[] = [
    {
      part: "Outer Frame",
      quantity: "1 Set",
      cuttingSize: formatMmPair(components.frame.widthMm, components.frame.heightMm),
      afterWeldingSize: formatNotApplicable(),
    },
    {
      part: doorSettings.configuration === "double" ? "Each Sash" : "Sash",
      quantity: `${components.sash.quantity} Nos`,
      cuttingSize: formatMmPair(components.sash.widthMm, components.sash.heightMm),
      afterWeldingSize: formatNotApplicable(),
    },
    {
      part: "Beading",
      quantity:
        doorSettings.configuration === "double" ? "4 H + 4 V per door" : "2 H + 2 V",
      cuttingSize: formatMmPair(components.beading.widthMm, components.beading.heightMm),
      afterWeldingSize: formatNotApplicable(),
    },
    {
      part: "Glass",
      quantity: `${components.sash.quantity} Nos`,
      cuttingSize: formatMmPair(components.glass.widthMm, components.glass.heightMm),
      afterWeldingSize: formatNotApplicable(),
    },
  ];
  if (components.flatMullionMm != null) {
    rows.push({
      part: "Flat Mullion",
      quantity: "1 No",
      cuttingSize: `${components.flatMullionMm} mm`,
      afterWeldingSize: formatNotApplicable(),
    });
  }
  return rows;
}

function buildDetailRows(
  cutting: NonNullable<ReturnType<typeof calculateDoorCutting>>,
): SummaryDetailRow[] {
  return cutting.tableRows.map((row) => ({
    name: row.item,
    qty: row.qtyPerWindow,
    cuttingSize:
      row.cutSizeCrossMm != null
        ? formatMmPair(row.cutSizeMm, row.cutSizeCrossMm)
        : `${Math.round(row.cutSizeMm)} mm`,
    afterWeldingSize: formatNotApplicable(),
    angle: row.cutAngle,
  }));
}

export function calculateDoorProduct(input: {
  widthMm: number;
  heightMm: number;
  quantity: number;
  areaSqFt: number;
  doorSettings?: DoorCuttingOptions;
}): {
  method: ReturnType<typeof getDoorMethodMeta>;
  profileCode: string;
  doorSettings: DoorCuttingOptions;
  dimensions: ProductDimensions;
  cutting: ReturnType<typeof calculateDoorCutting>;
  validation: ReturnType<typeof validateDoorComponents>;
  components: SummaryComponentRow[];
  details: SummaryDetailRow[];
} {
  const doorSettings = input.doorSettings ?? createDefaultDoorCuttingOptions("single");
  const method = getDoorMethodMeta();
  const profileCode = `${DOOR_PROFILE_CODES.frame} / ${DOOR_PROFILE_CODES.sash}`;
  const dimensions: ProductDimensions = {
    widthMm: input.widthMm,
    heightMm: input.heightMm,
    quantity: input.quantity,
    areaSqFt: input.areaSqFt,
  };

  const dimensionError =
    validateDoorDimensions(
      { widthMm: input.widthMm, heightMm: input.heightMm },
      doorSettings.configuration,
    ) ??
    getMinimumDimensionsMessage(
      "door",
      doorSettings.configuration,
      input.widthMm,
      input.heightMm,
    );

  if (dimensionError) {
    return {
      method,
      profileCode,
      doorSettings,
      dimensions,
      cutting: null,
      validation: invalidValidation(dimensionError),
      components: [],
      details: [],
    };
  }

  const cutting = calculateDoorCutting(
    { widthMm: input.widthMm, heightMm: input.heightMm },
    doorSettings,
    input.quantity,
  );

  if (!cutting) {
    return {
      method,
      profileCode,
      doorSettings,
      dimensions,
      cutting: null,
      validation: invalidValidation("Door calculation failed. Check dimensions."),
      components: [],
      details: [],
    };
  }

  const validation = validateDoorComponents(cutting.components);

  return {
    method,
    profileCode,
    doorSettings,
    dimensions,
    cutting: validation.isValid ? cutting : null,
    validation,
    components: validation.isValid ? buildDoorComponents(doorSettings, cutting.components) : [],
    details: validation.isValid ? buildDetailRows(cutting) : [],
  };
}

export function getDoorConfigurationLabel(configuration: DoorCuttingOptions["configuration"]): string {
  return DOOR_CONFIGURATION_LABELS[configuration];
}
