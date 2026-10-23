import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import {
  COMPANY_PDF_FOOTER,
} from "@/lib/brand";
import { getDefaultCompanySettings, loadCompanySettings, resolveCompanyForPdf } from "@/lib/company-settings";
import { savePdfDocument } from "@/lib/pdf/save";
import { pdfCreatorName } from "@/lib/pdf/theme";
import { resolveQuotationPreviewData } from "@/components/product-preview/preview-mapper";
import type { PdfPreviewRenderResult } from "@/lib/preview/pdf-embed";
import { embedPreviewInPdf } from "@/lib/preview/pdf-embed";

import type { CalculatedWindowRow, PdfPageMode, QuotationResult } from "./types";
import {
  GST_PERCENT,
  getGstTermsLine,
  shouldApplyGstInTotal,
} from "./defaults";
import { formatWorkDescription } from "./format-work-description";
import { computeQuotationAreaSummary } from "./calculate";
import { drawQuotationReferencePhotosPage } from "./reference-photos-page";
import {
  resolveQuotationReferencePhotoItems,
  resolveUploadedReferencePhotoItems,
} from "./reference-photos";
import { rupeesToWords } from "./number-to-words";
import { QUOTATION_STANDARD_TERMS } from "./terms";
import {
  QUOTATION_PDF_COLORS,
  QUOTATION_PDF_FONT,
  QUOTATION_PDF_FONT_SIZES,
  QUOTATION_PDF_MARGINS,
} from "./pdf-theme";

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN_LEFT = QUOTATION_PDF_MARGINS.left;
const MARGIN_RIGHT = QUOTATION_PDF_MARGINS.right;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
const FOOTER_RESERVE = 14;

const INTRO_TEXT =
  "With reference to your requirement, we are pleased to submit our quotation for upvc windows. The rates and terms are mentioned below for your kind consideration.";

const TERMS = QUOTATION_STANDARD_TERMS;

type TableRow = [string, string, string, string, string];

type PdfLayoutConfig = {
  bodyFont: number;
  headFont: number;
  totalFont: number;
  amountWordsFont: number;
  termsFont: number;
  cellPadding: number;
  lineGap: number;
  sectionGap: number;
  signatureGap: number;
  companyFont: number;
  taglineFont: number;
  addressFont: number;
  headerHeight: number;
  compactHeader: boolean;
};

function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function getFinalY(doc: jsPDF, fallback: number): number {
  return (
    (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? fallback
  );
}

function getPostTableY(doc: jsPDF, fallback: number, gapMm: number): number {
  return getFinalY(doc, fallback) + gapMm;
}

function countTableRows(result: QuotationResult): number {
  let count = result.form.windows.length;
  if (result.totals.transportationCharge > 0) count += 1;
  if (shouldApplyGstInTotal(result.form.gstMode) && result.totals.gstAmount > 0) {
    count += 1;
  }
  count += 1; // TOTAL row
  return count;
}

function getDualPageLayout(rowCount: number): PdfLayoutConfig {
  if (rowCount > 14) {
    return {
      bodyFont: 10.5,
      headFont: 10.5,
      totalFont: 11,
      amountWordsFont: 10,
      termsFont: 10,
      cellPadding: 1.8,
      lineGap: 4.2,
      sectionGap: 2,
      signatureGap: 22,
      companyFont: 24,
      taglineFont: 13,
      addressFont: 10.5,
      headerHeight: 46,
      compactHeader: false,
    };
  }

  return {
    bodyFont: QUOTATION_PDF_FONT_SIZES.body,
    headFont: QUOTATION_PDF_FONT_SIZES.body,
    totalFont: QUOTATION_PDF_FONT_SIZES.total,
    amountWordsFont: QUOTATION_PDF_FONT_SIZES.amountWords,
    termsFont: QUOTATION_PDF_FONT_SIZES.termsBody,
    cellPadding: 2.2,
    lineGap: 4.8,
    sectionGap: 2.5,
    signatureGap: 24,
    companyFont: QUOTATION_PDF_FONT_SIZES.companyName,
    taglineFont: QUOTATION_PDF_FONT_SIZES.tagline,
    addressFont: QUOTATION_PDF_FONT_SIZES.address,
    headerHeight: 48,
    compactHeader: false,
  };
}

function getSinglePageLayouts(rowCount: number, hasLongAddress: boolean): PdfLayoutConfig[] {
  const baseTightness = rowCount + (hasLongAddress ? 2 : 0);
  const presets: PdfLayoutConfig[] = [
    {
      bodyFont: 11.5,
      headFont: 11.5,
      totalFont: 12,
      amountWordsFont: 10.5,
      termsFont: 10,
      cellPadding: 2,
      lineGap: 4.2,
      sectionGap: 1.5,
      signatureGap: 16,
      companyFont: 24,
      taglineFont: 13,
      addressFont: 10.5,
      headerHeight: 44,
      compactHeader: true,
    },
    {
      bodyFont: 10.5,
      headFont: 10.5,
      totalFont: 11,
      amountWordsFont: 9.5,
      termsFont: 9,
      cellPadding: 1.6,
      lineGap: 3.8,
      sectionGap: 1.2,
      signatureGap: 14,
      companyFont: 22,
      taglineFont: 12,
      addressFont: 10,
      headerHeight: 40,
      compactHeader: true,
    },
    {
      bodyFont: 9.5,
      headFont: 9.5,
      totalFont: 10,
      amountWordsFont: 8.5,
      termsFont: 8.5,
      cellPadding: 1.3,
      lineGap: 3.4,
      sectionGap: 1,
      signatureGap: 12,
      companyFont: 20,
      taglineFont: 11,
      addressFont: 9,
      headerHeight: 36,
      compactHeader: true,
    },
    {
      bodyFont: 8.5,
      headFont: 8.5,
      totalFont: 9,
      amountWordsFont: 8,
      termsFont: 8,
      cellPadding: 1.1,
      lineGap: 3,
      sectionGap: 0.8,
      signatureGap: 10,
      companyFont: 18,
      taglineFont: 10,
      addressFont: 8.5,
      headerHeight: 34,
      compactHeader: true,
    },
    {
      bodyFont: 8,
      headFont: 8,
      totalFont: 8.5,
      amountWordsFont: 7.5,
      termsFont: 7.5,
      cellPadding: 0.9,
      lineGap: 2.6,
      sectionGap: 0.6,
      signatureGap: 8,
      companyFont: 16,
      taglineFont: 9,
      addressFont: 8,
      headerHeight: 32,
      compactHeader: true,
    },
  ];

  if (baseTightness <= 6) return presets.slice(0, 2);
  if (baseTightness <= 10) return presets.slice(1, 4);
  return presets.slice(2);
}

function setTextColor(doc: jsPDF, color: [number, number, number]) {
  doc.setTextColor(color[0], color[1], color[2]);
}

function drawPageBackground(doc: jsPDF) {
  doc.setFillColor(...QUOTATION_PDF_COLORS.background);
  doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, "F");
}

function drawMaroonRule(doc: jsPDF, y: number) {
  doc.setDrawColor(...QUOTATION_PDF_COLORS.maroon);
  doc.setLineWidth(0.3);
  doc.line(MARGIN_LEFT, y, PAGE_WIDTH - MARGIN_RIGHT, y);
}

function drawHeaderPanel(doc: jsPDF, top: number, height: number) {
  doc.setFillColor(...QUOTATION_PDF_COLORS.white);
  doc.rect(0, top, PAGE_WIDTH, height, "F");
}

function formatQuotationDate(isoDate: string): string {
  if (!isoDate) {
    const now = new Date();
    return `${now.getDate()}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;
  }
  const parsed = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    const now = new Date();
    return `${now.getDate()}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;
  }
  return `${parsed.getDate()}/${String(parsed.getMonth() + 1).padStart(2, "0")}/${parsed.getFullYear()}`;
}

/** Company PDF style: Rs. 23,040/- */
export function formatPdfRs(value: number): string {
  const rounded = Math.round(value);
  const formatted = new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(rounded);
  return `Rs. ${formatted}/-`;
}

function formatDimension(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, "");
}

function getPdfCompanyContext() {
  const settings =
    typeof window === "undefined" ? getDefaultCompanySettings() : loadCompanySettings();
  return resolveCompanyForPdf(settings);
}

function drawCompanyLetterhead(
  doc: jsPDF,
  dateText: string,
  layout: PdfLayoutConfig,
  company = getPdfCompanyContext(),
): number {
  const centerX = PAGE_WIDTH / 2;
  const headerTop = layout.compactHeader ? 8 : 10;
  drawHeaderPanel(doc, headerTop, layout.headerHeight);

  let y = headerTop + (layout.compactHeader ? 6 : 8);

  setTextColor(doc, QUOTATION_PDF_COLORS.maroon);
  doc.setFont(QUOTATION_PDF_FONT, "bold");
  doc.setFontSize(layout.companyFont);
  doc.text(company.name, centerX, y, { align: "center" });
  y += layout.compactHeader ? 6 : 7;

  doc.setFont(QUOTATION_PDF_FONT, "bold");
  doc.setFontSize(layout.taglineFont);
  doc.text(company.businessLine, centerX, y, { align: "center" });
  y += layout.compactHeader ? 4 : 5;
  drawMaroonRule(doc, y);
  y += layout.compactHeader ? 4 : 5;

  setTextColor(doc, QUOTATION_PDF_COLORS.black);
  doc.setFont(QUOTATION_PDF_FONT, "normal");
  doc.setFontSize(layout.addressFont);
  doc.text(company.address, centerX, y, { align: "center" });
  y += layout.compactHeader ? 4 : 4.5;

  doc.text(
    `Ph. No. ${company.phones}  Email: ${company.email}`,
    centerX,
    y,
    { align: "center" },
  );
  y += layout.compactHeader ? 4 : 4.5;
  doc.text(`Website: ${company.website}`, centerX, y, { align: "center" });
  y += layout.compactHeader ? 4 : 4.5;
  drawMaroonRule(doc, y);
  y += layout.compactHeader ? 5 : 7;

  doc.setFontSize(layout.bodyFont);
  doc.text(`Date: ${dateText}`, PAGE_WIDTH - MARGIN_RIGHT, y, { align: "right" });

  return y + (layout.compactHeader ? 3 : 5);
}

function buildTableRows(result: QuotationResult): TableRow[] {
  const { form, groups, totals } = result;
  const rows: TableRow[] = [];
  let serial = 1;

  for (const group of groups) {
    for (const row of group.rows) {
      const totalArea = Math.round(row.areaSqFt * row.quantity);
      rows.push([
        String(serial),
        formatWorkDescription(row),
        String(totalArea),
        formatPdfRs(row.ratePerSqFt),
        formatPdfRs(row.amount),
      ]);
      serial += 1;
    }
  }

  if (totals.transportationCharge > 0) {
    rows.push([
      String(serial),
      "Transportation charges",
      "1",
      formatPdfRs(totals.transportationCharge),
      formatPdfRs(totals.transportationCharge),
    ]);
    serial += 1;
  }

  if (shouldApplyGstInTotal(form.gstMode) && totals.gstAmount > 0) {
    rows.push([
      String(serial),
      `GST ${GST_PERCENT} %`,
      "1",
      formatPdfRs(totals.gstAmount),
      formatPdfRs(totals.gstAmount),
    ]);
  }

  rows.push(["", "TOTAL", "", "", formatPdfRs(totals.grandTotal)]);

  return rows;
}

function drawAreaRateSummary(
  doc: jsPDF,
  result: QuotationResult,
  startY: number,
  layout: PdfLayoutConfig,
): number {
  const summary = computeQuotationAreaSummary(result);
  if (summary.totalSqFt <= 0) return startY;

  const sqFtLabel = `${summary.totalSqFt.toFixed(2)} Sq.Ft.`;
  const rateLabel = formatPdfRs(summary.averageRatePerSqFt);
  const amountLabel = formatPdfRs(summary.windowsSubtotal);
  const calculationLabel = `${sqFtLabel} × ${rateLabel} = ${amountLabel}`;

  autoTable(doc, {
    startY: startY + 2,
    body: [
      ["Total Sq.Ft.", sqFtLabel],
      ["Average Rate / Sq.Ft.", rateLabel],
      ["Windows Subtotal", calculationLabel],
    ],
    theme: "grid",
    margin: { left: MARGIN_LEFT + 28, right: MARGIN_RIGHT + 28 },
    styles: {
      font: QUOTATION_PDF_FONT,
      fontSize: layout.bodyFont,
      cellPadding: layout.cellPadding,
      lineColor: QUOTATION_PDF_COLORS.border,
      textColor: QUOTATION_PDF_COLORS.black,
    },
    columnStyles: {
      0: { cellWidth: 52, fontStyle: "bold", fillColor: QUOTATION_PDF_COLORS.background },
      1: { halign: "right" },
    },
    didParseCell(data) {
      if (data.row.index === 2) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.textColor = QUOTATION_PDF_COLORS.maroon;
      }
    },
  });

  return getPostTableY(doc, startY, layout.sectionGap);
}

function drawPageFooter(doc: jsPDF, pageNumber: number, pageCount: number) {
  const company = getPdfCompanyContext();
  const footer = company.footerText || COMPANY_PDF_FOOTER;
  setTextColor(doc, QUOTATION_PDF_COLORS.footer);
  doc.setFont(QUOTATION_PDF_FONT, "normal");
  doc.setFontSize(QUOTATION_PDF_FONT_SIZES.footer);
  doc.text(footer, PAGE_WIDTH / 2, PAGE_HEIGHT - 10, { align: "center" });
  doc.setFontSize(8);
  doc.text(`-- ${pageNumber} of ${pageCount} --`, PAGE_WIDTH / 2, PAGE_HEIGHT - 5, {
    align: "center",
  });
}

function drawQuotationProductPreviews(
  doc: jsPDF,
  result: QuotationResult,
  previews: Map<string, PdfPreviewRenderResult>,
  startY: number,
): number {
  const rows = result.groups.flatMap((group) => group.rows);
  if (rows.length === 0 || previews.size === 0) return startY;

  let y = startY + 2;
  const singleProduct = rows.length === 1;
  const row = rows[0]!;

  if (singleProduct) {
    const preview = previews.get(row.id);
    const boxW = 78;
    const boxH = 56;
    const x = (PAGE_WIDTH - boxW) / 2;
    y = embedPreviewInPdf(doc, preview ?? null, x, y, boxW, boxH) + 4;
    return y;
  }

  const cols = 2;
  const gap = 6;
  const cellW = (CONTENT_WIDTH - gap) / cols;
  const boxW = cellW - 4;
  const boxH = 34;
  let col = 0;
  let rowY = y;

  for (const item of rows) {
    const preview = previews.get(item.id);
    const x = MARGIN_LEFT + col * (cellW + gap);
    const bottom = embedPreviewInPdf(doc, preview ?? null, x, rowY, boxW, boxH, {
      drawCaption: true,
    });
    doc.setFont(QUOTATION_PDF_FONT, "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...QUOTATION_PDF_COLORS.black);
    const label = `${formatDimension(item.length)} × ${formatDimension(item.height)} (${item.quantity} no.)`;
    doc.text(label, x + boxW / 2, bottom + 1, { align: "center", maxWidth: boxW + 2 });

    col += 1;
    if (col >= cols) {
      col = 0;
      rowY = bottom + 8;
    }
  }

  return col === 0 ? rowY : rowY + boxH + 12;
}

function renderQuotationPdf(
  result: QuotationResult,
  layout: PdfLayoutConfig,
  pageMode: PdfPageMode,
  previews: Map<string, PdfPreviewRenderResult> = new Map(),
): jsPDF {
  const { form, totals } = result;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const dateText = formatQuotationDate(form.quotationDate);
  const singlePage = pageMode === "single";
  const tableBody = buildTableRows(result);

  doc.setProperties({
    title: `${form.customerName || "Quotation"} - ${getPdfCompanyContext().name}`,
    creator: pdfCreatorName(),
  });

  drawPageBackground(doc);

  let y = drawCompanyLetterhead(doc, dateText, layout);

  setTextColor(doc, QUOTATION_PDF_COLORS.black);
  doc.setFont(QUOTATION_PDF_FONT, "bold");
  doc.setFontSize(layout.bodyFont);
  doc.text("To,", MARGIN_LEFT, y);
  y += layout.lineGap;

  doc.setFont(QUOTATION_PDF_FONT, "normal");
  if (form.customerName) {
    doc.text(form.customerName, MARGIN_LEFT, y);
    y += layout.lineGap;
  }

  if (form.customerAddress) {
    const addressLines = doc.splitTextToSize(
      form.customerAddress,
      CONTENT_WIDTH * (singlePage ? 0.65 : 0.75),
    );
    doc.text(addressLines, MARGIN_LEFT, y);
    y += layout.lineGap * addressLines.length;
  }

  y += layout.sectionGap;
  setTextColor(doc, QUOTATION_PDF_COLORS.maroon);
  doc.setFont(QUOTATION_PDF_FONT, "bold");
  doc.setFontSize(QUOTATION_PDF_FONT_SIZES.subject);
  doc.text(`Subject: ${form.subject}`, PAGE_WIDTH / 2, y, { align: "center" });
  y += layout.lineGap + layout.sectionGap;

  setTextColor(doc, QUOTATION_PDF_COLORS.black);
  doc.setFont(QUOTATION_PDF_FONT, "normal");
  doc.setFontSize(layout.bodyFont);
  doc.text("Dear Sir/Madam,", MARGIN_LEFT, y);
  y += layout.lineGap;

  const introLines = doc.splitTextToSize(INTRO_TEXT, CONTENT_WIDTH);
  doc.text(introLines, MARGIN_LEFT, y);
  y += layout.lineGap * introLines.length + layout.sectionGap;

  y = drawQuotationProductPreviews(doc, result, previews, y);
  y += layout.sectionGap;

  autoTable(doc, {
    startY: y,
    head: [["Sr. No.", "Description of Work", "Qty/Area", "Rate", "Amount"]],
    body: tableBody,
    theme: "grid",
    showHead: singlePage ? "firstPage" : "everyPage",
    rowPageBreak: singlePage ? "avoid" : "auto",
    styles: {
      font: QUOTATION_PDF_FONT,
      fontSize: layout.bodyFont,
      cellPadding: layout.cellPadding,
      lineColor: QUOTATION_PDF_COLORS.border,
      lineWidth: 0.15,
      textColor: QUOTATION_PDF_COLORS.black,
      fillColor: QUOTATION_PDF_COLORS.white,
      valign: "middle",
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: QUOTATION_PDF_COLORS.maroon,
      textColor: QUOTATION_PDF_COLORS.white,
      fontStyle: "bold",
      fontSize: layout.headFont,
      halign: "center",
    },
    columnStyles: {
      0: { cellWidth: singlePage ? 14 : 16, halign: "center" },
      1: { cellWidth: singlePage ? 76 : 78 },
      2: { cellWidth: singlePage ? 20 : 22, halign: "center" },
      3: { cellWidth: singlePage ? 28 : 30, halign: "right" },
      4: { cellWidth: singlePage ? 30 : 32, halign: "right" },
    },
    margin: {
      left: MARGIN_LEFT,
      right: MARGIN_RIGHT,
      top: y,
      bottom: FOOTER_RESERVE,
    },
    pageBreak: singlePage ? "avoid" : "auto",
    didParseCell(data) {
      const isTotalRow = data.row.index === tableBody.length - 1;
      if (!isTotalRow) return;

      data.cell.styles.fontStyle = "bold";
      data.cell.styles.fontSize = layout.totalFont;
      if (data.column.index === 1) {
        data.cell.styles.halign = "center";
      }
    },
  });

  y = drawAreaRateSummary(doc, result, getPostTableY(doc, y, layout.sectionGap), layout);

  const amountWordsGap = Math.max(6, layout.amountWordsFont * 0.45 + 4);
  y = getPostTableY(doc, y, amountWordsGap);

  setTextColor(doc, QUOTATION_PDF_COLORS.black);
  doc.setFont(QUOTATION_PDF_FONT, "italic");
  doc.setFontSize(layout.amountWordsFont);
  const amountWords = `Rupees ${rupeesToWords(totals.grandTotal)} Only`;
  const amountLines = doc.splitTextToSize(amountWords, CONTENT_WIDTH);
  doc.text(amountLines, MARGIN_LEFT, y);
  y += layout.lineGap * amountLines.length + Math.max(5, layout.sectionGap + 3);

  setTextColor(doc, QUOTATION_PDF_COLORS.maroon);
  doc.setFont(QUOTATION_PDF_FONT, "bold");
  doc.setFontSize(layout.bodyFont);
  doc.text("Terms and Conditions", MARGIN_LEFT, y);
  y += layout.lineGap;

  setTextColor(doc, QUOTATION_PDF_COLORS.black);
  doc.setFont(QUOTATION_PDF_FONT, "normal");
  doc.setFontSize(layout.termsFont);
  const terms = [...TERMS];
  const gstTermsLine = getGstTermsLine(form.gstMode);
  if (gstTermsLine) terms.push(gstTermsLine);

  for (const [index, term] of terms.entries()) {
    const termLines = doc.splitTextToSize(`${index + 1}. ${term}`, CONTENT_WIDTH - 6);
    doc.text(termLines, MARGIN_LEFT + 3, y);
    y += (layout.lineGap - 0.8) * termLines.length;
  }

  y += singlePage ? 6 : 10;
  const signatureY = singlePage
    ? Math.min(y, PAGE_HEIGHT - 30)
    : Math.min(y, PAGE_HEIGHT - 36);

  setTextColor(doc, QUOTATION_PDF_COLORS.black);
  doc.setFont(QUOTATION_PDF_FONT, "normal");
  doc.setFontSize(layout.bodyFont);
  doc.text("Thanking you,", MARGIN_LEFT, signatureY);

  setTextColor(doc, QUOTATION_PDF_COLORS.signature);
  doc.setFont(QUOTATION_PDF_FONT, "bold");
  doc.text("For Shivshakti Enterprises", PAGE_WIDTH - MARGIN_RIGHT, signatureY, {
    align: "right",
  });
  doc.text(
    "Authorized Signatory",
    PAGE_WIDTH - MARGIN_RIGHT,
    signatureY + layout.signatureGap,
    { align: "right" },
  );

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    drawPageFooter(doc, page, pageCount);
  }

  setTextColor(doc, QUOTATION_PDF_COLORS.black);
  return doc;
}

function redrawAllPageFooters(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    drawPageFooter(doc, page, pageCount);
  }
}

function appendReferencePhotosToQuotationPdf(
  doc: jsPDF,
  items: ReturnType<typeof resolveUploadedReferencePhotoItems>,
) {
  if (items.length === 0) return;
  drawQuotationReferencePhotosPage(doc, items, drawPageBackground);
  redrawAllPageFooters(doc);
}

async function appendReferencePhotosToQuotationPdfAsync(
  doc: jsPDF,
  result: QuotationResult,
) {
  const settings =
    typeof window === "undefined" ? getDefaultCompanySettings() : loadCompanySettings();
  const items = await resolveQuotationReferencePhotoItems(result, settings);
  appendReferencePhotosToQuotationPdf(doc, items);
}

export function buildQuotationFilename(result: QuotationResult): string {
  const customer = slugify(result.form.customerName) || "quotation";
  const date = result.form.quotationDate || new Date().toISOString().slice(0, 10);
  return `${customer}-quotation-${date}.pdf`;
}

const PREVIEW_EMBED_MAX_ROWS = 6;
const SINGLE_PAGE_MAX_ROWS = 12;

function resolvePdfPageMode(result: QuotationResult): PdfPageMode {
  const rowCount = countTableRows(result);
  if (result.form.pdfPageMode === "single" && rowCount > SINGLE_PAGE_MAX_ROWS) {
    return "dual";
  }
  return result.form.pdfPageMode;
}

function resolvePreviewMap(
  result: QuotationResult,
  previews: Map<string, PdfPreviewRenderResult>,
): Map<string, PdfPreviewRenderResult> {
  const rows = result.groups.flatMap((group) => group.rows);
  if (rows.length > PREVIEW_EMBED_MAX_ROWS) {
    return new Map();
  }
  return previews;
}

export function buildQuotationPdf(
  result: QuotationResult,
  previews: Map<string, PdfPreviewRenderResult> = new Map(),
): jsPDF {
  const rowCount = countTableRows(result);
  const hasLongAddress = result.form.customerAddress.trim().length > 48;
  const pageMode = resolvePdfPageMode(result);
  const effectivePreviews = resolvePreviewMap(result, previews);

  if (pageMode === "dual") {
    return renderQuotationPdf(result, getDualPageLayout(rowCount), pageMode, effectivePreviews);
  }

  const layouts = getSinglePageLayouts(rowCount, hasLongAddress);
  let bestDoc = renderQuotationPdf(result, layouts[0]!, pageMode, effectivePreviews);

  for (const layout of layouts.slice(1)) {
    if (bestDoc.getNumberOfPages() === 1) break;
    bestDoc = renderQuotationPdf(result, layout, pageMode, effectivePreviews);
  }

  return bestDoc;
}

export async function buildQuotationPdfAsync(result: QuotationResult): Promise<jsPDF> {
  const { generateQuotationPdf, quotationResultToGeneratorInput } = await import(
    "./generator"
  );
  return generateQuotationPdf(quotationResultToGeneratorInput(result));
}

export async function exportQuotationPdf(result: QuotationResult): Promise<void> {
  const filename = buildQuotationFilename(result);
  try {
    const doc = await buildQuotationPdfAsync(result);
    await savePdfDocument(doc, filename);
  } catch {
    const doc = buildQuotationPdf(result, new Map());
    appendReferencePhotosToQuotationPdf(
      doc,
      resolveUploadedReferencePhotoItems(
        result,
        typeof window === "undefined" ? getDefaultCompanySettings() : loadCompanySettings(),
      ),
    );
    await savePdfDocument(doc, filename);
  }
}
