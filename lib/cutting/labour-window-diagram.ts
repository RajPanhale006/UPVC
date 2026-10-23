import type { jsPDF } from "jspdf";

import { PDF_COLORS } from "@/lib/pdf/theme";

import { getThreeTrackSashConfiguration } from "./sash-configuration";
import type { CuttingOptions, TrackSystemId } from "./types";

export type PanelKind = "glass" | "net" | "fixed";

export type LabourWindowDiagramInput = {
  systemId: TrackSystemId;
  widthMm: number;
  heightMm: number;
  options?: CuttingOptions;
  trackLabel: string;
  profileCode: string;
  windowCode?: string;
  glassSizeLabel?: string;
  sashConfigurationLabel?: string;
};

export function getCuttingDiagramPanels(
  systemId: TrackSystemId,
  options?: CuttingOptions,
  sashConfigurationLabel?: string,
): PanelKind[] {
  if (systemId === "2-track-t60") return ["glass", "glass"];
  if (systemId === "2.5-track-t60") return ["glass", "net", "glass"];
  const sash = options
    ? getThreeTrackSashConfiguration(options)
    : sashConfigurationLabel?.toLowerCase().includes("3 glass")
      ? "three-glass-no-net"
      : "two-glass-one-net";
  if (sash === "three-glass-no-net") return ["glass", "glass", "glass"];
  return ["glass", "glass", "net"];
}

export function drawLabourWindowDiagram(
  doc: jsPDF,
  input: LabourWindowDiagramInput,
  x: number,
  y: number,
  width: number,
  height: number,
): number {
  const panels = getCuttingDiagramPanels(
    input.systemId,
    input.options,
    input.sashConfigurationLabel,
  );

  const frame = 5.5;
  const trackH = 5;
  const sillH = 6;
  const innerX = x + frame;
  const innerY = y + frame + trackH + 1.5;
  const innerW = width - frame * 2;
  const innerH = height - frame * 2 - trackH - sillH - 2;
  const panelW = innerW / panels.length;
  const mullion = 2;

  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.2);
  doc.setLineDashPattern([1.2, 1.2], 0);
  doc.roundedRect(x - 2, y - 2, width + 4, height + 4, 3, 3, "S");
  doc.setLineDashPattern([], 0);

  doc.setFillColor(252, 252, 251);
  doc.setDrawColor(87, 83, 78);
  doc.setLineWidth(0.65);
  doc.roundedRect(x, y, width, height, 2.5, 2.5, "FD");

  doc.setFillColor(68, 64, 60);
  doc.rect(innerX, y + frame, innerW, trackH, "F");
  doc.setFillColor(120, 113, 108);
  doc.rect(innerX, y + height - frame - sillH, innerW, sillH, "F");
  doc.setFillColor(168, 162, 158);
  doc.rect(innerX, y + height - frame - sillH + 1.5, innerW, 1.2, "F");

  panels.forEach((kind, index) => {
    const px = innerX + index * panelW + mullion / 2;
    const pw = panelW - mullion;
    drawSashPanel(doc, kind, px, innerY, pw, innerH, index, panels.length);
    if (index < panels.length - 1) {
      const ix = px + pw + 0.15;
      doc.setFillColor(200, 196, 192);
      doc.setDrawColor(68, 64, 60);
      doc.setLineWidth(0.4);
      doc.rect(ix, innerY + 1.5, mullion - 0.3, innerH - 3, "FD");
    }
  });

  drawDimensionLine(doc, x + 3, y + height + 4, x + width - 3, y + height + 4, `W ${Math.round(input.widthMm)}`);
  drawDimensionLine(
    doc,
    x + width + 2.5,
    y + 3,
    x + width + 2.5,
    y + height - 3,
    `H ${Math.round(input.heightMm)}`,
    true,
  );

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...PDF_COLORS.primaryDark);
  doc.text("View From Inside", x + width / 2, y - 1.5, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...PDF_COLORS.text);
  const code = input.windowCode ? `Code: ${input.windowCode}  ` : "";
  doc.text(`${code}${input.trackLabel}`, x, y + height + 9, { maxWidth: width + 8 });
  doc.text(`Profile: ${input.profileCode}`, x, y + height + 12.5);
  if (input.glassSizeLabel) {
    doc.text(`Glass: ${input.glassSizeLabel}`, x, y + height + 16);
    return y + height + 19;
  }
  return y + height + 15;
}

function drawSashPanel(
  doc: jsPDF,
  kind: PanelKind,
  x: number,
  y: number,
  w: number,
  h: number,
  index: number,
  total: number,
): void {
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(71, 85, 105);
  doc.setLineWidth(0.5);
  doc.roundedRect(x, y, w, h, 1.4, 1.4, "FD");

  const inset = 2.4;
  const gx = x + inset;
  const gy = y + inset;
  const gw = w - inset * 2;
  const gh = h - inset * 2;

  if (kind === "glass") {
    doc.setFillColor(147, 197, 253);
    doc.setDrawColor(2, 132, 199);
    doc.roundedRect(gx, gy, gw, gh, 0.7, 0.7, "FD");
    doc.setFillColor(186, 230, 253);
    doc.roundedRect(gx + 0.8, gy + 0.8, gw - 1.6, gh - 1.6, 0.5, 0.5, "F");
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.18);
    doc.line(gx + gw * 0.1, gy + gh * 0.12, gx + gw * 0.28, gy + gh * 0.32);
    doc.setFillColor(255, 255, 255);
    doc.circle(gx + gw * 0.84, gy + gh * 0.82, 1.2, "F");
    doc.setDrawColor(100, 116, 139);
    doc.circle(gx + gw * 0.84, gy + gh * 0.82, 1.2, "S");
  } else if (kind === "net") {
    doc.setFillColor(203, 213, 225);
    doc.setDrawColor(71, 85, 105);
    doc.roundedRect(gx, gy, gw, gh, 0.7, 0.7, "FD");
    doc.setDrawColor(100, 116, 139);
    doc.setLineWidth(0.1);
    for (let i = 0; i < gw + gh; i += 1.8) {
      doc.line(gx, gy + i, gx + i, gy);
      doc.line(gx + gw - i, gy, gx + gw, gy + i);
    }
  } else {
    doc.setFillColor(191, 219, 254);
    doc.setDrawColor(37, 99, 235);
    doc.roundedRect(gx, gy, gw, gh, 0.7, 0.7, "FD");
  }

  if (kind !== "fixed") {
    const arrowY = y + h - 3.2;
    doc.setDrawColor(...PDF_COLORS.primary);
    doc.setLineWidth(0.28);
    const dir = index % 2 === 0 ? 1 : -1;
    const ax = x + w / 2;
    doc.line(ax - 5 * dir, arrowY, ax + 5 * dir, arrowY);
    doc.line(ax + 5 * dir, arrowY, ax + (3.5 * dir), arrowY - 1.2);
    doc.line(ax + 5 * dir, arrowY, ax + (3.5 * dir), arrowY + 1.2);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.2);
  doc.setTextColor(30, 58, 138);
  const label = kind === "glass" ? "GLASS" : kind === "net" ? "MESH" : "FIXED";
  doc.text(label, x + w / 2, y + h / 2 + 1, { align: "center" });
  if (total > 1) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(4.8);
    doc.setTextColor(100, 116, 139);
    doc.text(`S${index + 1}`, x + 1.8, y + 2.8);
  }
}

function drawDimensionLine(
  doc: jsPDF,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  label: string,
  vertical = false,
): void {
  doc.setDrawColor(...PDF_COLORS.primary);
  doc.setLineWidth(0.22);
  doc.line(x1, y1, x2, y2);
  doc.line(x1, y1 - 0.7, x1, y1 + 0.7);
  doc.line(x2, y2 - 0.7, x2, y2 + 0.7);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.5);
  doc.setTextColor(...PDF_COLORS.primaryDark);
  if (vertical) {
    doc.text(label, x1 + 1.5, (y1 + y2) / 2, { angle: 90 });
  } else {
    doc.text(label, (x1 + x2) / 2, y1 + 3, { align: "center" });
  }
}
