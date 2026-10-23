import type { jsPDF } from "jspdf";
import type { Styles } from "jspdf-autotable";

import { COMPANY_NAME, COMPANY_TAGLINE } from "@/lib/brand";

/** Brand palette aligned with the website (indigo / violet / cyan). */
export const PDF_COLORS = {
  primary: [67, 56, 202] as [number, number, number],
  primaryDark: [49, 46, 129] as [number, number, number],
  violet: [109, 40, 217] as [number, number, number],
  cyan: [8, 145, 178] as [number, number, number],
  amber: [217, 119, 6] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  muted: [100, 116, 139] as [number, number, number],
  lightBg: [238, 242, 255] as [number, number, number],
  highlightBg: [240, 249, 255] as [number, number, number],
  border: [199, 210, 254] as [number, number, number],
  text: [15, 23, 42] as [number, number, number],
};

export const PDF_MARGIN = 16;
export const PDF_HEADER_HEIGHT = 28;

export function formatPdfDate(date = new Date()): string {
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatPdfDateTime(isoDate: string): string {
  return new Date(isoDate).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

type BrandHeaderOptions = {
  docTitle: string;
  docSubtitle?: string;
  rightLabel?: string;
  margin?: number;
};

/** Coloured company header band — returns Y position for body content. */
export function drawBrandHeader(
  doc: jsPDF,
  { docTitle, docSubtitle, rightLabel, margin = PDF_MARGIN }: BrandHeaderOptions,
): number {
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(...PDF_COLORS.primaryDark);
  doc.rect(0, 0, pageWidth, PDF_HEADER_HEIGHT, "F");

  doc.setFillColor(...PDF_COLORS.violet);
  doc.rect(pageWidth * 0.55, 0, pageWidth * 0.45, PDF_HEADER_HEIGHT, "F");

  doc.setFillColor(...PDF_COLORS.amber);
  doc.rect(0, PDF_HEADER_HEIGHT, pageWidth, 1.2, "F");

  doc.setTextColor(...PDF_COLORS.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(COMPANY_NAME, margin, 11);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(COMPANY_TAGLINE, margin, 16.5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(docTitle, margin, 24);

  if (docSubtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(docSubtitle, margin + doc.getTextWidth(docTitle) + 3, 24);
  }

  const dateText = rightLabel ?? formatPdfDate();
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(dateText, pageWidth - margin, 11, { align: "right" });

  doc.setTextColor(...PDF_COLORS.text);
  return PDF_HEADER_HEIGHT + 8;
}

export function drawSectionTitle(
  doc: jsPDF,
  title: string,
  y: number,
  margin = PDF_MARGIN,
): number {
  doc.setFillColor(...PDF_COLORS.primary);
  doc.rect(margin, y - 4, 3, 6, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...PDF_COLORS.primaryDark);
  doc.text(title, margin + 6, y);
  doc.setTextColor(...PDF_COLORS.text);
  return y + 6;
}

export function brandTableHeadStyles(): Partial<Styles> {
  return {
    fillColor: PDF_COLORS.primary,
    textColor: PDF_COLORS.white,
    fontStyle: "bold",
    fontSize: 10,
  };
}

export function brandTableBodyStyles(): Partial<Styles> {
  return {
    font: "helvetica",
    fontSize: 10,
    cellPadding: 3.5,
    lineColor: PDF_COLORS.border,
    lineWidth: 0.15,
    textColor: PDF_COLORS.text,
  };
}

export function drawBrandFooter(
  doc: jsPDF,
  note?: string,
  margin = PDF_MARGIN,
): void {
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  const footerY = pageHeight - 12;

  doc.setDrawColor(...PDF_COLORS.border);
  doc.setLineWidth(0.3);
  doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...PDF_COLORS.primaryDark);
  doc.text(COMPANY_NAME, margin, footerY);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...PDF_COLORS.muted);
  const footerNote =
    note ?? "UPVC cutting, estimation & quotation software";
  doc.text(footerNote, margin, footerY + 3.5);

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...PDF_COLORS.muted);
    doc.text(`Page ${page} of ${pageCount}`, pageWidth - margin, footerY, {
      align: "right",
    });
  }

  doc.setTextColor(...PDF_COLORS.text);
}

export function pdfCreatorName(): string {
  return COMPANY_NAME;
}
