import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import {
  brandTableBodyStyles,
  brandTableHeadStyles,
  drawBrandFooter,
  drawBrandHeader,
  drawSectionTitle,
  formatPdfDateTime,
  PDF_COLORS,
  PDF_MARGIN,
} from "@/lib/pdf/theme";
import { embedPreviewInPdf } from "@/lib/preview/pdf-embed";
import type { PdfPreviewRenderResult } from "@/lib/preview/pdf-embed";
import { formatMmPair } from "@/lib/summary/format";
import type { SummaryDetailRow, SummaryWindowEntry } from "@/lib/summary/types";

import type { CutPiece } from "../types";
import type { OptimizedBarPlan } from "../types";
import type { ProfileBarUsageSummary } from "../types";
import { resolveProfileDisplayName } from "./profile-names";
import { drawBarDiagram, drawBarDiagramHeader } from "./draw-bar-diagram";
import type { LabourWorkingPdfInput } from "./types";

function getFinalY(doc: jsPDF, fallback: number): number {
  const table = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable;
  return table?.finalY ?? fallback;
}

function ensureSpace(doc: jsPDF, y: number, needed: number, margin: number): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + needed > pageHeight - 14) {
    doc.addPage();
    return margin;
  }
  return y;
}

function buildProfileCodeLookup(pieces: CutPiece[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const piece of pieces) {
    const windowKey = `${piece.windowRef ?? ""}::${piece.componentLabel ?? piece.componentType}`;
    if (!map.has(windowKey)) {
      map.set(windowKey, piece.profileCode);
    }
    const itemKey = piece.componentLabel ?? String(piece.componentType);
    if (!map.has(itemKey)) {
      map.set(itemKey, piece.profileCode);
    }
  }
  return map;
}

function lookupProfileCode(
  lookup: Map<string, string>,
  windowRef: string,
  detail: SummaryDetailRow,
): string {
  return (
    lookup.get(`${windowRef}::${detail.name}`) ??
    lookup.get(detail.name) ??
    "—"
  );
}

function groupBarsByProfile(barPlans: OptimizedBarPlan[]): Map<string, OptimizedBarPlan[]> {
  const grouped = new Map<string, OptimizedBarPlan[]>();
  for (const bar of barPlans) {
    const list = grouped.get(bar.profileCode) ?? [];
    list.push(bar);
    grouped.set(bar.profileCode, list);
  }
  return grouped;
}

function countTotalCutPieces(summary: ProfileBarUsageSummary, pieces: CutPiece[]): number {
  return pieces
    .filter((piece) => piece.profileCode === summary.profileCode)
    .reduce((sum, piece) => sum + piece.quantity, 0);
}

function drawProductSection(
  doc: jsPDF,
  entry: SummaryWindowEntry,
  profileLookup: Map<string, string>,
  previews: Map<string, PdfPreviewRenderResult>,
  margin: number,
  startY: number,
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = ensureSpace(doc, startY, 80, margin);

  y = drawSectionTitle(
    doc,
    `${entry.name} — ${formatMmPair(entry.widthMm, entry.heightMm)}`,
    y + 2,
    margin,
  );

  const diagramWidth = 68;
  const diagramHeight = 48;
  const diagramX = pageWidth - margin - diagramWidth;
  const sectionY = y;

  embedPreviewInPdf(
    doc,
    previews.get(`window-${entry.index}`) ?? null,
    diagramX,
    sectionY,
    diagramWidth,
    diagramHeight,
  );

  const metaRows: string[][] = [
    ["Final size (W × H)", formatMmPair(entry.widthMm, entry.heightMm)],
    ["Quantity", String(entry.quantity)],
    ["System", entry.trackLabel],
    ["Frame profile", entry.profileCode],
    ["Method", entry.methodLabel],
  ];
  if (entry.sashConfigurationLabel) {
    metaRows.push(["Sash configuration", entry.sashConfigurationLabel]);
  }
  if (entry.windowLocation) {
    metaRows.push(["Location", entry.windowLocation]);
  }

  autoTable(doc, {
    startY: sectionY,
    theme: "plain",
    styles: { ...brandTableBodyStyles(), fontSize: 8 },
    body: metaRows,
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 34, fillColor: PDF_COLORS.lightBg },
      1: { cellWidth: pageWidth - margin * 2 - 34 - diagramWidth - 6 },
    },
    margin: { left: margin, right: margin + diagramWidth + 6 },
  });

  y = getFinalY(doc, y + 12);

  if (entry.components.length > 0) {
    y = ensureSpace(doc, y, 40, margin);
    autoTable(doc, {
      startY: y + 2,
      head: [["Component", "Qty", "Cutting size", "After welding"]],
      body: entry.components.map((row) => [
        row.part,
        row.quantity,
        row.cuttingSize,
        row.afterWeldingSize,
      ]),
      styles: { ...brandTableBodyStyles(), fontSize: 8, cellPadding: 2 },
      headStyles: { ...brandTableHeadStyles(), fontSize: 8 },
      alternateRowStyles: { fillColor: PDF_COLORS.lightBg },
      margin: { left: margin, right: margin },
    });
    y = getFinalY(doc, y + 8);
  }

  if (entry.details.length > 0) {
    y = ensureSpace(doc, y, 50, margin);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...PDF_COLORS.primaryDark);
    doc.text("Physical cut pieces (with profile code)", margin, y + 2);
    y += 5;

    autoTable(doc, {
      startY: y,
      head: [["Component", "Profile", "Qty", "Cut size", "After weld", "Angle"]],
      body: entry.details.map((detail) => [
        detail.name,
        lookupProfileCode(profileLookup, entry.name, detail),
        String(detail.qty),
        detail.cuttingSize,
        detail.afterWeldingSize,
        detail.angle || "—",
      ]),
      styles: { ...brandTableBodyStyles(), fontSize: 7.5, cellPadding: 1.8 },
      headStyles: { ...brandTableHeadStyles(), fontSize: 7.5 },
      alternateRowStyles: { fillColor: PDF_COLORS.highlightBg },
      margin: { left: margin, right: margin },
    });
    y = getFinalY(doc, y + 10);
  }

  return Math.min(y + 4, pageHeight - 10);
}

function drawProfileBarSection(
  doc: jsPDF,
  profileCode: string,
  bars: OptimizedBarPlan[],
  profileSummary: ProfileBarUsageSummary | undefined,
  profileRates: LabourWorkingPdfInput["profileRates"],
  pieces: CutPiece[],
  margin: number,
  startY: number,
  cutSequenceStart: number,
): { y: number; nextCutSequence: number } {
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - margin * 2;
  let y = ensureSpace(doc, startY, 36, margin);
  let cutSequence = cutSequenceStart;

  const profileName = resolveProfileDisplayName(profileCode, profileRates);
  y = drawSectionTitle(doc, `${profileCode} — ${profileName}`, y + 2, margin);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...PDF_COLORS.text);
  doc.text(
    `Standard bar ${Math.round(bars[0]?.standardBarLengthMm ?? 5800)} mm · Full bars ${profileSummary?.newBarsRequired ?? bars.filter((b) => !b.fromInventory).length} · Inventory used ${profileSummary?.inventoryBarsConsumed ?? bars.filter((b) => b.fromInventory).length}`,
    margin,
    y + 1,
  );
  y += 6;

  for (const bar of bars) {
    y = ensureSpace(doc, y, 28, margin);
    y = drawBarDiagramHeader(doc, bar, margin, y, profileCode);
    const result = drawBarDiagram(
      doc,
      bar,
      { x: margin, y: y + 1, width: contentWidth, height: 10 },
      cutSequence,
    );
    cutSequence += bar.cuts.length;
    y = result.bottomY + 3;
  }

  if (profileSummary) {
    y = ensureSpace(doc, y, 24, margin);
    autoTable(doc, {
      startY: y,
      head: [["Metric", "Value"]],
      body: [
        ["Standard bar length", `${Math.round(profileSummary.standardBarLengthMm)} mm`],
        ["Full bars used", `${profileSummary.newBarsRequired} Pcs`],
        ["Inventory bars consumed", `${profileSummary.inventoryBarsConsumed} Pcs`],
        ["Total cut pieces", String(countTotalCutPieces(profileSummary, pieces))],
        ["Net required length", `${Math.round(profileSummary.netRequiredLengthMm)} mm`],
        ["Purchased length", `${Math.round(profileSummary.purchasedLengthMm)} mm`],
        ["Reusable leftover", `${Math.round(profileSummary.reusableLeftoverMm)} mm`],
        ["Scrap", `${Math.round(profileSummary.scrapMm)} mm`],
        ["Kerf", `${Math.round(profileSummary.totalKerfMm)} mm`],
        ["Material utilization", `${profileSummary.materialUtilizationPercent.toFixed(2)}%`],
        ["Optimization waste", `${profileSummary.optimizationWastePercent.toFixed(2)}%`],
      ],
      styles: { ...brandTableBodyStyles(), fontSize: 7.5, cellPadding: 1.8 },
      headStyles: { ...brandTableHeadStyles(), fontSize: 7.5 },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 52, fillColor: PDF_COLORS.lightBg },
      },
      margin: { left: margin, right: margin },
    });
    y = getFinalY(doc, y + 6);
  }

  return { y: y + 4, nextCutSequence: cutSequence };
}

export function buildLabourWorkingPdf(input: LabourWorkingPdfInput): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = PDF_MARGIN;
  const exportedAt = input.exportedAt ?? new Date().toISOString();
  const previews = input.previews ?? new Map<string, PdfPreviewRenderResult>();
  const profileLookup = buildProfileCodeLookup(input.optimization.cutPieces);

  let y = drawBrandHeader(doc, {
    docTitle: "Labour Working Sheet",
    docSubtitle: "Profile cutting optimization — workshop floor",
    rightLabel: formatPdfDateTime(exportedAt),
    margin,
  });

  const projectLabel =
    input.projectName?.trim() ||
    input.summary.customerName?.trim() ||
    input.summary.windows[0]?.name ||
    "Workshop job";

  const metaRows: string[][] = [
    ["Project / job", projectLabel],
  ];
  if (input.jobCode) {
    metaRows.push(["Job code", input.jobCode]);
  }
  if (input.summary.customerName) {
    metaRows.push(["Customer", input.summary.customerName]);
  }
  if (input.summary.location) {
    metaRows.push(["Site", input.summary.location]);
  }
  metaRows.push(["Products", String(input.summary.totalWindows)]);
  metaRows.push(["Total area", `${input.summary.totalAreaSqft.toFixed(2)} sq.ft`]);

  autoTable(doc, {
    startY: y,
    theme: "plain",
    styles: { ...brandTableBodyStyles(), fontSize: 8.5 },
    body: metaRows,
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 36, fillColor: PDF_COLORS.lightBg },
      1: { cellWidth: pageWidth - margin * 2 - 36 },
    },
    margin: { left: margin, right: margin },
  });

  y = getFinalY(doc, y + 14);

  if (input.summary.windows.length > 0 || (input.summary.doors?.length ?? 0) > 0) {
    y = drawSectionTitle(doc, "Window / door cutting details", y + 2, margin);
    y += 4;
  }

  for (const entry of input.summary.windows) {
    y = drawProductSection(doc, entry, profileLookup, previews, margin, y);
  }

  for (const entry of input.summary.doors ?? []) {
    y = ensureSpace(doc, y, 80, margin);
    y = drawSectionTitle(
      doc,
      `${entry.name} — ${formatMmPair(entry.widthMm, entry.heightMm)}`,
      y + 2,
      margin,
    );
    const metaRowsDoor: string[][] = [
      ["Final size", formatMmPair(entry.widthMm, entry.heightMm)],
      ["Configuration", entry.configurationLabel],
      ["Profile", entry.profileCode],
      ["Method", entry.methodLabel],
    ];
    autoTable(doc, {
      startY: y + 2,
      theme: "plain",
      styles: { ...brandTableBodyStyles(), fontSize: 8 },
      body: metaRowsDoor,
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 36, fillColor: PDF_COLORS.lightBg },
      },
      margin: { left: margin, right: margin },
    });
    y = getFinalY(doc, y + 16);

    if (entry.details.length > 0) {
      autoTable(doc, {
        startY: y,
        head: [["Component", "Profile", "Qty", "Cut size", "Angle"]],
        body: entry.details.map((detail) => [
          detail.name,
          lookupProfileCode(profileLookup, entry.name, detail),
          String(detail.qty),
          detail.cuttingSize,
          detail.angle || "—",
        ]),
        styles: { ...brandTableBodyStyles(), fontSize: 7.5, cellPadding: 1.8 },
        headStyles: { ...brandTableHeadStyles(), fontSize: 7.5 },
        margin: { left: margin, right: margin },
      });
      y = getFinalY(doc, y + 10);
    }
  }

  doc.addPage();
  y = margin;
  y = drawSectionTitle(doc, "Profile-wise 5800 mm bar diagrams", y, margin);
  y += 4;

  const barsByProfile = groupBarsByProfile(input.optimization.optimization.barPlans);
  const summaryByProfile = new Map(
    input.optimization.optimization.profileSummaries.map((row) => [row.profileCode, row]),
  );

  let cutSequence = 1;
  for (const profileCode of [...barsByProfile.keys()].sort()) {
    const bars = barsByProfile.get(profileCode) ?? [];
    const profileSummary = summaryByProfile.get(profileCode);
    const section = drawProfileBarSection(
      doc,
      profileCode,
      bars,
      profileSummary,
      input.profileRates,
      input.optimization.cutPieces,
      margin,
      y,
      cutSequence,
    );
    y = section.y;
    cutSequence = section.nextCutSequence;
  }

  doc.addPage();
  y = margin;
  y = drawSectionTitle(doc, "Profile optimization & wastage summary", y, margin);
  y += 4;

  autoTable(doc, {
    startY: y,
    head: [[
      "Profile code",
      "Profile name",
      "Std bar (mm)",
      "Full bars",
      "Cut pieces",
      "Net req (mm)",
      "Purchased (mm)",
      "Reusable (mm)",
      "Scrap (mm)",
      "Kerf (mm)",
      "Util %",
      "Opt waste %",
    ]],
    body: input.optimization.optimization.profileSummaries.map((row) => [
      row.profileCode,
      resolveProfileDisplayName(row.profileCode, input.profileRates),
      String(Math.round(row.standardBarLengthMm)),
      String(row.newBarsRequired),
      String(countTotalCutPieces(row, input.optimization.cutPieces)),
      String(Math.round(row.netRequiredLengthMm)),
      String(Math.round(row.purchasedLengthMm)),
      String(Math.round(row.reusableLeftoverMm)),
      String(Math.round(row.scrapMm)),
      String(Math.round(row.totalKerfMm)),
      row.materialUtilizationPercent.toFixed(2),
      row.optimizationWastePercent.toFixed(2),
    ]),
    styles: { ...brandTableBodyStyles(), fontSize: 7, cellPadding: 1.6 },
    headStyles: { ...brandTableHeadStyles(), fontSize: 6.5 },
    alternateRowStyles: { fillColor: PDF_COLORS.lightBg },
    margin: { left: margin, right: margin },
  });

  if (input.summary.jobNotes.trim()) {
    y = getFinalY(doc, y + 10);
    y = ensureSpace(doc, y, 20, margin);
    y = drawSectionTitle(doc, "Notes", y + 2, margin);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...PDF_COLORS.text);
    const noteLines = doc.splitTextToSize(input.summary.jobNotes.trim(), pageWidth - margin * 2);
    doc.text(noteLines, margin, y + 2);
  }

  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(...PDF_COLORS.muted);
  doc.text(
    "Workshop floor sheet — no pricing. Verify all cutting sizes before fabrication. Bar plans from practical 5800 mm optimizer.",
    margin,
    doc.internal.pageSize.getHeight() - 10,
    { maxWidth: pageWidth - margin * 2 },
  );

  drawBrandFooter(doc, "Labour Working Sheet — profile cutting optimization");
  return doc;
}

export async function buildLabourWorkingPdfAsync(
  input: LabourWorkingPdfInput,
): Promise<jsPDF> {
  const {
    buildPreviewDataFromSummaryDoor,
    buildPreviewDataFromSummaryWindow,
  } = await import("@/lib/preview/preview-data-helpers");
  const { renderProductPreviewsForPdf } = await import("@/lib/preview/render-preview-image");

  const items = [
    ...input.summary.windows.map((entry) => ({
      key: `window-${entry.index}`,
      data: buildPreviewDataFromSummaryWindow(entry),
      options: { pixelWidth: 480, mode: "pdf" as const },
    })),
    ...(input.summary.doors ?? []).map((entry) => ({
      key: `door-${entry.index}`,
      data: buildPreviewDataFromSummaryDoor(entry),
      options: { pixelWidth: 480, mode: "pdf" as const },
    })),
  ];

  const previews = await renderProductPreviewsForPdf(items);
  return buildLabourWorkingPdf({ ...input, previews });
}
