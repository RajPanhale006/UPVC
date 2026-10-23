import {
  buildDoorPreviewData,
  buildWindowPreviewData,
} from "@/components/product-preview/preview-mapper";
import type { ProductPreviewData } from "@/components/product-preview/preview-types";
import type { CuttingJobExportInput } from "@/lib/cutting/job-document";
import type { DoorJobExportInput } from "@/lib/cutting/door/export-pdf";
import type { SummaryDoorEntry, SummaryWindowEntry } from "@/lib/summary/types";
import type { ThreeTrackSashLayout } from "@/components/product-preview/preview-types";

function sashLayoutFromLabel(label?: string): ThreeTrackSashLayout | undefined {
  if (!label) return undefined;
  if (label.toLowerCase().includes("3 glass") && label.toLowerCase().includes("no net")) {
    return "three-glass-no-net";
  }
  if (label.toLowerCase().includes("2 glass") && label.toLowerCase().includes("1 net")) {
    return "two-glass-one-net";
  }
  return undefined;
}

export function buildPreviewDataFromCuttingJob(
  input: CuttingJobExportInput,
): ProductPreviewData {
  return buildWindowPreviewData({
    trackSystemId: input.systemId,
    widthMm: input.widthMm,
    heightMm: input.heightMm,
    cuttingOptions: input.options,
    profileCode: input.profileCode,
    productCode: input.windowLocation || input.jobName,
    quantity: input.numberOfWindows,
    viewFrom: "inside",
  });
}

export function buildPreviewDataFromDoorCuttingJob(
  input: DoorJobExportInput,
): ProductPreviewData {
  return buildDoorPreviewData({
    widthMm: input.widthMm,
    heightMm: input.heightMm,
    configuration: input.options.configuration,
    openingSide: input.options.openingSide,
    openingDirection: input.options.openingDirection,
    quantity: input.numberOfDoors,
    flatMullionMm: input.result.components.flatMullionMm,
    productCode: input.doorLocation || input.jobName,
  });
}

export function buildPreviewDataFromSummaryWindow(
  entry: SummaryWindowEntry,
): ProductPreviewData {
  const sashLayout = sashLayoutFromLabel(entry.sashConfigurationLabel);
  const data = buildWindowPreviewData({
    trackSystemId: entry.trackSystemId,
    widthMm: entry.widthMm,
    heightMm: entry.heightMm,
    profileCode: entry.profileCode,
    productCode: entry.name,
    quantity: entry.quantity,
    viewFrom: "inside",
  });
  if (data.window && sashLayout) {
    return {
      ...data,
      window: {
        ...data.window,
        sashLayout,
        sashConfigurationLabel: entry.sashConfigurationLabel,
      },
    };
  }
  return data;
}

export function buildPreviewDataFromSummaryDoor(
  entry: SummaryDoorEntry,
): ProductPreviewData {
  return buildDoorPreviewData({
    widthMm: entry.widthMm,
    heightMm: entry.heightMm,
    configuration: entry.configuration,
    openingSide: entry.openingSide,
    openingDirection: entry.openingDirection,
    profileCode: entry.profileCode,
    productCode: entry.name,
    quantity: entry.quantity,
    flatMullionMm: entry.flatMullionMm,
  });
}
