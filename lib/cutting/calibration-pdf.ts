import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { PDFDocument } from "pdf-lib";

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
import { runCalibration } from "./calibration";
import type {
  CalibrationInput,
  CuttingOptions,
  TrackSystemId,
} from "./types";

const META_PREFIX = "UPVCCALIB:";

export type CalibrationDocument = {
  version: 1;
  exportedAt: string;
  trackId: TrackSystemId;
  options: CuttingOptions;
  calibration: CalibrationInput;
};

function encodeDoc(doc: CalibrationDocument): string {
  return `${META_PREFIX}${btoa(JSON.stringify(doc))}`;
}

function decodeDoc(encoded: string | undefined | null): CalibrationDocument | null {
  if (!encoded || !encoded.startsWith(META_PREFIX)) return null;
  try {
    return JSON.parse(atob(encoded.slice(META_PREFIX.length))) as CalibrationDocument;
  } catch {
    return null;
  }
}

export async function exportCalibrationPdf(
  input: Omit<CalibrationDocument, "version" | "exportedAt">,
): Promise<void> {
  const record: CalibrationDocument = {
    version: 1,
    exportedAt: new Date().toISOString(),
    ...input,
  };

  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = PDF_MARGIN;
  let y = drawBrandHeader(doc, {
    docTitle: "Calibration Report",
    docSubtitle: "— Workshop Cuts",
    rightLabel: formatPdfDateTime(record.exportedAt),
    margin,
  });

  const methodLabel =
    CUTTING_METHOD_LABELS[record.options.cuttingMethod] ?? record.options.cuttingMethod;

  autoTable(doc, {
    startY: y,
    theme: "plain",
    styles: { ...brandTableBodyStyles(), fontSize: 9 },
    body: [
      ["Track", record.trackId],
      ["Cutting method", methodLabel],
      [
        "Sample opening",
        `${record.calibration.sampleWidthMm.toFixed(1)} × ${record.calibration.sampleHeightMm.toFixed(1)} mm`,
      ],
    ],
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 45, fillColor: PDF_COLORS.lightBg },
      1: { cellWidth: pageWidth - margin * 2 - 45 },
    },
    margin: { left: margin, right: margin },
  });

  y = getFinalY(doc, y + 20) + 4;

  y = drawSectionTitle(doc, "Calculated vs actual (workshop measured)", y, margin);

  const calc = runCalibration(record.calibration, record.options);

  autoTable(doc, {
    startY: y + 2,
    head: [["Cut", "Calculated", "Actual", "Diff mm"]],
    body: [
      ["Frame width", calc.calculated.frameWidth.toFixed(1), record.calibration.actualFrameWidth.toFixed(1), (calc.differences.frameWidth ?? 0).toFixed(1)],
      ["Frame height", calc.calculated.frameHeight.toFixed(1), record.calibration.actualFrameHeight.toFixed(1), (calc.differences.frameHeight ?? 0).toFixed(1)],
      ["Sash top/bottom", calc.calculated.sashTop.toFixed(1), record.calibration.actualSashTop.toFixed(1), (calc.differences.sashTop ?? 0).toFixed(1)],
      ["Sash side", calc.calculated.sashSide.toFixed(1), record.calibration.actualSashSide.toFixed(1), (calc.differences.sashSide ?? 0).toFixed(1)],
      ["Interlock", calc.calculated.interlock.toFixed(1), record.calibration.actualInterlock.toFixed(1), (calc.differences.interlock ?? 0).toFixed(1)],
      ["Glass width", calc.calculated.glassWidth.toFixed(1), record.calibration.actualGlassWidth.toFixed(1), (calc.differences.glassWidth ?? 0).toFixed(1)],
      ["Glass height", calc.calculated.glassHeight.toFixed(1), record.calibration.actualGlassHeight.toFixed(1), (calc.differences.glassHeight ?? 0).toFixed(1)],
    ],
    styles: brandTableBodyStyles(),
    headStyles: brandTableHeadStyles(),
    alternateRowStyles: { fillColor: PDF_COLORS.lightBg },
    margin: { left: margin, right: margin },
  });

  y = getFinalY(doc, y) + 6;

  if (record.options.cuttingMethod === "workshop-confirmed" || record.options.cuttingMethod === "sarik") {
    const title =
      record.options.cuttingMethod === "sarik"
        ? "Suggested Sarik deduction changes"
        : "Suggested workshop deduction changes";
    y = drawSectionTitle(doc, title, y, margin);
    autoTable(doc, {
      startY: y + 2,
      head: [["Parameter", "Suggested value mm"]],
      body: Object.entries(calc.suggestedAdjustments).map(([k, v]) => [
        k,
        v == null ? "—" : String(Math.round(Number(v) * 10) / 10),
      ]),
      styles: brandTableBodyStyles(),
      headStyles: brandTableHeadStyles(),
      margin: { left: margin, right: margin },
    });
  }

  drawBrandFooter(
    doc,
    `${COMPANY_NAME} — calibration report. Re-import to restore inputs.`,
    margin,
  );

  const encoded = encodeDoc(record);
  doc.setProperties({
    title: `Calibration Report - ${COMPANY_NAME}`,
    subject: encoded,
    keywords: encoded,
    creator: pdfCreatorName(),
  });

  const date = new Date().toISOString().slice(0, 10);
  await savePdfDocument(doc, `calibration-${date}.pdf`);
}

export async function importCalibrationPdf(file: File): Promise<CalibrationDocument> {
  const bytes = await file.arrayBuffer();
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });

  const fromSubject = decodeDoc(pdf.getSubject());
  if (fromSubject) return fromSubject;

  const fromKeywords = decodeDoc(pdf.getKeywords() ?? undefined);
  if (fromKeywords) return fromKeywords;

  throw new Error(
    "This PDF is not a Shivshakti Enterprises calibration report. Export one first, then import it here.",
  );
}

function getFinalY(doc: jsPDF, fallback: number): number {
  return (
    (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? fallback
  );
}
