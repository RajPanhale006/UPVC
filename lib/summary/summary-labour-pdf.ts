import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import { savePdfDocument } from "@/lib/pdf/save";
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
import { buildExportFilename } from "@/lib/cutting/job-document";
import type { PdfPreviewRenderResult } from "@/lib/preview/pdf-embed";
import { embedPreviewInPdf } from "@/lib/preview/pdf-embed";

import { formatMmPair } from "./format";
import type { SummaryData } from "./types";

function getFinalY(doc: jsPDF, fallback: number): number {
  const table = (
    doc as jsPDF & { lastAutoTable?: { finalY: number } }
  ).lastAutoTable;
  return table?.finalY ?? fallback;
}

export function buildSummaryLabourPdf(
  summary: SummaryData,
  previews: Map<string, PdfPreviewRenderResult> = new Map(),
): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = PDF_MARGIN;
  const exportedAt = new Date().toISOString();

  let y = drawBrandHeader(doc, {
    docTitle: "UPVC Labour Cutting Sheet",
    docSubtitle: "Cutting & fabrication only",
    rightLabel: formatPdfDateTime(exportedAt),
    margin,
  });

  const metaRows: string[][] = [];
  if (summary.customerName) {
    metaRows.push(["Customer", summary.customerName]);
  }
  if (summary.location) {
    metaRows.push(["Site / location", summary.location]);
  }
  metaRows.push([
    summary.productKind === "door" ? "Total doors" : "Total windows",
    String(summary.totalWindows),
  ]);

  autoTable(doc, {
    startY: y,
    theme: "plain",
    styles: { ...brandTableBodyStyles(), fontSize: 9 },
    body: metaRows,
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 40, fillColor: PDF_COLORS.lightBg },
      1: { cellWidth: pageWidth - margin * 2 - 40 },
    },
    margin: { left: margin, right: margin },
  });

  y = getFinalY(doc, y + 16);

  for (const entry of summary.windows) {
    if (y > pageHeight - 70) {
      doc.addPage();
      y = margin;
    }

    y = drawSectionTitle(
      doc,
      `${entry.name} — ${formatMmPair(entry.widthMm, entry.heightMm)}`,
      y + 4,
      margin,
    );

    const diagramWidth = 72;
    const diagramHeight = 52;
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

    const windowMeta: string[][] = [
      ["Final window size", formatMmPair(entry.widthMm, entry.heightMm)],
      ["Quantity", String(entry.quantity)],
      ["Track type", entry.trackLabel],
      ["Profile", entry.profileCode],
      ["Cutting method", entry.methodLabel],
    ];
    if (entry.windowLocation) {
      windowMeta.push(["Window location", entry.windowLocation]);
    }

    autoTable(doc, {
      startY: sectionY,
      theme: "plain",
      styles: { ...brandTableBodyStyles(), fontSize: 8.5 },
      body: windowMeta,
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 38, fillColor: PDF_COLORS.lightBg },
        1: { cellWidth: pageWidth - margin * 2 - 38 - diagramWidth - 6 },
      },
      margin: { left: margin, right: margin + diagramWidth + 6 },
    });

    y = getFinalY(doc, y + 14);

    autoTable(doc, {
      startY: y + 2,
      head: [["Part", "Quantity", "Cutting Size", "Size After Welding"]],
      body: entry.components.map((row) => [
        row.part,
        row.quantity,
        row.cuttingSize,
        row.afterWeldingSize,
      ]),
      styles: { ...brandTableBodyStyles(), fontSize: 8.5, cellPadding: 2.5 },
      headStyles: { ...brandTableHeadStyles(), fontSize: 8.5 },
      alternateRowStyles: { fillColor: PDF_COLORS.lightBg },
      margin: { left: margin, right: margin },
      pageBreak: "avoid",
    });

    y = getFinalY(doc, y + 10);

    if (entry.details.length > 0) {
      if (y > pageHeight - 60) {
        doc.addPage();
        y = margin;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...PDF_COLORS.primaryDark);
      doc.text("Detailed profile pieces", margin, y + 2);
      y += 6;

      autoTable(doc, {
        startY: y,
        head: [["Component", "Qty", "Cutting Size", "After Welding", "Angle"]],
        body: entry.details.map((row) => [
          row.name,
          String(row.qty),
          row.cuttingSize,
          row.afterWeldingSize,
          row.angle,
        ]),
        styles: { ...brandTableBodyStyles(), fontSize: 8, cellPadding: 2 },
        headStyles: { ...brandTableHeadStyles(), fontSize: 8 },
        alternateRowStyles: { fillColor: PDF_COLORS.highlightBg },
        margin: { left: margin, right: margin },
        pageBreak: "avoid",
      });

      y = getFinalY(doc, y + 12);
    }

    y += 4;
  }

  for (const entry of summary.doors ?? []) {
    if (y > pageHeight - 70) {
      doc.addPage();
      y = margin;
    }

    y = drawSectionTitle(
      doc,
      `${entry.name} — ${formatMmPair(entry.widthMm, entry.heightMm)}`,
      y + 4,
      margin,
    );

    const diagramWidth = 72;
    const diagramHeight = 52;
    const diagramX = pageWidth - margin - diagramWidth;
    const sectionY = y;

    embedPreviewInPdf(
      doc,
      previews.get(`door-${entry.index}`) ?? null,
      diagramX,
      sectionY,
      diagramWidth,
      diagramHeight,
    );

    const doorMeta: string[][] = [
      ["Product", "UPVC Door"],
      ["Final door size", formatMmPair(entry.widthMm, entry.heightMm)],
      ["Quantity", String(entry.quantity)],
      ["Configuration", entry.configurationLabel],
      ["Method", entry.methodLabel],
      ["Profile", entry.profileCode],
    ];
    if (entry.doorLocation) {
      doorMeta.push(["Door location", entry.doorLocation]);
    }
    if (entry.flatMullionMm != null) {
      doorMeta.push(["Flat mullion", `${entry.flatMullionMm} mm`]);
    }
    doorMeta.push(["Hardware", entry.hardwareSummary.join(" · ")]);

    autoTable(doc, {
      startY: sectionY,
      theme: "plain",
      styles: { ...brandTableBodyStyles(), fontSize: 8.5 },
      body: doorMeta,
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 38, fillColor: PDF_COLORS.lightBg },
        1: { cellWidth: pageWidth - margin * 2 - 38 - diagramWidth - 6 },
      },
      margin: { left: margin, right: margin + diagramWidth + 6 },
    });

    y = getFinalY(doc, y + 14);

    autoTable(doc, {
      startY: y + 2,
      head: [["Part", "Quantity", "Cutting Size", "Size After Welding"]],
      body: entry.components.map((row) => [
        row.part,
        row.quantity,
        row.cuttingSize,
        row.afterWeldingSize,
      ]),
      styles: { ...brandTableBodyStyles(), fontSize: 8.5, cellPadding: 2.5 },
      headStyles: { ...brandTableHeadStyles(), fontSize: 8.5 },
      alternateRowStyles: { fillColor: PDF_COLORS.lightBg },
      margin: { left: margin, right: margin },
      pageBreak: "avoid",
    });

    y = getFinalY(doc, y + 10);

    if (entry.details.length > 0) {
      autoTable(doc, {
        startY: y,
        head: [["Component", "Qty", "Cutting Size", "Angle"]],
        body: entry.details.map((row) => [
          row.name,
          String(row.qty),
          row.cuttingSize,
          row.angle,
        ]),
        styles: { ...brandTableBodyStyles(), fontSize: 8, cellPadding: 2 },
        headStyles: { ...brandTableHeadStyles(), fontSize: 8 },
        margin: { left: margin, right: margin },
      });
      y = getFinalY(doc, y + 12);
    }

    y += 4;
  }

  if (summary.jobNotes.trim()) {
    if (y > pageHeight - 40) {
      doc.addPage();
      y = margin;
    }
    y = drawSectionTitle(doc, "Notes", y + 2, margin);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...PDF_COLORS.text);
    const noteLines = doc.splitTextToSize(summary.jobNotes.trim(), pageWidth - margin * 2);
    doc.text(noteLines, margin, y + 2);
    y += noteLines.length * 4 + 6;
  }

  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(...PDF_COLORS.muted);
  doc.text(
    "Verify cutting sizes before fabrication. This sheet excludes pricing and quotation details.",
    margin,
    Math.min(y + 4, pageHeight - 14),
    { maxWidth: pageWidth - margin * 2 },
  );

  drawBrandFooter(doc, "Labour cutting sheet — verify sizes before fabrication");
  return doc;
}

export async function buildSummaryLabourPdfAsync(summary: SummaryData): Promise<jsPDF> {
  const {
    buildPreviewDataFromSummaryDoor,
    buildPreviewDataFromSummaryWindow,
  } = await import("@/lib/preview/preview-data-helpers");
  const { renderProductPreviewsForPdf } = await import("@/lib/preview/render-preview-image");

  const items = [
    ...summary.windows.map((entry) => ({
      key: `window-${entry.index}`,
      data: buildPreviewDataFromSummaryWindow(entry),
      options: { pixelWidth: 480, mode: "pdf" as const },
    })),
    ...(summary.doors ?? []).map((entry) => ({
      key: `door-${entry.index}`,
      data: buildPreviewDataFromSummaryDoor(entry),
      options: { pixelWidth: 480, mode: "pdf" as const },
    })),
  ];

  const previews = await renderProductPreviewsForPdf(items);
  return buildSummaryLabourPdf(summary, previews);
}

export async function exportSummaryLabourPdf(summary: SummaryData): Promise<void> {
  const primaryName =
    summary.doors?.[0]?.name ?? summary.windows[0]?.name ?? "labour-cutting";
  const doc = await buildSummaryLabourPdfAsync(summary);
  await savePdfDocument(doc, buildExportFilename(primaryName));
}
