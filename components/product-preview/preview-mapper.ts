import { getThreeTrackSashConfiguration, THREE_TRACK_SASH_CONFIGURATION_LABELS } from "@/lib/cutting/sash-configuration";
import { TRACK_SYSTEM_PRESETS } from "@/lib/cutting/presets";
import type { CuttingOptions, TrackSystemId } from "@/lib/cutting/types";
import { createDefaultDoorCuttingOptions } from "@/lib/cutting/door";
import { TRACK_LABELS } from "@/lib/estimation/defaults";
import type { EstimationInputs } from "@/lib/estimation/types";
import { feetInchesToMm } from "@/lib/units/conversion";
import type {
  DoorConfigurationId,
  DoorOpeningDirectionId,
  DoorOpeningSideId,
  QuotationWindowRow,
  WindowTypeId,
} from "@/lib/quotation/types";

import type { ProductPreviewData, ThreeTrackSashLayout } from "./preview-types";
import { getWindowPanelLayout } from "./preview-utils";

const QUOTATION_TO_TRACK: Partial<Record<WindowTypeId, TrackSystemId>> = {
  "2-track-upvc": "2-track-t60",
  "2.5-track-upvc": "2.5-track-t60",
  "3-track-upvc": "3-track-t109",
};

function dimensionToMm(length: number, height: number, unit: QuotationWindowRow["unit"]): {
  widthMm: number;
  heightMm: number;
} {
  if (unit === "mm") {
    return { widthMm: Math.round(length), heightMm: Math.round(height) };
  }
  if (unit === "inch") {
    return {
      widthMm: Math.round(length * 25.4),
      heightMm: Math.round(height * 25.4),
    };
  }
  return {
    widthMm: feetInchesToMm(length, 0),
    heightMm: feetInchesToMm(height, 0),
  };
}

export function buildWindowPreviewData(input: {
  trackSystemId: TrackSystemId;
  widthMm: number;
  heightMm: number;
  cuttingOptions?: CuttingOptions;
  profileCode?: string;
  productCode?: string;
  quantity?: number;
  viewFrom?: ProductPreviewData["viewFrom"];
}): ProductPreviewData {
  const sashLayout =
    input.trackSystemId === "3-track-t109" && input.cuttingOptions
      ? (getThreeTrackSashConfiguration(input.cuttingOptions) as ThreeTrackSashLayout)
      : undefined;
  const panels = getWindowPanelLayout(
    input.trackSystemId,
    sashLayout,
    input.cuttingOptions,
  );
  const sashConfigurationLabel =
    input.trackSystemId === "3-track-t109" && sashLayout
      ? THREE_TRACK_SASH_CONFIGURATION_LABELS[sashLayout]
      : undefined;

  return {
    productType: "window",
    widthMm: input.widthMm,
    heightMm: input.heightMm,
    quantity: input.quantity,
    productCode: input.productCode,
    profileCode: input.profileCode ?? TRACK_SYSTEM_PRESETS[input.trackSystemId].profileCode,
    viewFrom: input.viewFrom ?? "inside",
    showDimensions: true,
    showLabels: true,
    showLegend: true,
    window: {
      trackSystemId: input.trackSystemId,
      sashLayout,
      panels,
      trackLabel: TRACK_LABELS[input.trackSystemId],
      sashConfigurationLabel,
      profileFamily: input.trackSystemId === "3-track-t109" ? "T109" : "T60",
    },
  };
}

export function buildDoorPreviewData(input: {
  widthMm: number;
  heightMm: number;
  configuration?: DoorConfigurationId;
  openingSide?: DoorOpeningSideId;
  openingDirection?: DoorOpeningDirectionId;
  profileCode?: string;
  productCode?: string;
  quantity?: number;
  flatMullionMm?: number | null;
  panelType?: "glass" | "solid";
}): ProductPreviewData {
  const configuration = input.configuration ?? "single";
  return {
    productType: "door",
    widthMm: input.widthMm,
    heightMm: input.heightMm,
    quantity: input.quantity,
    productCode: input.productCode,
    profileCode: input.profileCode,
    viewFrom: "inside",
    showDimensions: true,
    showLabels: true,
    showLegend: true,
    door: {
      configuration,
      openingSide: input.openingSide ?? "left",
      openingDirection: input.openingDirection ?? "inward",
      panelType: input.panelType ?? "glass",
      hasThreshold: true,
      showShootBolts: configuration === "double",
      showFlatMullion: configuration === "double",
      flatMullionMm: input.flatMullionMm ?? null,
      activeLeaf: input.openingSide ?? "left",
    },
  };
}

/** Derive preview from estimation + cutting job (current workshop product). */
export function buildPreviewDataFromEstimation(
  inputs: EstimationInputs,
  cuttingOptions?: CuttingOptions,
  profileCode?: string,
): ProductPreviewData {
  const widthMm = feetInchesToMm(inputs.widthFeet, inputs.widthInches);
  const heightMm = feetInchesToMm(inputs.heightFeet, inputs.heightInches);
  const quantity = Math.max(1, inputs.numberOfWindows || 1);

  if (inputs.productKind === "door") {
    const door = inputs.doorSettings ?? createDefaultDoorCuttingOptions("single");
    return buildDoorPreviewData({
      widthMm,
      heightMm,
      quantity,
      configuration: door.configuration,
      openingSide: door.openingSide,
      openingDirection: door.openingDirection,
      profileCode,
    });
  }

  return buildWindowPreviewData({
    trackSystemId: inputs.trackSystemId,
    widthMm,
    heightMm,
    quantity,
    cuttingOptions,
    profileCode,
  });
}

/** Non-destructive fallback for saved quotation rows without previewData. */
export function buildPreviewDataFromQuotationRow(row: QuotationWindowRow): ProductPreviewData {
  const { widthMm, heightMm } = dimensionToMm(row.length, row.height, row.unit);

  if (row.windowType === "upvc-door") {
    return buildDoorPreviewData({
      widthMm,
      heightMm,
      quantity: row.quantity,
      configuration: row.doorConfiguration,
      openingSide: row.openingSide,
      openingDirection: row.openingDirection,
      profileCode: row.profileLabel,
    });
  }

  const trackSystemId = QUOTATION_TO_TRACK[row.windowType] ?? "3-track-t109";
  return buildWindowPreviewData({
    trackSystemId,
    widthMm,
    heightMm,
    quantity: row.quantity,
    profileCode: row.profileLabel,
    cuttingOptions:
      trackSystemId === "3-track-t109"
        ? undefined
        : undefined,
  });
}

/** Prefer stored previewData; derive from legacy fields when missing. */
export function resolveQuotationPreviewData(row: QuotationWindowRow): ProductPreviewData {
  if (row.previewData) {
    const { widthMm, heightMm } = dimensionToMm(row.length, row.height, row.unit);
    return {
      ...row.previewData,
      widthMm,
      heightMm,
      quantity: row.quantity,
    };
  }
  return buildPreviewDataFromQuotationRow(row);
}
