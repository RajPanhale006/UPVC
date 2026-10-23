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
import { getSimpleQuoteProductLabel } from "./product-types";
import type { SimpleQuotePdfInput } from "./types";

function getFinalY(doc: jsPDF, fallback: number): number {
  const table = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable;
  return table?.finalY ?? fallback;
}

function formatRs(amount: number): string {
  if (!Number.isFinite(amount)) return "Rs. 0";
  return `Rs. ${Math.round(amount).toLocaleString("en-IN")}`;
}

function formatDimension(widthMm: number, heightMm: number, unitMode: "mm" | "ft-in"): string {
  if (unitMode === "mm") {
    return `${Math.round(widthMm)} × ${Math.round(heightMm)} mm`;
  }
  return `${Math.round(widthMm)} × ${Math.round(heightMm)} mm`;
}

export function buildSimpleQuotePdf(input: SimpleQuotePdfInput): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
  const margin = PDF_MARGIN;
  const { totals, showWorkshopCost } = input;

  let y = drawBrandHeader(doc, {
    docTitle: "Quick Quote Sheet",
    docSubtitle: "Workshop & customer calculation summary",
    rightLabel: formatPdfDateTime(input.generatedAt),
    margin,
  });

  autoTable(doc, {
    startY: y,
    theme: "plain",
    styles: { ...brandTableBodyStyles(), fontSize: 8.5 },
    body: [
      ["Job ID", input.jobId],
      ["Project", input.projectName || "—"],
      ["Customer", input.customerName || "—"],
      ["Unit mode", input.unitMode === "mm" ? "Millimetres" : "Feet & inches"],
      ["Profit margin", `${input.profitMarginPercent}%`],
      ["Valid lines", String(totals.validRowCount)],
      ["Total area", `${totals.totalAreaSqft.toFixed(2)} sq.ft`],
    ],
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 36, fillColor: PDF_COLORS.lightBg },
    },
    margin: { left: margin, right: margin },
  });

  y = getFinalY(doc, y + 16);
  y = drawSectionTitle(doc, "Line items", y + 2, margin);

  const head = [
    "#",
    "Size",
    "Type",
    "Qty",
    "Sq.ft",
    ...(showWorkshopCost ? ["Workshop", "W/S Rate"] : []),
    "Cust Rate",
    "Customer",
    ...(showWorkshopCost ? ["Profit"] : []),
  ];

  const body = totals.rows
    .filter((row) => row.isValid)
    .map((row, index) => {
      const cells = [
        String(index + 1),
        formatDimension(row.widthMm, row.heightMm, input.unitMode),
        getSimpleQuoteProductLabel(row.productType),
        String(row.quantity),
        row.areaSqft.toFixed(2),
      ];
      if (showWorkshopCost) {
        cells.push(
          row.pricingMode === "lumpsum" ? "Lumpsum" : formatRs(row.workshopTotal),
          row.pricingMode === "lumpsum" ? "—" : formatRs(row.workshopRatePerSqFt),
        );
      }
      cells.push(
        row.pricingMode === "lumpsum" && row.customerRatePerPiece != null
          ? `${formatRs(row.customerRatePerPiece)}/pc`
          : formatRs(row.customerRatePerSqFt),
        formatRs(row.customerTotal),
      );
      if (showWorkshopCost) {
        cells.push(row.pricingMode === "lumpsum" ? "—" : formatRs(row.profitAmount));
      }
      return cells;
    });

  autoTable(doc, {
    startY: y + 2,
    head: [head],
    body,
    styles: { ...brandTableBodyStyles(), fontSize: 7.5, cellPadding: 1.8 },
    headStyles: { ...brandTableHeadStyles(), fontSize: 7 },
    margin: { left: margin, right: margin },
  });

  y = getFinalY(doc, y + 20) + 6;
  y = drawSectionTitle(doc, "Project totals", y, margin);

  const totalRows: string[][] = [
    ["Total area", `${totals.totalAreaSqft.toFixed(2)} sq.ft`],
  ];
  if (showWorkshopCost) {
    totalRows.push(
      ["Total workshop cost", formatRs(totals.totalWorkshopCost)],
      ["Average workshop rate", `${formatRs(totals.averageWorkshopRatePerSqFt)}/sq.ft`],
    );
  }
  totalRows.push(
    [`Average customer rate (+${input.profitMarginPercent}%)`, `${formatRs(totals.averageCustomerRatePerSqFt)}/sq.ft`],
    [`Total customer amount (+${input.profitMarginPercent}%)`, formatRs(totals.totalCustomerAmount)],
  );
  if (showWorkshopCost) {
    totalRows.push(["Total profit", formatRs(totals.totalProfitAmount)]);
  }

  autoTable(doc, {
    startY: y + 2,
    theme: "plain",
    styles: { ...brandTableBodyStyles(), fontSize: 9 },
    body: totalRows,
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 52, fillColor: PDF_COLORS.lightBg },
      1: { fontStyle: "bold" },
    },
    margin: { left: margin, right: margin },
  });

  drawBrandFooter(doc);
  return doc;
}

export async function exportSimpleQuotePdf(input: SimpleQuotePdfInput): Promise<void> {
  const { savePdfDocument } = await import("@/lib/pdf/save");
  const doc = buildSimpleQuotePdf(input);
  const filename = `quick-quote-${input.jobId}.pdf`;
  await savePdfDocument(doc, filename);
}
