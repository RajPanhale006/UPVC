import type { CalculatedWindowRow } from "@/lib/quotation/types";
import { WINDOW_TYPE_LABELS } from "@/lib/quotation/defaults";
import type { TrackSystemId } from "@/lib/cutting/types";
import type { WindowTypeId } from "@/lib/quotation/types";

import { getDefaultWindowDetail } from "./defaults";
import type { WindowProposalDetail } from "./types";

const MM_PER_FOOT = 304.8;
const MM_PER_INCH = 25.4;

export function quotationWindowToTrackSystem(windowType: WindowTypeId): TrackSystemId | null {
  switch (windowType) {
    case "2-track-upvc":
      return "2-track-t60";
    case "2.5-track-upvc":
      return "2.5-track-t60";
    case "3-track-upvc":
      return "3-track-t109";
    default:
      return null;
  }
}

export function dimensionsToMm(
  length: number,
  height: number,
  unit: CalculatedWindowRow["unit"],
): { widthMm: number; heightMm: number } {
  if (unit === "mm") {
    return { widthMm: Math.round(length), heightMm: Math.round(height) };
  }
  if (unit === "inch") {
    return {
      widthMm: Math.round(length * MM_PER_INCH),
      heightMm: Math.round(height * MM_PER_INCH),
    };
  }
  return {
    widthMm: Math.round(length * MM_PER_FOOT),
    heightMm: Math.round(height * MM_PER_FOOT),
  };
}

export function formatFeetInchesFromRow(row: CalculatedWindowRow): string {
  const { widthMm, heightMm } = dimensionsToMm(row.length, row.height, row.unit);
  const wFt = Math.floor(widthMm / MM_PER_FOOT);
  const wIn = Math.round((widthMm - wFt * MM_PER_FOOT) / MM_PER_INCH);
  const hFt = Math.floor(heightMm / MM_PER_FOOT);
  const hIn = Math.round((heightMm - hFt * MM_PER_FOOT) / MM_PER_INCH);
  return `${wFt}' ${wIn}" × ${hFt}' ${hIn}"`;
}

export function formatMmFromRow(row: CalculatedWindowRow): string {
  const { widthMm, heightMm } = dimensionsToMm(row.length, row.height, row.unit);
  return `${widthMm} × ${heightMm} mm`;
}

export function defaultSashInfo(windowType: WindowTypeId): {
  sashConfiguration: string;
  glassSashCount: string;
  netSashCount: string;
} {
  switch (windowType) {
    case "2-track-upvc":
      return {
        sashConfiguration: "2 Glass sliding sashes",
        glassSashCount: "2",
        netSashCount: "0",
      };
    case "2.5-track-upvc":
      return {
        sashConfiguration: "2 Glass + 1 Net",
        glassSashCount: "2",
        netSashCount: "1",
      };
    case "3-track-upvc":
      return {
        sashConfiguration: "2 Glass + 1 Net (or as specified)",
        glassSashCount: "2",
        netSashCount: "1",
      };
    default:
      return {
        sashConfiguration: WINDOW_TYPE_LABELS[windowType],
        glassSashCount: "—",
        netSashCount: "—",
      };
  }
}

export function mergeWindowDetail(
  row: CalculatedWindowRow,
  index: number,
  override?: WindowProposalDetail,
): WindowProposalDetail {
  const defaults = getDefaultWindowDetail();
  const sash = defaultSashInfo(row.windowType);
  const code = override?.code || `W${String(index + 1).padStart(2, "0")}`;

  return {
    ...defaults,
    ...override,
    code,
    profileSystem: override?.profileSystem || WINDOW_TYPE_LABELS[row.windowType],
    sashConfiguration: override?.sashConfiguration || sash.sashConfiguration,
    glassSashCount: override?.glassSashCount || sash.glassSashCount,
    netSashCount: override?.netSashCount || sash.netSashCount,
  };
}

export type PanelKind = "glass" | "net" | "fixed";

export function getDiagramPanels(windowType: WindowTypeId): PanelKind[] {
  switch (windowType) {
    case "2-track-upvc":
      return ["glass", "glass"];
    case "2.5-track-upvc":
      return ["glass", "net", "glass"];
    case "3-track-upvc":
      return ["glass", "glass", "net"];
    case "openable-single-glass":
      return ["glass"];
    case "fixed-glass":
      return ["fixed"];
    default:
      return ["glass", "glass"];
  }
}
