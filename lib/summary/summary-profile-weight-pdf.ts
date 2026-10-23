import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import { savePdfDocument } from "@/lib/pdf/save";
import {
  brandTableBodyStyles,
  brandTableHeadStyles,
  drawBrandFooter,
  drawBrandHeader,
  formatPdfDateTime,
  PDF_COLORS,
  PDF_MARGIN,
} from "@/lib/pdf/theme";
import { buildExportFilename } from "@/lib/cutting/job-document";

import { formatRunFt, formatWeightKg, formatWeightPerFt } from "./format";
import type { SummaryData } from "./types";

function getFinalY(doc: jsPDF, fallback: number): number {
  const table = (
    doc as jsPDF & { lastAutoTable?: { finalY: number } }
  ).lastAutoTable;
  return table?.finalY ?? fallback;
}

function formatWeightCell(row: SummaryData["profileCostSummary"]["rows"][number]): string {
  if (row.isSteel) return "N/A";
  if (row.missingWeight) return "Weight not configured";
  if (row.totalWeight != null) return formatWeightKg(row.totalWeight);
  return "—";
}

function formatWeightPerFtCell(
  row: SummaryData["profileCostSummary"]["rows"][number],
): string {
  if (row.isSteel) return "N/A";
  if (row.missingWeight || row.weightPerFt == null || row.weightPerFt <= 0) {
    return "—";
  }
  return formatWeightPerFt(row.weightPerFt);
}

export function buildSummaryProfileWeightPdf(summary: SummaryData): jsPDF {
  const { profileCostSummary } = summary;
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = PDF_MARGIN;
  const exportedAt = new Date().toISOString();

  let y = drawBrandHeader(doc, {
    docTitle: "Profile Weight Summary",
    docSubtitle: "Profile-wise UPVC weight",
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
  metaRows.push(
    ["Total windows", String(summary.totalWindows)],
    ["Wastage for costing", `${profileCostSummary.wastagePercent}%`],
  );

  autoTable(doc, {
    startY: y,
    theme: "plain",
    styles: { ...brandTableBodyStyles(), fontSize: 9 },
    body: metaRows,
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 42, fillColor: PDF_COLORS.lightBg },
      1: { cellWidth: pageWidth - margin * 2 - 42 },
    },
    margin: { left: margin, right: margin },
  });

  y = getFinalY(doc, y + 16);

  autoTable(doc, {
    startY: y + 2,
    head: [
      [
        "Sr",
        "Profile Name",
        "Profile Code",
        "Costing Run Ft",
        "Weight per Ft",
        "Weight (kg)",
      ],
    ],
    body: profileCostSummary.rows.map((row, index) => [
      String(index + 1),
      row.profileName,
      row.profileCode,
      formatRunFt(row.costingRunFt),
      formatWeightPerFtCell(row),
      formatWeightCell(row),
    ]),
    styles: { ...brandTableBodyStyles(), fontSize: 9, cellPadding: 2.5 },
    headStyles: { ...brandTableHeadStyles(), fontSize: 9 },
    alternateRowStyles: { fillColor: PDF_COLORS.lightBg },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      3: { halign: "right" },
      4: { halign: "right" },
      5: { halign: "right", fontStyle: "bold" },
    },
    margin: { left: margin, right: margin },
  });

  y = getFinalY(doc, y + 14);

  if (y > pageHeight - 36) {
    doc.addPage();
    y = margin;
  }

  autoTable(doc, {
    startY: y + 4,
    theme: "plain",
    styles: { ...brandTableBodyStyles(), fontSize: 10, cellPadding: 3 },
    body: [
      [
        "Total Costing Running Feet",
        formatRunFt(profileCostSummary.totalCostingRunFt),
      ],
      [
        "Total UPVC Profile Weight",
        formatWeightKg(profileCostSummary.totalUpvcWeight),
      ],
    ],
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 70, fillColor: PDF_COLORS.highlightBg },
      1: { halign: "right", fontStyle: "bold", fontSize: 11 },
    },
    margin: { left: margin, right: margin },
  });

  y = getFinalY(doc, y + 20);

  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(...PDF_COLORS.muted);
  doc.text(
    "Steel reinforcement is listed for reference only — weight is not applicable. UPVC weights include wastage on costing run feet.",
    margin,
    Math.min(y + 4, pageHeight - 14),
    { maxWidth: pageWidth - margin * 2 },
  );

  drawBrandFooter(doc, "Profile weight summary — internal workshop reference");
  return doc;
}

export async function exportSummaryProfileWeightPdf(
  summary: SummaryData,
): Promise<void> {
  const primaryName = summary.windows[0]?.name ?? "profile-weight";
  const doc = buildSummaryProfileWeightPdf(summary);
  await savePdfDocument(
    doc,
    buildExportFilename(`${primaryName}-profile-weight`),
  );
}
