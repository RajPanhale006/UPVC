import type { jsPDF } from "jspdf";

import { PDF_COLORS } from "@/lib/pdf/theme";

import { formatBarCutLabel, hasMiterAngle } from "./cut-labels";
import type { OptimizedBarCut } from "../types";
import type { OptimizedBarPlan } from "../types";

const CUT_FILLS: [number, number, number][] = [
  [199, 210, 254],
  [224, 231, 255],
  [186, 230, 253],
  [254, 243, 199],
  [237, 233, 254],
];

const REUSABLE_FILL: [number, number, number] = [226, 232, 240];
const SCRAP_FILL: [number, number, number] = [254, 202, 202];
const KERF_FILL: [number, number, number] = [148, 163, 184];

export type BarDiagramLayout = {
  x: number;
  y: number;
  width: number;
  height: number;
};

function drawMiterEnd(
  doc: jsPDF,
  x: number,
  y: number,
  height: number,
  side: "left" | "right",
): void {
  const inset = Math.min(height * 0.35, 2.5);
  doc.setDrawColor(...PDF_COLORS.text);
  doc.setLineWidth(0.2);
  if (side === "left") {
    doc.line(x, y, x + inset, y + height);
    doc.line(x, y + height, x + inset, y);
  } else {
    doc.line(x, y, x - inset, y + height);
    doc.line(x, y + height, x - inset, y);
  }
}

function drawScrapHatch(doc: jsPDF, x: number, y: number, width: number, height: number): void {
  doc.setDrawColor(180, 100, 100);
  doc.setLineWidth(0.15);
  const step = 1.8;
  for (let offset = -height; offset < width + height; offset += step) {
    doc.line(x + offset, y + height, x + offset + height, y);
  }
}

export type DrawBarDiagramResult = {
  bottomY: number;
};

/**
 * Draw a proportional 5800 mm bar diagram with cut segments, kerf gaps, and leftover.
 * Uses optimizer bar plan data directly — no recalculation.
 */
export function drawBarDiagram(
  doc: jsPDF,
  bar: OptimizedBarPlan,
  layout: BarDiagramLayout,
  cutSequenceStart: number,
): DrawBarDiagramResult {
  const { x, y, width, height } = layout;
  const sourceLengthMm = bar.sourceBarLengthMm;
  const scale = width / sourceLengthMm;
  const kerfMm = bar.totalKerfMm > 0 && bar.cuts.length > 1
    ? bar.totalKerfMm / (bar.cuts.length - 1)
    : 3;

  doc.setDrawColor(...PDF_COLORS.border);
  doc.setLineWidth(0.35);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(x, y, width, height, 0.8, 0.8, "S");

  let cursorX = x;
  let sequence = cutSequenceStart;

  bar.cuts.forEach((cut: OptimizedBarCut, index: number) => {
    const segmentWidth = cut.lengthMm * scale;
    const fill = CUT_FILLS[index % CUT_FILLS.length]!;
    doc.setFillColor(...fill);
    doc.rect(cursorX, y, segmentWidth, height, "F");
    doc.setDrawColor(...PDF_COLORS.text);
    doc.rect(cursorX, y, segmentWidth, height, "S");

    if (hasMiterAngle(cut.cuttingAngle)) {
      drawMiterEnd(doc, cursorX, y, height, "left");
      drawMiterEnd(doc, cursorX + segmentWidth, y, height, "right");
    }

    const label = formatBarCutLabel(cut, sequence);
    sequence += 1;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(...PDF_COLORS.primaryDark);
    doc.text(String(Math.round(cut.lengthMm)), cursorX + segmentWidth / 2, y - 1.2, {
      align: "center",
    });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.5);
    doc.setTextColor(...PDF_COLORS.text);
    const labelLines = doc.splitTextToSize(label, Math.max(segmentWidth, 12));
    doc.text(labelLines, cursorX + segmentWidth / 2, y + height + 2.8, {
      align: "center",
      maxWidth: Math.max(segmentWidth, 12),
    });

    cursorX += segmentWidth;

    if (index < bar.cuts.length - 1) {
      const kerfWidth = Math.max(kerfMm * scale, 0.4);
      doc.setFillColor(...KERF_FILL);
      doc.rect(cursorX, y, kerfWidth, height, "F");
      cursorX += kerfWidth;
    }
  });

  const remainingWidth = Math.max(0, x + width - cursorX);
  if (remainingWidth > 0.5) {
    const isReusable = bar.reusableLeftoverMm > 0;
    doc.setFillColor(...(isReusable ? REUSABLE_FILL : SCRAP_FILL));
    doc.rect(cursorX, y, remainingWidth, height, "F");
    doc.setDrawColor(...PDF_COLORS.muted);
    doc.rect(cursorX, y, remainingWidth, height, "S");
    if (!isReusable && bar.scrapMm > 0) {
      drawScrapHatch(doc, cursorX, y, remainingWidth, height);
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(...PDF_COLORS.muted);
    const restLabel = isReusable ? "REST" : "SCRAP";
    const restMm = isReusable ? bar.reusableLeftoverMm : bar.scrapMm;
    doc.text(`${restLabel} ${Math.round(restMm)}`, cursorX + remainingWidth / 2, y + height / 2 + 1, {
      align: "center",
    });
  }

  return { bottomY: y + height + 8 };
}

export function drawBarDiagramHeader(
  doc: jsPDF,
  bar: OptimizedBarPlan,
  x: number,
  y: number,
  profileCode: string,
): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...PDF_COLORS.primaryDark);
  doc.text(`Bar #${bar.barNumber} (${bar.barId}) — ${profileCode}`, x, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...PDF_COLORS.text);
  const sourceLabel = bar.fromInventory
    ? `Inventory leftover · ${Math.round(bar.sourceBarLengthMm)} mm`
    : `1 × ${Math.round(bar.standardBarLengthMm)} mm`;
  const meta = [
    sourceLabel,
    `Used ${Math.round(bar.usedLengthMm)} mm`,
    `Kerf ${Math.round(bar.totalKerfMm)} mm`,
    `Rest ${Math.round(bar.reusableLeftoverMm)} mm`,
    `Scrap ${Math.round(bar.scrapMm)} mm`,
  ].join("  ·  ");
  doc.text(meta, x, y + 3.5);

  return y + 7;
}
