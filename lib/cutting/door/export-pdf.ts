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

import { DOOR_METHOD_LABEL, DOOR_PROFILE_CODES } from "./constants";
import type { PdfPreviewRenderResult } from "@/lib/preview/pdf-embed";
import { embedPreviewInPdf } from "@/lib/preview/pdf-embed";
import {
  DOOR_CONFIGURATION_LABELS,
  DOOR_OPENING_DIRECTION_LABELS,
  DOOR_OPENING_SIDE_LABELS,
  formatDoorHardwareSummary,
} from "./defaults";
import type { DoorCuttingOptions, DoorCuttingResult } from "./types";

export type DoorJobExportInput = {
  exportedAt: string;
  jobName: string;
  jobNotes: string;
  customerName: string;
  location: string;
  doorLocation: string;
  widthMm: number;
  heightMm: number;
  numberOfDoors: number;
  options: DoorCuttingOptions;
  result: DoorCuttingResult;
};

function buildExportFilename(jobName: string): string {
  const safe = jobName.replace(/[^\w.-]+/g, "_").slice(0, 60);
  return `${safe || "door-cutting"}-labour.pdf`;
}

export function buildDoorCuttingPdf(
  input: DoorJobExportInput,
  preview?: PdfPreviewRenderResult | null,
): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = PDF_MARGIN;
  let y = drawBrandHeader(doc, {
    docTitle: "Door Labour Cutting Sheet",
    docSubtitle: "— Sarik Door Method",
    rightLabel: formatPdfDateTime(input.exportedAt),
    margin,
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...PDF_COLORS.primaryDark);
  doc.text(input.jobName, margin, y);
  y += 6;

  const { components } = input.result;
  const { options } = input;
  const metaRows: string[][] = [
    ...(input.customerName ? [["Customer", input.customerName]] : []),
    ...(input.location ? [["Location", input.location]] : []),
    ...(input.doorLocation ? [["Door location", input.doorLocation]] : []),
    ["Product", "UPVC Door"],
    ["Cutting method", DOOR_METHOD_LABEL],
    [
      "Door configuration",
      DOOR_CONFIGURATION_LABELS[options.configuration],
    ],
    [
      "Opening",
      `${DOOR_OPENING_SIDE_LABELS[options.openingSide]} · ${DOOR_OPENING_DIRECTION_LABELS[options.openingDirection]}`,
    ],
    [
      "Final door size (W × H)",
      `${Math.round(input.widthMm)} × ${Math.round(input.heightMm)} mm`,
    ],
    [
      "Frame cutting size",
      `${components.frame.widthMm} × ${components.frame.heightMm} mm`,
    ],
    [
      "Sash cutting size",
      `${components.sash.widthMm} × ${components.sash.heightMm} mm (${components.sash.quantity} sash)`,
    ],
    [
      "Beading size",
      `${components.beading.widthMm} × ${components.beading.heightMm} mm`,
    ],
    [
      "Glass size",
      `${components.glass.widthMm} × ${components.glass.heightMm} mm`,
    ],
  ];

  if (components.flatMullionMm != null) {
    metaRows.push(["Flat mullion", `${components.flatMullionMm} mm`]);
  }

  metaRows.push(
    ["Frame profile", DOOR_PROFILE_CODES.frame],
    ["Sash profile", DOOR_PROFILE_CODES.sash],
    ["Beading profile", DOOR_PROFILE_CODES.beading],
    ["No. of doors", String(input.numberOfDoors)],
  );

  const diagramWidth = 82;
  const diagramHeight = 58;
  const diagramX = pageWidth - margin - diagramWidth;
  const metaStartY = y;

  embedPreviewInPdf(
    doc,
    preview ?? null,
    diagramX,
    metaStartY,
    diagramWidth,
    diagramHeight,
  );

  autoTable(doc, {
    startY: metaStartY,
    theme: "plain",
    styles: { ...brandTableBodyStyles(), fontSize: 9 },
    body: metaRows,
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 48, fillColor: PDF_COLORS.lightBg },
      1: { cellWidth: pageWidth - margin * 2 - 48 - diagramWidth - 6 },
    },
    margin: { left: margin, right: margin + diagramWidth + 6 },
  });

  y =
    (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? y + 40;

  y = drawSectionTitle(doc, "Hardware", y + 4, margin);
  autoTable(doc, {
    startY: y,
    theme: "plain",
    styles: { ...brandTableBodyStyles(), fontSize: 9 },
    body: formatDoorHardwareSummary(options).map((line) => ["", line]),
    margin: { left: margin, right: margin },
  });

  y =
    (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? y + 16;

  y = drawSectionTitle(doc, "Cutting list", y + 4, margin);

  autoTable(doc, {
    startY: y,
    head: [
      [
        "Sr",
        "Item",
        "Profile",
        "Qty/Door",
        "Cut mm",
        "Inch",
        "Angle",
        "Total Qty",
        "Run Ft",
        "Notes",
      ],
    ],
    body: input.result.tableRows.map((row) => [
      String(row.srNo),
      row.item,
      row.profileCode,
      String(row.qtyPerWindow),
      row.cutSizeCrossMm != null
        ? `${Math.round(row.cutSizeMm)} × ${Math.round(row.cutSizeCrossMm)}`
        : String(Math.round(row.cutSizeMm)),
      row.cutSizeInch,
      row.cutAngle,
      String(row.totalQty),
      row.totalRunningFt.toFixed(2),
      row.notes,
    ]),
    headStyles: brandTableHeadStyles(),
    bodyStyles: brandTableBodyStyles(),
    styles: { fontSize: 8, cellPadding: 2 },
    margin: { left: margin, right: margin },
  });

  drawBrandFooter(doc, "Door labour cutting sheet — verify sizes before fabrication.");
  return doc;
}

export async function buildDoorCuttingPdfAsync(
  input: DoorJobExportInput,
): Promise<jsPDF> {
  const { buildPreviewDataFromDoorCuttingJob } = await import(
    "@/lib/preview/preview-data-helpers"
  );
  const { renderProductPreviewForPdf } = await import("@/lib/preview/render-preview-image");
  const preview = await renderProductPreviewForPdf(
    buildPreviewDataFromDoorCuttingJob(input),
    { pixelWidth: 560, mode: "pdf" },
  );
  return buildDoorCuttingPdf(input, preview);
}

export async function exportDoorCuttingPdf(
  input: DoorJobExportInput,
): Promise<void> {
  const doc = await buildDoorCuttingPdfAsync(input);
  await savePdfDocument(doc, buildExportFilename(input.jobName));
}
