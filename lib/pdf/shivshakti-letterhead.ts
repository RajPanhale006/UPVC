import type { jsPDF } from "jspdf";

import type { CompanySettings } from "@/lib/company-settings";
import {
  QUOTATION_PDF_COLORS,
  QUOTATION_PDF_FONT,
  QUOTATION_PDF_FONT_SIZES,
  QUOTATION_PDF_MARGINS,
} from "@/lib/quotation/pdf-theme";

const PAGE_WIDTH = 210;

export type LetterheadLayout = {
  companyFont: number;
  taglineFont: number;
  addressFont: number;
  bodyFont: number;
  headerHeight: number;
  compactHeader: boolean;
};

const DEFAULT_LAYOUT: LetterheadLayout = {
  companyFont: QUOTATION_PDF_FONT_SIZES.companyName,
  taglineFont: QUOTATION_PDF_FONT_SIZES.tagline,
  addressFont: QUOTATION_PDF_FONT_SIZES.address,
  bodyFont: QUOTATION_PDF_FONT_SIZES.body,
  headerHeight: 52,
  compactHeader: false,
};

const COMPACT_LAYOUT: LetterheadLayout = {
  companyFont: 20,
  taglineFont: 11,
  addressFont: 9.5,
  bodyFont: 10,
  headerHeight: 38,
  compactHeader: true,
};

function setMaroonText(doc: jsPDF) {
  doc.setTextColor(...QUOTATION_PDF_COLORS.maroon);
}

function setBlackText(doc: jsPDF) {
  doc.setTextColor(...QUOTATION_PDF_COLORS.black);
}

function drawMaroonRule(doc: jsPDF, y: number, lineWidth = 0.3) {
  doc.setDrawColor(...QUOTATION_PDF_COLORS.maroon);
  doc.setLineWidth(lineWidth);
  doc.line(QUOTATION_PDF_MARGINS.left, y, PAGE_WIDTH - QUOTATION_PDF_MARGINS.right, y);
}

function formatLetterheadDate(isoDate?: string): string {
  if (!isoDate) {
    const now = new Date();
    return `${now.getDate()}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;
  }
  const parsed = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return `${parsed.getDate()}/${String(parsed.getMonth() + 1).padStart(2, "0")}/${parsed.getFullYear()}`;
}

/** Shivshakti letterhead — matches existing quotation PDF format. */
export function drawShivshaktiLetterhead(
  doc: jsPDF,
  company: CompanySettings,
  options?: {
    dateText?: string;
    compact?: boolean;
    showDate?: boolean;
  },
): number {
  const layout = options?.compact ? COMPACT_LAYOUT : DEFAULT_LAYOUT;
  const centerX = PAGE_WIDTH / 2;
  const headerTop = layout.compactHeader ? 8 : 10;

  doc.setFillColor(...QUOTATION_PDF_COLORS.background);
  doc.rect(0, 0, PAGE_WIDTH, layout.headerHeight + headerTop, "F");

  let y = headerTop + (layout.compactHeader ? 4 : 6);
  drawMaroonRule(doc, y, 0.25);
  y += layout.compactHeader ? 5 : 6;

  setMaroonText(doc);
  doc.setFont(QUOTATION_PDF_FONT, "bold");
  doc.setFontSize(layout.companyFont);
  doc.text(company.companyName, centerX, y, { align: "center" });
  y += layout.compactHeader ? 5.5 : 7;

  doc.setFont(QUOTATION_PDF_FONT, "bold");
  doc.setFontSize(layout.taglineFont);
  doc.text(company.businessLine, centerX, y, { align: "center" });
  y += layout.compactHeader ? 4 : 5;
  drawMaroonRule(doc, y, 0.45);
  y += layout.compactHeader ? 4 : 5;

  setBlackText(doc);
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

  const website = company.website.replace(/^https?:\/\//, "");
  doc.text(`Website: ${website}`, centerX, y, { align: "center" });
  y += layout.compactHeader ? 4 : 4.5;
  drawMaroonRule(doc, y, 0.25);
  y += layout.compactHeader ? 4 : 6;

  if (options?.showDate !== false) {
    doc.setFontSize(layout.bodyFont);
    doc.text(
      `Date: ${formatLetterheadDate(options?.dateText)}`,
      PAGE_WIDTH - QUOTATION_PDF_MARGINS.right,
      y,
      { align: "right" },
    );
    y += layout.compactHeader ? 2 : 4;
  }

  return y;
}

export function fillQuotationBackground(doc: jsPDF) {
  doc.setFillColor(...QUOTATION_PDF_COLORS.background);
  doc.rect(0, 0, PAGE_WIDTH, 297, "F");
}
