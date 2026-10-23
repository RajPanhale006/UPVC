import type { jsPDF } from "jspdf";

import type { CalculatedWindowRow } from "@/lib/quotation/types";
import { QUOTATION_PDF_COLORS } from "@/lib/quotation/pdf-theme";

import { dimensionsToMm, getDiagramPanels, type PanelKind } from "./window-meta";

type DiagramDetail = {
  code: string;
  profileSystem: string;
  glassLabel: string;
};

/** Realistic UPVC sliding window diagram for proposal PDF (View From Inside). */
export function drawWindowDiagram(
  doc: jsPDF,
  row: CalculatedWindowRow,
  detail: DiagramDetail,
  x: number,
  y: number,
  width: number,
  height: number,
): number {
  const panels = getDiagramPanels(row.windowType);
  const { widthMm, heightMm } = dimensionsToMm(row.length, row.height, row.unit);

  const frame = 5;
  const trackH = 4.5;
  const innerX = x + frame;
  const innerY = y + frame + trackH + 1;
  const innerW = width - frame * 2;
  const innerH = height - frame * 2 - trackH * 2 - 2;
  const panelW = innerW / panels.length;
  const mullion = 1.8;

  doc.setFillColor(250, 250, 249);
  doc.setDrawColor(120, 113, 108);
  doc.setLineWidth(0.55);
  doc.roundedRect(x, y, width, height, 2.5, 2.5, "FD");

  doc.setFillColor(87, 83, 78);
  doc.rect(innerX, y + frame, innerW, trackH, "F");
  doc.rect(innerX, y + height - frame - trackH, innerW, trackH, "F");

  doc.setDrawColor(168, 162, 158);
  doc.setLineWidth(0.25);
  for (let i = 1; i < 5; i += 1) {
    const ty = y + frame + (trackH * i) / 5;
    doc.line(innerX, ty, innerX + innerW, ty);
  }

  panels.forEach((kind, index) => {
    const px = innerX + index * panelW + mullion / 2;
    const pw = panelW - mullion;
    drawSashPanel(doc, kind, px, innerY, pw, innerH, index, panels.length);
    if (index < panels.length - 1) {
      const ix = px + pw + 0.2;
      doc.setFillColor(214, 211, 209);
      doc.setDrawColor(87, 83, 78);
      doc.setLineWidth(0.35);
      doc.rect(ix, innerY + 2, mullion - 0.4, innerH - 4, "FD");
    }
  });

  drawDimensionLine(doc, x + 4, y + height + 5, x + width - 4, y + height + 5, `W ${widthMm} mm`);
  drawDimensionLine(
    doc,
    x + width + 3,
    y + 4,
    x + width + 3,
    y + height - 4,
    `H ${heightMm} mm`,
    true,
  );

  doc.setFont("times", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...QUOTATION_PDF_COLORS.maroon);
  doc.text("View From Inside", x + width / 2, y - 2, { align: "center" });

  doc.setFont("times", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...QUOTATION_PDF_COLORS.black);
  doc.text(
    `Code: ${detail.code}   Size: W × ${formatDim(row.length, row.unit)} H × ${formatDim(row.height, row.unit)}`,
    x,
    y + height + 11,
  );
  doc.text(`Profile System: ${detail.profileSystem}`, x, y + height + 15);
  doc.text(`Glass: ${detail.glassLabel}`, x, y + height + 19);

  return y + height + 22;
}

function formatDim(value: number, unit: string): string {
  const text = Number.isInteger(value) ? String(value) : value.toFixed(1);
  return unit === "feet" ? `${text} ft` : unit === "inch" ? `${text} in` : `${text} mm`;
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
  doc.setFillColor(245, 245, 244);
  doc.setDrawColor(87, 83, 78);
  doc.setLineWidth(0.45);
  doc.roundedRect(x, y, w, h, 1.2, 1.2, "FD");

  const inset = 2.2;
  const gx = x + inset;
  const gy = y + inset;
  const gw = w - inset * 2;
  const gh = h - inset * 2;

  if (kind === "glass") {
    doc.setFillColor(186, 230, 253);
    doc.setDrawColor(14, 116, 144);
    doc.roundedRect(gx, gy, gw, gh, 0.8, 0.8, "FD");
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.2);
    doc.line(gx + gw * 0.12, gy + gh * 0.15, gx + gw * 0.32, gy + gh * 0.38);
    doc.line(gx + gw * 0.55, gy + gh * 0.1, gx + gw * 0.78, gy + gh * 0.28);
    doc.setFillColor(255, 255, 255);
    doc.circle(gx + gw * 0.82, gy + gh * 0.78, 1.1, "F");
    doc.setDrawColor(100, 116, 139);
    doc.circle(gx + gw * 0.82, gy + gh * 0.78, 1.1, "S");
  } else if (kind === "net") {
    doc.setFillColor(226, 232, 240);
    doc.setDrawColor(100, 116, 139);
    doc.roundedRect(gx, gy, gw, gh, 0.8, 0.8, "FD");
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.12);
    for (let i = 0; i < gw + gh; i += 2.2) {
      doc.line(gx, gy + i, gx + i, gy);
      doc.line(gx + gw - i, gy, gx + gw, gy + i);
    }
  } else {
    doc.setFillColor(224, 242, 254);
    doc.setDrawColor(59, 130, 246);
    doc.roundedRect(gx, gy, gw, gh, 0.8, 0.8, "FD");
  }

  if (kind !== "fixed") {
    const arrowY = y + h - 3.5;
    doc.setDrawColor(...QUOTATION_PDF_COLORS.maroon);
    doc.setLineWidth(0.25);
    const dir = index % 2 === 0 ? 1 : -1;
    const ax = x + w / 2;
    doc.line(ax - 4 * dir, arrowY, ax + 4 * dir, arrowY);
    doc.line(ax + 4 * dir, arrowY, ax + (3 * dir), arrowY - 1);
    doc.line(ax + 4 * dir, arrowY, ax + (3 * dir), arrowY + 1);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.5);
  doc.setTextColor(71, 85, 105);
  const label = kind === "glass" ? "GLASS" : kind === "net" ? "MESH" : "FIXED";
  doc.text(label, x + w / 2, y + h / 2 + 1, { align: "center" });

  if (total > 1) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5);
    doc.text(`Sash ${index + 1}`, x + 2, y + 3);
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
  doc.setDrawColor(...QUOTATION_PDF_COLORS.maroon);
  doc.setLineWidth(0.2);
  doc.line(x1, y1, x2, y2);
  doc.line(x1, y1 - 0.8, x1, y1 + 0.8);
  doc.line(x2, y2 - 0.8, x2, y2 + 0.8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  if (vertical) {
    doc.text(label, x1 + 2, (y1 + y2) / 2, { angle: 90 });
  } else {
    doc.text(label, (x1 + x2) / 2, y1 + 3.5, { align: "center" });
  }
}
