import { getThreeTrackSashConfiguration } from "@/lib/cutting/sash-configuration";
import { TRACK_SYSTEM_PRESETS } from "@/lib/cutting/presets";
import type { CuttingOptions, TrackSystemId } from "@/lib/cutting/types";

import type {
  PanelKind,
  PreviewMode,
  PreviewSizing,
  ProductPreviewData,
  ThreeTrackSashLayout,
  WindowPreviewConfiguration,
} from "./preview-types";

export function formatPreviewDim(mm: number): string {
  if (mm <= 0) return "—";
  return `${Math.round(mm)} mm`;
}

export function getWindowPanelLayout(
  trackSystemId: TrackSystemId,
  sashLayout?: ThreeTrackSashLayout,
  cuttingOptions?: CuttingOptions,
): PanelKind[] {
  if (trackSystemId === "2-track-t60") {
    return ["glass", "glass"];
  }
  if (trackSystemId === "2.5-track-t60") {
    return ["glass", "net", "glass"];
  }
  const sash =
    sashLayout ??
    (cuttingOptions
      ? getThreeTrackSashConfiguration(cuttingOptions)
      : "two-glass-one-net");
  if (sash === "three-glass-no-net") {
    return ["glass", "glass", "glass"];
  }
  return ["glass", "glass", "net"];
}

export type ProfileFrameStyle = {
  family: "T60" | "T109";
  fillTop: string;
  fillBottom: string;
  stroke: string;
  rail: string;
  badgeClass: string;
};

export function getProfileFrameStyle(trackSystemId: TrackSystemId): ProfileFrameStyle {
  if (trackSystemId === "3-track-t109") {
    return {
      family: "T109",
      fillTop: "#F8FAFC",
      fillBottom: "#CBD5E1",
      stroke: "#334155",
      rail: "#1E293B",
      badgeClass: "bg-indigo-100 text-indigo-800",
    };
  }
  return {
    family: "T60",
    fillTop: "#FAFAF9",
    fillBottom: "#D6D3D1",
    stroke: "#78716C",
    rail: "#57534E",
    badgeClass: "bg-amber-100 text-amber-900",
  };
}

export function computePreviewSizing(
  widthMm: number,
  heightMm: number,
  mode: PreviewMode = "detailed",
): PreviewSizing {
  const aspect = widthMm > 0 && heightMm > 0 ? widthMm / heightMm : 1.2;
  const baseW = mode === "thumbnail" ? 120 : mode === "compact" ? 220 : 280;
  const viewW = baseW;
  const minH = mode === "thumbnail" ? 100 : 180;
  const maxH = mode === "thumbnail" ? 160 : 320;
  const viewH = Math.min(maxH, Math.max(minH, viewW / aspect));
  const maxWidthPx =
    mode === "thumbnail" ? 140 : mode === "compact" ? 260 : mode === "pdf" ? 300 : 320;
  return { viewW, viewH, maxWidthPx };
}

export function getMinimumPanelWidth(panelCount: number, innerW: number, minPx = 28): number {
  const raw = innerW / Math.max(1, panelCount);
  return Math.max(minPx, raw);
}

export function modeShowsDimensions(mode: PreviewMode, data: ProductPreviewData): boolean {
  if (data.showDimensions === false) return false;
  return mode !== "thumbnail";
}

export function modeShowsLegend(mode: PreviewMode, data: ProductPreviewData): boolean {
  if (data.showLegend === false) return false;
  return mode === "detailed" || mode === "compact";
}

export function modeShowsLabels(mode: PreviewMode, data: ProductPreviewData): boolean {
  if (data.showLabels === false) return false;
  return mode !== "thumbnail";
}

export function modeUsesPdfSafeSvg(mode: PreviewMode): boolean {
  return mode === "pdf";
}

export function resolveProfileCode(
  windowConfig: WindowPreviewConfiguration,
): string {
  return TRACK_SYSTEM_PRESETS[windowConfig.trackSystemId].profileCode;
}

export function buildLayoutKey(data: ProductPreviewData): string {
  if (data.productType === "door" && data.door) {
    return [
      "door",
      data.door.configuration,
      data.door.openingSide,
      data.door.openingDirection,
      data.door.panelType ?? "glass",
    ].join(":");
  }
  const panels =
    data.window?.panels ??
    (data.window
      ? getWindowPanelLayout(
          data.window.trackSystemId,
          data.window.sashLayout,
        )
      : []);
  return [
    "window",
    data.window?.trackSystemId,
    data.window?.sashLayout ?? "",
    panels.join(","),
  ].join(":");
}

export function panelLabel(kind: PanelKind): string {
  switch (kind) {
    case "glass":
      return "Glass";
    case "net":
    case "mesh":
      return "Net";
    case "fixed":
      return "Fixed";
    case "solid":
      return "Solid";
    default:
      return kind;
  }
}
