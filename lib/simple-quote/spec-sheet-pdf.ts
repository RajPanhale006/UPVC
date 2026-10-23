import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import { buildPreviewDataFromEstimation } from "@/components/product-preview/preview-mapper";
import { calculateProduct, getProductProfileCode } from "@/lib/calculations";
import { mmAreaToSqFt } from "@/lib/calculations/format";
import type { DoorHardwareMasterSettings } from "@/lib/door-hardware";
import { COMPANY_PDF_FOOTER } from "@/lib/brand";
import type { ProfileRateSettings } from "@/lib/profiles";
import { embedPreviewInPdf, type PdfPreviewRenderResult } from "@/lib/preview/pdf-embed";
import {
  drawBrandFooter,
  drawBrandHeader,
  formatPdfDateTime,
  PDF_COLORS,
  PDF_MARGIN,
} from "@/lib/pdf/theme";
import {
  QUOTATION_PDF_COLORS,
  QUOTATION_PDF_FONT,
  QUOTATION_PDF_MARGINS,
} from "@/lib/quotation/pdf-theme";
import { formatPdfRs } from "@/lib/quotation/pdf";
import type { CuttingJobMeta } from "@/lib/summary/types";

import { isLowersProduct } from "./lowers-pricing";
import { getSimpleQuoteProductLabel } from "./product-types";
import { mmToFeetInchesExact } from "./row-dimensions";
import { rowToProductInputs } from "./row-to-product";
import type { SimpleQuoteRateSettings } from "./rate-settings";
import type { SimpleQuoteRow, SimpleQuoteRowResult, SimpleQuoteTotals } from "./types";

export type SimpleQuoteSpecSheetInput = {
  jobId: string;
  projectName: string;
  customerName: string;
  rows: SimpleQuoteRow[];
  totals: SimpleQuoteTotals;
  profitMarginPercent: number;
  generatedAt: string;
  profileRates: ProfileRateSettings;
  doorHardwareMaster: DoorHardwareMasterSettings;
  cuttingJobMeta: CuttingJobMeta;
  rateSettings?: SimpleQuoteRateSettings;
  showPrices?: boolean;
};

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = QUOTATION_PDF_MARGINS.left;

function getTableY(doc: jsPDF, fallback: number): number {
  return (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? fallback;
}

function formatFeetInches(widthMm: number, heightMm: number): string {
  const w = mmToFeetInchesExact(widthMm);
  const h = mmToFeetInchesExact(heightMm);
  return `${w.feet}' ${w.inches}" × ${h.feet}' ${h.inches}"`;
}

function sashConfiguration(type: SimpleQuoteRowResult["productType"]): string {
  switch (type) {
    case "2-track":
      return "2 Glass sliding sashes";
    case "2.5-track":
      return "2 Glass + 1 Net sliding sashes";
    case "3-track-2g1n":
      return "2 Glass + 1 Net";
    case "3-track-3g":
      return "3 Glass (no net)";
    case "single-door":
      return "Single leaf door";
    case "double-door":
      return "Double leaf door";
    case "fixed-frame":
      return "Fixed partition / glazing";
    case "lowers":
      return "Casement frame with blade & glass";
    default:
      return getSimpleQuoteProductLabel(type);
  }
}

function meshDetails(type: SimpleQuoteRowResult["productType"]): string {
  switch (type) {
    case "2.5-track":
    case "3-track-2g1n":
      return "1 sliding net sash";
    case "2-track":
    case "3-track-3g":
      return "No net sash";
    default:
      return "—";
  }
}

function keyFeatures(type: SimpleQuoteRowResult["productType"]): string[] {
  const common = [
    "Premium UPVC profiles with multi-chamber design",
    "Toughened / laminated glass as per specification",
    "SS304 hardware with smooth operation",
    "Weather-sealed tracks and drainage system",
  ];
  switch (type) {
    case "2.5-track":
    case "3-track-2g1n":
      return [...common, "Integrated mosquito mesh sash", "Smooth sliding operation"];
    case "lowers":
      return [
        "Casement frame with blade & glass",
        "Lumpsum supply & installation per piece",
        "Powder-coated / laminated finish options",
      ];
    default:
      return common;
  }
}

function resolvePreviewData(
  row: SimpleQuoteRow,
  input: SimpleQuoteSpecSheetInput,
): import("@/components/product-preview/preview-types").ProductPreviewData | null {
  if (isLowersProduct(row.productType)) return null;

  const { estimationInputs, cuttingOptions } = rowToProductInputs(
    row,
    input.profileRates,
    input.rateSettings,
  );
  const calc = calculateProduct({
    estimationInputs,
    cuttingOptions,
    profileRates: input.profileRates,
    cuttingJobMeta: input.cuttingJobMeta,
    doorHardwareMaster: input.doorHardwareMaster,
  });
  if (!calc.validation.isValid) return null;

  return buildPreviewDataFromEstimation(
    estimationInputs,
    cuttingOptions,
    getProductProfileCode(calc),
  );
}

function drawSpecPage(
  doc: jsPDF,
  index: number,
  row: SimpleQuoteRow,
  result: SimpleQuoteRowResult,
  input: SimpleQuoteSpecSheetInput,
  preview: PdfPreviewRenderResult | null,
): void {
  if (index > 0) doc.addPage();

  let y = drawBrandHeader(doc, {
    docTitle: "Window Specification Sheet",
    docSubtitle: getSimpleQuoteProductLabel(row.productType),
    rightLabel: formatPdfDateTime(input.generatedAt),
    margin: PDF_MARGIN,
  });

  doc.setFont(QUOTATION_PDF_FONT, "bold");
  doc.setFontSize(11);
  doc.setTextColor(...PDF_COLORS.text);
  doc.text(`Item ${String(index + 1).padStart(2, "0")}`, MARGIN, y);
  y += 5;

  doc.setFont(QUOTATION_PDF_FONT, "normal");
  doc.setFontSize(9);
  doc.setTextColor(...PDF_COLORS.muted);
  const meta = [
    input.projectName ? `Project: ${input.projectName}` : null,
    input.customerName ? `Customer: ${input.customerName}` : null,
    `Job: ${input.jobId}`,
  ]
    .filter(Boolean)
    .join("  ·  ");
  doc.text(meta, MARGIN, y);
  y += 8;

  const diagramBottom = embedPreviewInPdf(doc, preview, MARGIN, y, 92, 72, {
    drawCaption: true,
  });

  const areaPerUnit = mmAreaToSqFt(result.widthMm, result.heightMm);
  const specs: [string, string][] = [
    ["Product", getSimpleQuoteProductLabel(row.productType)],
    ["Size (mm)", `${Math.round(result.widthMm)} × ${Math.round(result.heightMm)} mm`],
    ["Size (ft/in)", formatFeetInches(result.widthMm, result.heightMm)],
    ["Quantity", `${result.quantity} Nos`],
    ["Area / unit", `${areaPerUnit.toFixed(2)} sq.ft`],
    ["Total area", `${result.areaSqft.toFixed(2)} sq.ft`],
    ["Configuration", sashConfiguration(result.productType)],
    ["Mesh", meshDetails(result.productType)],
    ["Glass", isLowersProduct(row.productType) ? "Blade + glass (lumpsum)" : "As per system"],
  ];

  if (result.pricingMode === "lumpsum" && result.customerRatePerPiece) {
    specs.push(["Rate / piece", formatPdfRs(result.customerRatePerPiece)]);
  } else if (result.customerRatePerSqFt > 0) {
    specs.push(["Customer rate", `${formatPdfRs(result.customerRatePerSqFt)}/sq.ft`]);
  }

  if (input.showPrices !== false) {
    specs.push(["Line total", formatPdfRs(result.customerTotal)]);
  }

  if (result.pricingNote) {
    specs.push(["Pricing note", result.pricingNote]);
  }

  autoTable(doc, {
    startY: y,
    body: specs,
    theme: "grid",
    margin: { left: MARGIN + 96, right: MARGIN },
    tableWidth: PAGE_WIDTH - MARGIN * 2 - 96,
    styles: {
      font: QUOTATION_PDF_FONT,
      fontSize: 8.5,
      cellPadding: 1.8,
      lineColor: QUOTATION_PDF_COLORS.border,
      textColor: QUOTATION_PDF_COLORS.black,
    },
    columnStyles: {
      0: { cellWidth: 36, fontStyle: "bold", fillColor: PDF_COLORS.lightBg },
      1: { cellWidth: 52 },
    },
  });

  y = Math.max(diagramBottom, getTableY(doc, y)) + 10;

  doc.setFont(QUOTATION_PDF_FONT, "bold");
  doc.setFontSize(10);
  doc.setTextColor(...QUOTATION_PDF_COLORS.maroon);
  doc.text("Key Features", MARGIN, y);
  y += 5;

  doc.setFont(QUOTATION_PDF_FONT, "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...QUOTATION_PDF_COLORS.black);
  for (const feature of keyFeatures(result.productType)) {
    doc.text(`• ${feature}`, MARGIN + 2, y);
    y += 4.5;
  }

  doc.setFontSize(7.5);
  doc.setTextColor(...QUOTATION_PDF_COLORS.footer);
  doc.text(
    `Profit margin applied: +${input.profitMarginPercent}% (Quick Quote)`,
    MARGIN,
    PAGE_HEIGHT - 14,
  );
}

export function buildSimpleQuoteSpecSheetPdf(
  input: SimpleQuoteSpecSheetInput,
  previews: Map<string, PdfPreviewRenderResult> = new Map(),
): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const rowById = new Map(input.rows.map((row) => [row.id, row]));
  const validResults = input.totals.rows.filter((row) => row.isValid);

  validResults.forEach((result, index) => {
    const sourceRow = rowById.get(result.rowId);
    if (!sourceRow) return;
    drawSpecPage(doc, index, sourceRow, result, input, previews.get(result.rowId) ?? null);
  });

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFont(QUOTATION_PDF_FONT, "normal");
    doc.setFontSize(8);
    doc.setTextColor(...QUOTATION_PDF_COLORS.footer);
    doc.text(COMPANY_PDF_FOOTER, PAGE_WIDTH / 2, PAGE_HEIGHT - 8, { align: "center" });
    doc.text(`Page ${page} of ${pageCount}`, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 8, {
      align: "right",
    });
  }

  drawBrandFooter(doc);
  return doc;
}

export async function buildSimpleQuoteSpecSheetPdfAsync(
  input: SimpleQuoteSpecSheetInput,
): Promise<jsPDF> {
  const { renderProductPreviewsForPdf } = await import("@/lib/preview/render-preview-image");
  const rowById = new Map(input.rows.map((row) => [row.id, row]));
  const validResults = input.totals.rows.filter((row) => row.isValid);

  const previewItems = validResults
    .map((result) => {
      const sourceRow = rowById.get(result.rowId);
      if (!sourceRow) return null;
      const data = resolvePreviewData(sourceRow, input);
      if (!data) return null;
      return {
        key: result.rowId,
        data,
        options: { pixelWidth: 560, mode: "pdf" as const },
      };
    })
    .filter((item): item is NonNullable<typeof item> => item != null);

  const previews = await renderProductPreviewsForPdf(previewItems);
  return buildSimpleQuoteSpecSheetPdf(input, previews);
}

export async function exportSimpleQuoteSpecSheetPdf(
  input: SimpleQuoteSpecSheetInput,
): Promise<void> {
  const { savePdfDocument } = await import("@/lib/pdf/save");
  const doc = await buildSimpleQuoteSpecSheetPdfAsync(input);
  const filename = `spec-sheet-${input.jobId}.pdf`;
  await savePdfDocument(doc, filename);
}
