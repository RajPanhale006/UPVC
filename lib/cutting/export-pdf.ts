import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import { savePdfDocument } from "@/lib/pdf/save";
import { COMPANY_NAME } from "@/lib/brand";
import {
  brandTableBodyStyles,
  brandTableHeadStyles,
  drawBrandFooter,
  drawBrandHeader,
  drawSectionTitle,
  formatPdfDateTime,
  PDF_COLORS,
  PDF_MARGIN,
  pdfCreatorName,
} from "@/lib/pdf/theme";
import { CUTTING_METHOD_LABELS } from "./presets";
import {
  getThreeTrackSashConfiguration,
  THREE_TRACK_SASH_CONFIGURATION_LABELS,
} from "./sash-configuration";
import {
  buildExportFilename,
  encodeJobDocument,
  type CuttingJobExportInput,
} from "./job-document";
import type { PdfPreviewRenderResult } from "@/lib/preview/pdf-embed";
import { embedPreviewInPdf } from "@/lib/preview/pdf-embed";

export function buildCuttingPdf(
  input: CuttingJobExportInput,
  preview?: PdfPreviewRenderResult | null,
): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = PDF_MARGIN;
  let y = drawBrandHeader(doc, {
    docTitle: "Labour Cutting Sheet",
    docSubtitle: "— Production",
    rightLabel: formatPdfDateTime(input.exportedAt),
    margin,
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...PDF_COLORS.primaryDark);
  doc.text(input.jobName, margin, y);
  y += 6;

  const methodLabel =
    CUTTING_METHOD_LABELS[input.options.cuttingMethod] ?? input.options.cuttingMethod;
  const enteredSizeStr = `${Math.round(input.widthMm)} × ${Math.round(input.heightMm)} mm`;
  const isWorkshop = input.options.cuttingMethod === "workshop-confirmed";
  const isSarik = input.options.cuttingMethod === "sarik";
  const frameCutStr = isSarik
    ? `${input.result.cuts.frameTop.toFixed(1)} × ${input.result.cuts.frameLeft.toFixed(1)} mm`
    : `${input.result.cuts.frameWidth.toFixed(1)} × ${input.result.cuts.frameHeight.toFixed(1)} mm`;
  const frameAfterStr = isSarik
    ? `${input.result.cuts.frameWidth.toFixed(1)} × ${input.result.cuts.frameHeight.toFixed(1)} mm`
    : undefined;
  const frameAddNote = isWorkshop
    ? ` (+${input.options.frameAddWidthMm} × ${input.options.frameAddHeightMm} mm add)`
    : "";

  const metaRows: string[][] = [
    ...(input.customerName ? [["Customer", input.customerName]] : []),
    ...(input.location ? [["Location", input.location]] : []),
    ...(input.windowLocation ? [["Window location", input.windowLocation]] : []),
    ["Track type", input.systemLabel],
    ["Profile code", input.profileCode],
    ["Cutting method", methodLabel],
    ["Site / window size (L × H)", enteredSizeStr],
  ];

  if (input.systemId === "3-track-t109") {
    metaRows.push([
      "Sash configuration",
      THREE_TRACK_SASH_CONFIGURATION_LABELS[getThreeTrackSashConfiguration(input.options)],
    ]);
  }

  if (isSarik) {
    metaRows.push(
      ["Cutting size (before welding)", frameCutStr],
      ["Size after welding / joined", frameAfterStr ?? "—"],
    );
  } else {
    metaRows.push([`Frame cutting size${frameAddNote}`, frameCutStr]);
  }

  metaRows.push(["No. of windows", String(input.numberOfWindows)]);

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
      0: { fontStyle: "bold", cellWidth: 42, fillColor: PDF_COLORS.lightBg },
      1: { cellWidth: pageWidth - margin * 2 - 42 - diagramWidth - 6 },
    },
    margin: { left: margin, right: margin + diagramWidth + 6 },
  });

  y = getFinalY(doc, y + 20);

  if (input.jobNotes) {
    y = drawSectionTitle(doc, "Notes for labours", y + 4, margin);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const noteLines = doc.splitTextToSize(input.jobNotes, pageWidth - margin * 2);
    doc.text(noteLines, margin, y + 2);
    y += noteLines.length * 4 + 4;
  }

  y = drawSectionTitle(doc, "Cutting table", y + 2, margin);

  const tableHead = isSarik
    ? [
        "Item",
        "Qty",
        "Cut Before Weld mm",
        "After Weld mm",
        "Angle",
        "Total Qty",
        "Run ft",
        "Notes",
      ]
    : [
        "Sr",
        "Item",
        "Profile",
        "Qty/Win",
        "Cut mm",
        "Cut inch",
        "Ft-in",
        "Angle",
        "Total Qty",
        "Run ft",
        "Notes",
      ];

  const tableBody = isSarik
    ? input.result.tableRows.map((row) => [
        row.item,
        String(row.qtyPerWindow),
        row.cutSizeCrossMm != null
          ? `${row.cutSizeMm.toFixed(0)} × ${row.cutSizeCrossMm.toFixed(0)}`
          : row.cutSizeMm.toFixed(0),
        row.afterWeldingMm != null && row.afterWeldingCrossMm != null
          ? `${row.afterWeldingMm.toFixed(0)} × ${row.afterWeldingCrossMm.toFixed(0)}`
          : row.afterWeldingMm != null
            ? row.afterWeldingMm.toFixed(0)
            : "N/A",
        row.cutAngle,
        String(row.totalQty),
        row.totalRunningFt.toFixed(2),
        row.notes,
      ])
    : input.result.tableRows.map((row) => [
        String(row.srNo),
        row.item,
        row.profileCode,
        String(row.qtyPerWindow),
        row.cutSizeCrossMm != null
          ? `${row.cutSizeMm.toFixed(1)} × ${row.cutSizeCrossMm.toFixed(1)}`
          : row.cutSizeMm.toFixed(1),
        row.cutSizeInch,
        row.cutSizeFtInch,
        row.cutAngle,
        String(row.totalQty),
        row.totalRunningFt.toFixed(2),
        row.notes,
      ]);

  autoTable(doc, {
    startY: y + 2,
    head: [tableHead],
    body: tableBody,
    styles: { ...brandTableBodyStyles(), fontSize: 7, cellPadding: 2 },
    headStyles: { ...brandTableHeadStyles(), fontSize: 7 },
    alternateRowStyles: { fillColor: PDF_COLORS.lightBg },
    margin: { left: margin, right: margin },
  });

  y = getFinalY(doc, y) + 8;

  if (isSarik) {
    if (y > doc.internal.pageSize.getHeight() - 50) {
      doc.addPage();
      y = margin;
    }

    y = drawSectionTitle(doc, "Glass size", y, margin);
    const { glassWidth, glassHeight } = input.result.cuts;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...PDF_COLORS.primaryDark);
    doc.text(
      `Glass Size = ${glassWidth.toFixed(0)} mm × ${glassHeight.toFixed(0)} mm`,
      margin,
      y + 4,
    );
    y += 10;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(
      "Glass Width = Sash After-Welding Width − 111 mm",
      margin,
      y,
    );
    y += 4;
    doc.text(
      "Glass Height = Sash After-Welding Height − 112 mm",
      margin,
      y,
    );
    y += 8;
  } else if (isWorkshop) {
    if (y > doc.internal.pageSize.getHeight() - 50) {
      doc.addPage();
      y = margin;
    }

    y = drawSectionTitle(doc, "Glass size", y, margin);
    const { glassWidth, glassHeight } = input.result.cuts;
    const profileSection = input.options.profileSectionMm;
    const widthLess = input.options.glassWidthLessMm;
    const heightLess = input.options.glassHeightStandardLessMm;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...PDF_COLORS.primaryDark);
    doc.text(
      `Glass Size = ${glassWidth.toFixed(1)} mm × ${glassHeight.toFixed(1)} mm`,
      margin,
      y + 4,
    );
    y += 10;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(
      `Glass Width = Sash Top − ${widthLess} mm`,
      margin,
      y,
    );
    y += 4;
    doc.text(
      `Glass Height = Sash Side − ((${profileSection} × 2) − ${heightLess} mm)`,
      margin,
      y,
    );
    y += 8;
  }

  if (y > doc.internal.pageSize.getHeight() - 40) {
    doc.addPage();
    y = margin;
  }

  y = drawSectionTitle(doc, "Running feet summary", y, margin);

  autoTable(doc, {
    startY: y + 2,
    head: [["Component", "Total running ft"]],
    body: input.result.runningFeetSummary.map((line) => [
      line.label,
      line.feet.toFixed(2),
    ]),
    styles: brandTableBodyStyles(),
    headStyles: brandTableHeadStyles(),
    margin: { left: margin, right: margin },
  });

  y = getFinalY(doc, y) + 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...PDF_COLORS.primaryDark);
  if (isSarik) {
    doc.text(
      "Frame and sash cutting sizes include welding allowance. Final joined size after welding may reduce as per welding loss. Verify one sample before bulk cutting.",
      margin,
      y,
      { maxWidth: pageWidth - margin * 2 },
    );
    y += 10;
  }
  doc.text(
    "Please verify cutting size before cutting. 45° sizes are long point to long point. Glass and steel are 90° straight.",
    margin,
    y,
    { maxWidth: pageWidth - margin * 2 },
  );

  drawBrandFooter(
    doc,
    `${COMPANY_NAME} — labour cutting sheet only (no pricing). Re-import to restore settings.`,
    margin,
  );

  const encodedJob = encodeJobDocument(input);
  try {
    doc.setProperties({
      title: `${input.jobName} - Cutting Sheet - ${COMPANY_NAME}`,
      subject: encodedJob,
      keywords: encodedJob,
      creator: pdfCreatorName(),
    });
  } catch {
    doc.setProperties({
      title: `${input.jobName} - Cutting Sheet - ${COMPANY_NAME}`,
      creator: pdfCreatorName(),
    });
  }

  return doc;
}

export async function buildCuttingPdfAsync(input: CuttingJobExportInput): Promise<jsPDF> {
  const { buildPreviewDataFromCuttingJob } = await import("@/lib/preview/preview-data-helpers");
  const { renderProductPreviewForPdf } = await import("@/lib/preview/render-preview-image");
  const preview = await renderProductPreviewForPdf(buildPreviewDataFromCuttingJob(input), {
    pixelWidth: 560,
    mode: "pdf",
  });
  return buildCuttingPdf(input, preview);
}

export async function exportCuttingPdf(input: CuttingJobExportInput): Promise<void> {
  const doc = await buildCuttingPdfAsync(input);
  await savePdfDocument(doc, buildExportFilename(input.jobName));
}

function getFinalY(doc: jsPDF, fallback: number): number {
  return (
    (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? fallback
  );
}
