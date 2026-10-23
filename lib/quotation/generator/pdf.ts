import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import {
  COMPANY_ADDRESS,
  COMPANY_BUSINESS_LINE,
  COMPANY_EMAIL,
  COMPANY_NAME,
  COMPANY_PDF_FOOTER,
  COMPANY_PHONES,
  COMPANY_WEBSITE,
} from "@/lib/brand";
import { savePdfDocument } from "@/lib/pdf/save";
import { pdfCreatorName } from "@/lib/pdf/theme";
import { rupeesToWords } from "@/lib/quotation/number-to-words";
import { QUOTATION_STANDARD_TERMS } from "@/lib/quotation/terms";
import {
  QUOTATION_PDF_COLORS,
  QUOTATION_PDF_FONT,
  QUOTATION_PDF_FONT_SIZES,
  QUOTATION_PDF_MARGINS,
} from "@/lib/quotation/pdf-theme";
import { fitPreviewDimensions } from "@/lib/preview/pdf-embed";

import { calculateQuotationSummary } from "./calculate";
import { resolveReferenceImagesForQuotation } from "./reference-images";
import type { QuotationCompanyInfo, QuotationGeneratorInput, ResolvedReferenceImage } from "./types";

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN_LEFT = QUOTATION_PDF_MARGINS.left;
const MARGIN_RIGHT = QUOTATION_PDF_MARGINS.right;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
/** Reserved strip at page bottom for footer text (mm). */
const FOOTER_ZONE_HEIGHT = 18;
const FOOTER_RESERVE = FOOTER_ZONE_HEIGHT;
const CONTENT_BOTTOM_Y = PAGE_HEIGHT - FOOTER_ZONE_HEIGHT;
const SIGNATURE_BLOCK_HEIGHT = 26;

const DEFAULT_INTRO =
  "With reference to your requirement, we are pleased to submit our quotation for upvc windows. The rates and terms are mentioned below for your kind consideration.";

const DEFAULT_SUBJECT = "Quotation for Aluminium / uPVC Windows and Doors";

type TableRow = [string, string, string, string, string];

function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function formatPdfRs(value: number): string {
  const rounded = Math.round(value);
  const formatted = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(rounded);
  return `Rs. ${formatted}/-`;
}

function formatQuotationDate(isoDate?: string): string {
  if (!isoDate) {
    const now = new Date();
    return `${now.getDate()}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;
  }
  const parsed = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return `${parsed.getDate()}/${String(parsed.getMonth() + 1).padStart(2, "0")}/${parsed.getFullYear()}`;
}

function resolveCompany(input: QuotationGeneratorInput): QuotationCompanyInfo {
  return {
    name: input.company?.name ?? COMPANY_NAME,
    businessLine: input.company?.businessLine ?? COMPANY_BUSINESS_LINE,
    address: input.company?.address ?? COMPANY_ADDRESS,
    phones: input.company?.phones ?? COMPANY_PHONES,
    email: input.company?.email ?? COMPANY_EMAIL,
    website: input.company?.website ?? COMPANY_WEBSITE,
    footerText: input.company?.footerText ?? COMPANY_PDF_FOOTER,
  };
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

function drawCompanyLetterhead(
  doc: jsPDF,
  company: QuotationCompanyInfo,
  dateText: string,
): number {
  const centerX = PAGE_WIDTH / 2;
  const headerTop = 10;
  const headerHeight = 52;

  doc.setFillColor(...QUOTATION_PDF_COLORS.white);
  doc.rect(0, headerTop, PAGE_WIDTH, headerHeight, "F");

  let y = headerTop + 8;
  setTextColor(doc, QUOTATION_PDF_COLORS.maroon);
  doc.setFont(QUOTATION_PDF_FONT, "bold");
  doc.setFontSize(QUOTATION_PDF_FONT_SIZES.companyName);
  doc.text(company.name, centerX, y, { align: "center" });
  y += 7;

  doc.setFontSize(QUOTATION_PDF_FONT_SIZES.tagline);
  doc.text(company.businessLine, centerX, y, { align: "center" });
  y += 5;
  drawMaroonRule(doc, y);
  y += 5;

  setTextColor(doc, QUOTATION_PDF_COLORS.black);
  doc.setFont(QUOTATION_PDF_FONT, "normal");
  doc.setFontSize(QUOTATION_PDF_FONT_SIZES.address);
  doc.text(company.address, centerX, y, { align: "center" });
  y += 4.5;
  doc.text(`Ph. No. ${company.phones}  Email: ${company.email}`, centerX, y, { align: "center" });
  y += 4.5;
  doc.text(`Website: ${company.website.replace(/^https?:\/\//, "")}`, centerX, y, {
    align: "center",
  });
  y += 4.5;
  drawMaroonRule(doc, y);
  y += 7;

  doc.setFontSize(QUOTATION_PDF_FONT_SIZES.body);
  doc.text(`Date: ${dateText}`, PAGE_WIDTH - MARGIN_RIGHT, y, { align: "right" });
  return y + 5;
}

function buildTableRows(input: QuotationGeneratorInput): TableRow[] {
  const summary = calculateQuotationSummary(input);
  const rows: TableRow[] = summary.items.map((item, index) => {
    const qtyArea =
      item.pricingMode === "piece"
        ? String(Math.max(1, item.quantity))
        : String(Math.round(item.areaSqFt * Math.max(1, item.quantity)));

    const rateLabel =
      item.pricingMode === "piece"
        ? `${formatPdfRs(item.rate)}/pc`
        : formatPdfRs(item.rate);

    return [
      String(index + 1),
      item.description,
      qtyArea,
      rateLabel,
      formatPdfRs(item.amount),
    ];
  });

  let serial = rows.length + 1;

  if (summary.transportationCharge > 0) {
    rows.push([
      String(serial),
      "Transportation charges",
      "1",
      formatPdfRs(summary.transportationCharge),
      formatPdfRs(summary.transportationCharge),
    ]);
    serial += 1;
  }

  for (const charge of input.extraCharges ?? []) {
    if (charge.amount <= 0) continue;
    rows.push([
      String(serial),
      charge.label,
      "1",
      formatPdfRs(charge.amount),
      formatPdfRs(charge.amount),
    ]);
    serial += 1;
  }

  if (input.gst?.enabled && summary.gstAmount > 0) {
    const gstLabel = input.gst.label ?? `GST ${input.gst.percent ?? 0} %`;
    rows.push([
      String(serial),
      gstLabel,
      "1",
      formatPdfRs(summary.gstAmount),
      formatPdfRs(summary.gstAmount),
    ]);
  }

  rows.push(["", "TOTAL", "", "", formatPdfRs(summary.grandTotal)]);
  return rows;
}

function getFinalY(doc: jsPDF, fallback: number): number {
  return (
    (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? fallback
  );
}

function drawAreaRateSummary(
  doc: jsPDF,
  input: QuotationGeneratorInput,
  startY: number,
): number {
  const summary = calculateQuotationSummary(input);
  if (summary.totalAreaSqFt <= 0) return startY;

  const sqFtLabel = `${summary.totalAreaSqFt.toFixed(2)} Sq.Ft.`;
  const rateLabel = formatPdfRs(summary.averageRatePerSqFt);
  const amountLabel = formatPdfRs(summary.itemsSubtotal);
  const calculationLabel = `${sqFtLabel} × ${rateLabel} = ${amountLabel}`;

  autoTable(doc, {
    startY: startY + 2,
    body: [
      ["Total Sq.Ft.", sqFtLabel],
      ["Average Rate / Sq.Ft.", rateLabel],
      ["Items Subtotal", calculationLabel],
    ],
    theme: "grid",
    margin: { left: MARGIN_LEFT + 28, right: MARGIN_RIGHT + 28 },
    styles: {
      font: QUOTATION_PDF_FONT,
      fontSize: QUOTATION_PDF_FONT_SIZES.body,
      cellPadding: 2,
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

  return getFinalY(doc, startY) + 2;
}

function detectImageFormat(dataUrl: string): "PNG" | "JPEG" | "WEBP" {
  if (/^data:image\/jpe?g/i.test(dataUrl)) return "JPEG";
  if (/^data:image\/webp/i.test(dataUrl)) return "WEBP";
  return "PNG";
}

function drawReferenceImagesSectionTitle(doc: jsPDF, startY: number): number {
  let y = startY;
  doc.setFont(QUOTATION_PDF_FONT, "bold");
  doc.setFontSize(14);
  setTextColor(doc, QUOTATION_PDF_COLORS.maroon);
  doc.text("Reference Images", PAGE_WIDTH / 2, y, { align: "center" });
  y += 7;

  doc.setFont(QUOTATION_PDF_FONT, "normal");
  doc.setFontSize(10);
  setTextColor(doc, QUOTATION_PDF_COLORS.black);
  doc.text("Window types included in this quotation", PAGE_WIDTH / 2, y, { align: "center" });
  return y + 10;
}

function startReferenceImagesPage(
  doc: jsPDF,
  company: QuotationCompanyInfo,
  dateText: string,
): number {
  doc.addPage();
  drawPageBackground(doc);
  const afterHeader = drawCompanyLetterhead(doc, company, dateText);
  return drawReferenceImagesSectionTitle(doc, afterHeader + 4);
}

function drawReferenceImagesPage(
  doc: jsPDF,
  images: ResolvedReferenceImage[],
  company: QuotationCompanyInfo,
  dateText: string,
): void {
  if (images.length === 0) return;

  let rowY = startReferenceImagesPage(doc, company, dateText);

  const cols = images.length === 1 ? 1 : 2;
  const gap = 8;
  const cellW = cols === 1 ? Math.min(120, CONTENT_WIDTH) : (CONTENT_WIDTH - gap) / cols;
  const startX = cols === 1 ? (PAGE_WIDTH - cellW) / 2 : MARGIN_LEFT;
  const imageH = images.length <= 2 ? 78 : images.length <= 4 ? 58 : 46;
  const rowLabelReserve = 14;

  let col = 0;

  for (const image of images) {
    const { width, height } = fitPreviewDimensions(image.aspectRatio, cellW - 4, imageH);
    const labelLines = doc.splitTextToSize(image.label, cellW);
    const rowHeight = height + 4 + labelLines.length * 3.6 + rowLabelReserve;

    if (rowY + rowHeight > CONTENT_BOTTOM_Y) {
      rowY = startReferenceImagesPage(doc, company, dateText);
      col = 0;
    }

    const xPos = startX + col * (cellW + gap);
    const imageX = xPos + (cellW - width) / 2;

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.roundedRect(imageX - 0.5, rowY - 0.5, width + 1, height + 1, 1.5, 1.5, "S");

    doc.addImage(
      image.dataUrl,
      detectImageFormat(image.dataUrl),
      imageX,
      rowY,
      width,
      height,
      undefined,
      "FAST",
    );

    doc.setFont(QUOTATION_PDF_FONT, "bold");
    doc.setFontSize(9);
    setTextColor(doc, QUOTATION_PDF_COLORS.maroon);
    doc.text(labelLines, xPos + cellW / 2, rowY + height + 4, { align: "center" });

    const bottom = rowY + height + 4 + labelLines.length * 3.6 + 2;
    col += 1;
    if (col >= cols) {
      col = 0;
      rowY = bottom + gap;
    }
  }
}

function estimateTermsHeight(doc: jsPDF, terms: string[]): number {
  doc.setFont(QUOTATION_PDF_FONT, "normal");
  doc.setFontSize(QUOTATION_PDF_FONT_SIZES.termsBody);
  return terms.reduce((sum, term, index) => {
    const termLines = doc.splitTextToSize(`${index + 1}. ${term}`, CONTENT_WIDTH - 6);
    return sum + 3.6 * termLines.length;
  }, 4.8);
}

function drawSignatureLines(
  doc: jsPDF,
  company: QuotationCompanyInfo,
  thankingY: number,
  signatoryY: number,
) {
  setTextColor(doc, QUOTATION_PDF_COLORS.black);
  doc.setFont(QUOTATION_PDF_FONT, "normal");
  doc.setFontSize(QUOTATION_PDF_FONT_SIZES.body);
  doc.text("Thanking you,", MARGIN_LEFT, thankingY);

  setTextColor(doc, QUOTATION_PDF_COLORS.signature);
  doc.setFont(QUOTATION_PDF_FONT, "bold");
  doc.text(`For ${company.name}`, PAGE_WIDTH - MARGIN_RIGHT, thankingY, { align: "right" });
  doc.text("Authorized Signatory", PAGE_WIDTH - MARGIN_RIGHT, signatoryY, { align: "right" });
}

/** Terms + signature stay on page 1; new page only when they would overlap the signature zone. */
function drawClosingSection(
  doc: jsPDF,
  company: QuotationCompanyInfo,
  startY: number,
  terms: string[],
): void {
  const thankingY = CONTENT_BOTTOM_Y - SIGNATURE_BLOCK_HEIGHT;
  const signatoryY = CONTENT_BOTTOM_Y - 6;
  const termsHeight = estimateTermsHeight(doc, terms);
  const termsEndY = startY + termsHeight;

  if (termsEndY > thankingY - 2) {
    doc.addPage();
    drawPageBackground(doc);
    startY = QUOTATION_PDF_MARGINS.top + 4;
  }

  let y = startY;
  setTextColor(doc, QUOTATION_PDF_COLORS.maroon);
  doc.setFont(QUOTATION_PDF_FONT, "bold");
  doc.setFontSize(QUOTATION_PDF_FONT_SIZES.body);
  doc.text("Terms and Conditions", MARGIN_LEFT, y);
  y += 4.8;

  setTextColor(doc, QUOTATION_PDF_COLORS.black);
  doc.setFont(QUOTATION_PDF_FONT, "normal");
  doc.setFontSize(QUOTATION_PDF_FONT_SIZES.termsBody);
  for (const [index, term] of terms.entries()) {
    const termLines = doc.splitTextToSize(`${index + 1}. ${term}`, CONTENT_WIDTH - 6);
    doc.text(termLines, MARGIN_LEFT + 3, y);
    y += 3.6 * termLines.length;
  }

  drawSignatureLines(doc, company, thankingY, signatoryY);
}

function drawPageFooter(
  doc: jsPDF,
  pageNumber: number,
  pageCount: number,
  company: QuotationCompanyInfo,
) {
  setTextColor(doc, QUOTATION_PDF_COLORS.footer);
  doc.setFont(QUOTATION_PDF_FONT, "normal");
  doc.setFontSize(QUOTATION_PDF_FONT_SIZES.footer);
  doc.text(company.footerText ?? COMPANY_PDF_FOOTER, PAGE_WIDTH / 2, PAGE_HEIGHT - 10, {
    align: "center",
  });
  doc.setFontSize(8);
  doc.text(`-- ${pageNumber} of ${pageCount} --`, PAGE_WIDTH / 2, PAGE_HEIGHT - 5, {
    align: "center",
  });
}

function redrawAllPageFooters(doc: jsPDF, company: QuotationCompanyInfo) {
  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    drawPageFooter(doc, page, pageCount, company);
  }
}

export function buildQuotationGeneratorFilename(input: QuotationGeneratorInput): string {
  const customer = slugify(input.customerName ?? "") || "quotation";
  const date = input.quotationDate ?? new Date().toISOString().slice(0, 10);
  return `${customer}-quotation-${date}.pdf`;
}

/** Build Shivshakti-style quotation PDF from dynamic item data. */
export async function generateQuotationPdf(input: QuotationGeneratorInput): Promise<jsPDF> {
  const company = resolveCompany(input);
  const summary = calculateQuotationSummary(input);
  const dateText = formatQuotationDate(input.quotationDate);
  const tableBody = buildTableRows(input);
  const terms = input.terms?.length ? input.terms : [...QUOTATION_STANDARD_TERMS];

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  doc.setProperties({
    title: `${input.customerName || "Quotation"} - ${company.name}`,
    creator: pdfCreatorName(),
  });

  drawPageBackground(doc);
  let y = drawCompanyLetterhead(doc, company, dateText);

  setTextColor(doc, QUOTATION_PDF_COLORS.black);
  doc.setFont(QUOTATION_PDF_FONT, "bold");
  doc.setFontSize(QUOTATION_PDF_FONT_SIZES.body);
  doc.text("To,", MARGIN_LEFT, y);
  y += 4.8;

  doc.setFont(QUOTATION_PDF_FONT, "normal");
  if (input.customerName?.trim()) {
    doc.text(input.customerName.trim(), MARGIN_LEFT, y);
    y += 4.8;
  }

  if (input.customerAddress?.trim()) {
    const addressLines = doc.splitTextToSize(input.customerAddress.trim(), CONTENT_WIDTH * 0.75);
    doc.text(addressLines, MARGIN_LEFT, y);
    y += 4.8 * addressLines.length;
  }

  y += 2.5;
  setTextColor(doc, QUOTATION_PDF_COLORS.maroon);
  doc.setFont(QUOTATION_PDF_FONT, "bold");
  doc.setFontSize(QUOTATION_PDF_FONT_SIZES.subject);
  doc.text(`Subject: ${input.subject ?? DEFAULT_SUBJECT}`, PAGE_WIDTH / 2, y, {
    align: "center",
  });
  y += 4.8 + 2.5;

  setTextColor(doc, QUOTATION_PDF_COLORS.black);
  doc.setFont(QUOTATION_PDF_FONT, "normal");
  doc.setFontSize(QUOTATION_PDF_FONT_SIZES.body);
  doc.text("Dear Sir/Madam,", MARGIN_LEFT, y);
  y += 4.8;

  const intro = input.introText ?? DEFAULT_INTRO;
  const introLines = doc.splitTextToSize(intro, CONTENT_WIDTH);
  doc.text(introLines, MARGIN_LEFT, y);
  y += 4.8 * introLines.length + 2.5;

  autoTable(doc, {
    startY: y,
    head: [["Sr. No.", "Description of Work", "Qty/Area", "Rate", "Amount"]],
    body: tableBody,
    theme: "grid",
    showHead: "firstPage",
    styles: {
      font: QUOTATION_PDF_FONT,
      fontSize: QUOTATION_PDF_FONT_SIZES.body,
      cellPadding: 2,
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
      halign: "center",
    },
    columnStyles: {
      0: { cellWidth: 14, halign: "center" },
      1: { cellWidth: 76 },
      2: { cellWidth: 20, halign: "center" },
      3: { cellWidth: 28, halign: "right" },
      4: { cellWidth: 30, halign: "right" },
    },
    margin: { left: MARGIN_LEFT, right: MARGIN_RIGHT, top: y, bottom: FOOTER_RESERVE },
    didParseCell(data) {
      const isTotalRow = data.row.index === tableBody.length - 1;
      if (!isTotalRow) return;
      data.cell.styles.fontStyle = "bold";
      data.cell.styles.fontSize = QUOTATION_PDF_FONT_SIZES.total;
      if (data.column.index === 1) data.cell.styles.halign = "center";
    },
  });

  y = drawAreaRateSummary(doc, input, getFinalY(doc, y) + 2);
  y = getFinalY(doc, y) + 6;

  setTextColor(doc, QUOTATION_PDF_COLORS.black);
  doc.setFont(QUOTATION_PDF_FONT, "italic");
  doc.setFontSize(QUOTATION_PDF_FONT_SIZES.amountWords);
  const amountWords = `Rupees ${rupeesToWords(summary.grandTotal)} Only`;
  const amountLines = doc.splitTextToSize(amountWords, CONTENT_WIDTH);
  doc.text(amountLines, MARGIN_LEFT, y);
  y += 4.8 * amountLines.length + 4;

  drawClosingSection(doc, company, y, terms);

  const referenceImages = await resolveReferenceImagesForQuotation(summary.items);
  drawReferenceImagesPage(doc, referenceImages, company, dateText);
  redrawAllPageFooters(doc, company);

  return doc;
}

export async function exportGeneratedQuotationPdf(input: QuotationGeneratorInput): Promise<void> {
  const doc = await generateQuotationPdf(input);
  await savePdfDocument(doc, buildQuotationGeneratorFilename(input));
}
