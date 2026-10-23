import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import type { CompanySettings } from "@/lib/company-settings";
import {
  drawShivshaktiLetterhead,
  fillQuotationBackground,
} from "@/lib/pdf/shivshakti-letterhead";
import { savePdfDocument } from "@/lib/pdf/save";
import { pdfCreatorName } from "@/lib/pdf/theme";
import {
  calculateQuotation,
  formatPdfRs,
  getGstTermsLine,
  GST_PERCENT,
  shouldApplyGstInTotal,
  type QuotationForm,
  type QuotationResult,
} from "@/lib/quotation";
import {
  QUOTATION_PDF_COLORS,
  QUOTATION_PDF_FONT,
  QUOTATION_PDF_FONT_SIZES,
  QUOTATION_PDF_MARGINS,
} from "@/lib/quotation/pdf-theme";
import { rupeesToWords } from "@/lib/quotation/number-to-words";
import { QUOTATION_STANDARD_TERMS } from "@/lib/quotation/terms";
import { COMPANY_PDF_FOOTER } from "@/lib/brand";
import { resolveQuotationPreviewData } from "@/components/product-preview/preview-mapper";
import type { PdfPreviewRenderResult } from "@/lib/preview/pdf-embed";
import { embedPreviewInPdf } from "@/lib/preview/pdf-embed";

import type { PremiumProposal, ProposalExportMode } from "./types";
import {
  formatFeetInchesFromRow,
  formatMmFromRow,
  mergeWindowDetail,
} from "./window-meta";

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN_LEFT = QUOTATION_PDF_MARGINS.left;
const MARGIN_RIGHT = QUOTATION_PDF_MARGINS.right;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
const FOOTER_Y = PAGE_HEIGHT - 10;

type BuildProposalPdfInput = {
  proposal: PremiumProposal;
  quotationForm: QuotationForm;
  company: CompanySettings;
  mode?: ProposalExportMode;
};

type PdfContext = {
  doc: jsPDF;
  proposal: PremiumProposal;
  quotation: QuotationResult;
  company: CompanySettings;
  previews: Map<string, PdfPreviewRenderResult>;
};

function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function getTableY(doc: jsPDF, fallback: number): number {
  return (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? fallback;
}

function newPage(ctx: PdfContext): number {
  ctx.doc.addPage();
  fillQuotationBackground(ctx.doc);
  return QUOTATION_PDF_MARGINS.top + 8;
}

function drawFooters(ctx: PdfContext) {
  const { doc, proposal, quotation } = ctx;
  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setTextColor(...QUOTATION_PDF_COLORS.footer);
    doc.setFont(QUOTATION_PDF_FONT, "normal");
    doc.setFontSize(9);
    doc.text(COMPANY_PDF_FOOTER, PAGE_WIDTH / 2, FOOTER_Y - 4, { align: "center" });
    doc.setFontSize(8);
    doc.text(
      `${quotation.form.customerName || "Customer"} · ${proposal.proposalNumber} · Page ${page} of ${pageCount}`,
      PAGE_WIDTH / 2,
      FOOTER_Y,
      { align: "center" },
    );
  }
}

/** Page 1 — letterhead, introduction, project details. */
function drawPageCover(ctx: PdfContext): void {
  const { doc, proposal, quotation, company } = ctx;
  fillQuotationBackground(doc);
  let y = drawShivshaktiLetterhead(doc, company, {
    dateText: proposal.proposalDate,
    compact: false,
  });

  doc.setFont(QUOTATION_PDF_FONT, "bold");
  doc.setFontSize(16);
  doc.setTextColor(...QUOTATION_PDF_COLORS.maroon);
  doc.text("Premium Window Proposal", PAGE_WIDTH / 2, y + 4, { align: "center" });
  y += 12;

  doc.setFont(QUOTATION_PDF_FONT, "bold");
  doc.setFontSize(QUOTATION_PDF_FONT_SIZES.body);
  doc.setTextColor(...QUOTATION_PDF_COLORS.black);
  doc.text("To,", MARGIN_LEFT, y);
  y += 5;

  doc.setFont(QUOTATION_PDF_FONT, "normal");
  if (quotation.form.customerName) {
    doc.text(quotation.form.customerName, MARGIN_LEFT, y);
    y += 5;
  }
  if (quotation.form.customerAddress) {
    const lines = doc.splitTextToSize(quotation.form.customerAddress, CONTENT_WIDTH * 0.7);
    doc.text(lines, MARGIN_LEFT, y);
    y += lines.length * 4.5;
  }

  y += 2;
  doc.setFont(QUOTATION_PDF_FONT, "bold");
  doc.setTextColor(...QUOTATION_PDF_COLORS.maroon);
  doc.text(
    `Subject: ${proposal.projectName || quotation.form.subject || "UPVC Window Proposal"}`,
    PAGE_WIDTH / 2,
    y,
    { align: "center" },
  );
  y += 8;

  doc.setFont(QUOTATION_PDF_FONT, "normal");
  doc.setTextColor(...QUOTATION_PDF_COLORS.black);
  doc.text("Dear Sir/Madam,", MARGIN_LEFT, y);
  y += 6;

  const introLines = doc.splitTextToSize(proposal.introduction, CONTENT_WIDTH);
  doc.text(introLines, MARGIN_LEFT, y);
  y += introLines.length * 4.8 + 4;

  const meta = [
    `Proposal No.: ${proposal.proposalNumber}`,
    `Valid until: ${proposal.validUntil}`,
    `Project location: ${proposal.projectLocation || quotation.form.customerAddress || "—"}`,
    `Prepared by: ${proposal.preparedBy || company.preparedByDefault || "—"}`,
  ];
  meta.forEach((line) => {
    doc.text(line, MARGIN_LEFT, y);
    y += 5;
  });

  if (proposal.understandingText) {
    y += 3;
    doc.setFont(QUOTATION_PDF_FONT, "bold");
    doc.setTextColor(...QUOTATION_PDF_COLORS.maroon);
    doc.text("Our Understanding of Your Requirement", MARGIN_LEFT, y);
    y += 5;
    doc.setFont(QUOTATION_PDF_FONT, "normal");
    doc.setTextColor(...QUOTATION_PDF_COLORS.black);
    const understanding = doc.splitTextToSize(proposal.understandingText, CONTENT_WIDTH);
    doc.text(understanding, MARGIN_LEFT, y);
    y += understanding.length * 4.8 + 4;
  }

  const firstRow = ctx.quotation.groups.flatMap((group) => group.rows)[0];
  if (firstRow) {
    const preview = ctx.previews.get(firstRow.id);
    if (preview) {
      y += 4;
      const boxW = 92;
      const boxH = 62;
      const x = (PAGE_WIDTH - boxW) / 2;
      y = embedPreviewInPdf(ctx.doc, preview, x, y, boxW, boxH) + 6;
    }
  }
}

/** Page 2 (and overflow) — window-wise design + specifications. */
function drawWindowPages(ctx: PdfContext): void {
  const { doc } = ctx;
  const rows = ctx.quotation.groups.flatMap((group) => group.rows);
  let y = newPage(ctx);
  let index = 0;

  for (const row of rows) {
    index += 1;
    const detail = mergeWindowDetail(row, index - 1, ctx.proposal.windowDetails[row.id]);
    const blockHeight = 95;

    if (y + blockHeight > PAGE_HEIGHT - 22) {
      y = newPage(ctx);
    }

    doc.setFont(QUOTATION_PDF_FONT, "bold");
    doc.setFontSize(12);
    doc.setTextColor(...QUOTATION_PDF_COLORS.maroon);
    doc.text(`Window ${detail.code}`, MARGIN_LEFT, y);
    y += 6;

    const preview = ctx.previews.get(row.id);
    const diagramBottom = embedPreviewInPdf(
      ctx.doc,
      preview ?? null,
      MARGIN_LEFT,
      y,
      88,
      58,
    );

    const specs: [string, string][] = [
      ["Location", detail.roomOrLocation || "—"],
      ["Size (mm)", formatMmFromRow(row)],
      ["Size (ft/in)", formatFeetInchesFromRow(row)],
      ["Quantity", `${row.quantity} Nos`],
      ["Area / window", `${row.areaSqFt.toFixed(2)} sq.ft`],
      ["Sash configuration", detail.sashConfiguration],
      ["Profile colour", detail.profileColour],
      ["Hardware", detail.handleType],
      ["Mesh", detail.meshDetails],
    ];

    if (ctx.proposal.showItemPrices) {
      specs.push(["Rate / sq.ft", formatPdfRs(row.ratePerSqFt)]);
      specs.push(["Unit price", formatPdfRs(row.amount)]);
      specs.push(["Total value", formatPdfRs(row.amount * row.quantity)]);
    }

    autoTable(ctx.doc, {
      startY: y,
      body: specs,
      theme: "grid",
      margin: { left: MARGIN_LEFT + 92, right: MARGIN_RIGHT },
      tableWidth: CONTENT_WIDTH - 92,
      styles: {
        font: QUOTATION_PDF_FONT,
        fontSize: 8.5,
        cellPadding: 1.5,
        lineColor: QUOTATION_PDF_COLORS.border,
        textColor: QUOTATION_PDF_COLORS.black,
      },
      columnStyles: {
        0: { cellWidth: 34, fontStyle: "bold" },
        1: { cellWidth: 48 },
      },
    });

    y = Math.max(diagramBottom, getTableY(ctx.doc, y)) + 8;
  }
}

/** Page 3 — commercial summary (same quotation totals). */
function drawCommercialPage(ctx: PdfContext): void {
  let y = newPage(ctx);
  const { doc, proposal, quotation } = ctx;
  const { totals, form } = quotation;

  doc.setFont(QUOTATION_PDF_FONT, "bold");
  doc.setFontSize(14);
  doc.setTextColor(...QUOTATION_PDF_COLORS.maroon);
  doc.text("Quote Total", PAGE_WIDTH / 2, y, { align: "center" });
  y += 10;

  const totalQty = form.windows.reduce((sum, row) => sum + row.quantity, 0);
  const totalSqFt = quotation.groups.reduce(
    (sum, group) =>
      sum + group.rows.reduce((inner, row) => inner + row.areaSqFt * row.quantity, 0),
    0,
  );

  const rows: [string, string][] = [
    ["Total Quantity", `${totalQty} Nos`],
    ["Total Sq.Ft.", `${totalSqFt.toFixed(2)} Sq.Ft.`],
    ["Sub Total", formatPdfRs(totals.subtotalBeforeGst)],
  ];

  if (proposal.showAverageRate && totalSqFt > 0) {
    rows.push([
      "Average value Per Sq.Ft. Without GST",
      formatPdfRs(totals.subtotalBeforeGst / totalSqFt),
    ]);
  }

  if (shouldApplyGstInTotal(form.gstMode) && totals.gstAmount > 0) {
    rows.push([`CGST @${GST_PERCENT / 2}%`, formatPdfRs(totals.gstAmount / 2)]);
    rows.push([`SGST @${GST_PERCENT / 2}%`, formatPdfRs(totals.gstAmount / 2)]);
  }

  rows.push(["Grand Total", formatPdfRs(totals.grandTotal)]);

  if (proposal.showAverageRate && totalSqFt > 0) {
    rows.push([
      "Average value Per Sq.Ft.",
      formatPdfRs(totals.grandTotal / totalSqFt),
    ]);
  }

  autoTable(doc, {
    startY: y,
    body: rows,
    theme: "grid",
    margin: { left: MARGIN_LEFT + 20, right: MARGIN_RIGHT + 20 },
    styles: {
      font: QUOTATION_PDF_FONT,
      fontSize: 11,
      cellPadding: 2.2,
      lineColor: QUOTATION_PDF_COLORS.border,
    },
    columnStyles: {
      0: { cellWidth: 90, fontStyle: "bold" },
      1: { halign: "right" },
    },
    didParseCell(data) {
      if (data.row.index === rows.length - 1) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fontSize = 12;
        data.cell.styles.textColor = QUOTATION_PDF_COLORS.maroon;
      }
    },
  });

  y = getTableY(doc, y) + 8;
  doc.setFont(QUOTATION_PDF_FONT, "italic");
  doc.setFontSize(10);
  doc.setTextColor(...QUOTATION_PDF_COLORS.black);
  const words = `Rupees ${rupeesToWords(totals.grandTotal)} Only`;
  doc.text(doc.splitTextToSize(words, CONTENT_WIDTH - 20), MARGIN_LEFT + 10, y);
}

/** Page 4 — quotation terms + customer approval. */
function drawTermsAndApprovalPage(ctx: PdfContext): void {
  let y = newPage(ctx);
  const { doc, proposal, quotation } = ctx;

  doc.setFont(QUOTATION_PDF_FONT, "bold");
  doc.setFontSize(12);
  doc.setTextColor(...QUOTATION_PDF_COLORS.maroon);
  doc.text("Terms and Conditions:-", MARGIN_LEFT, y);
  y += 7;

  doc.setFont(QUOTATION_PDF_FONT, "normal");
  doc.setFontSize(10);
  doc.setTextColor(...QUOTATION_PDF_COLORS.black);

  const terms = [...QUOTATION_STANDARD_TERMS];
  const gstLine = getGstTermsLine(quotation.form.gstMode);
  if (gstLine) terms.push(gstLine);

  terms.forEach((term, index) => {
    const lines = doc.splitTextToSize(`${index + 1}. ${term}`, CONTENT_WIDTH);
    doc.text(lines, MARGIN_LEFT, y);
    y += lines.length * 4.2;
  });

  y += 8;
  doc.setFont(QUOTATION_PDF_FONT, "normal");
  doc.setFontSize(10);
  const acceptance =
    "I hereby accept the estimate as per above mentioned price and specifications. I have read and understood the terms & conditions and agree to them.";
  const acceptLines = doc.splitTextToSize(acceptance, CONTENT_WIDTH);
  doc.text(acceptLines, MARGIN_LEFT, y);
  y += acceptLines.length * 4.5 + 14;

  doc.line(MARGIN_LEFT, y, MARGIN_LEFT + 75, y);
  doc.line(PAGE_WIDTH - MARGIN_RIGHT - 75, y, PAGE_WIDTH - MARGIN_RIGHT, y);
  doc.setFontSize(9);
  doc.text("Signature of Customer", MARGIN_LEFT, y + 5);
  doc.text(`For ${ctx.company.companyName}`, PAGE_WIDTH - MARGIN_RIGHT - 75, y + 5);
  doc.text("Authorised Signatory", PAGE_WIDTH - MARGIN_RIGHT - 75, y + 11);
}

export function buildPremiumProposalPdf(
  input: BuildProposalPdfInput,
  previews: Map<string, PdfPreviewRenderResult> = new Map(),
): jsPDF {
  const quotation = calculateQuotation(input.quotationForm);
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  doc.setProperties({
    title: `${input.proposal.projectName || quotation.form.customerName || "Premium Proposal"} - ${input.company.companyName}`,
    creator: pdfCreatorName(),
  });

  const ctx: PdfContext = {
    doc,
    proposal: input.proposal,
    quotation,
    company: input.company,
    previews,
  };

  drawPageCover(ctx);
  drawWindowPages(ctx);
  drawCommercialPage(ctx);
  drawTermsAndApprovalPage(ctx);
  drawFooters(ctx);

  return doc;
}

export async function buildPremiumProposalPdfAsync(
  input: BuildProposalPdfInput,
): Promise<jsPDF> {
  const quotation = calculateQuotation(input.quotationForm);
  const rows = quotation.groups.flatMap((group) => group.rows);
  const { renderProductPreviewsForPdf } = await import("@/lib/preview/render-preview-image");
  const previews = await renderProductPreviewsForPdf(
    rows.map((row) => ({
      key: row.id,
      data: resolveQuotationPreviewData(row),
      options: { pixelWidth: 560, mode: "pdf" as const },
    })),
  );
  return buildPremiumProposalPdf(input, previews);
}

export function buildPremiumProposalFilename(
  proposal: PremiumProposal,
  quotationForm: QuotationForm,
): string {
  const customer = slugify(quotationForm.customerName) || "customer";
  const date = proposal.proposalDate || new Date().toISOString().slice(0, 10);
  return `${customer}-premium-proposal-${date}.pdf`;
}

export async function exportPremiumProposalPdf(input: BuildProposalPdfInput): Promise<void> {
  const doc = await buildPremiumProposalPdfAsync(input);
  await savePdfDocument(doc, buildPremiumProposalFilename(input.proposal, input.quotationForm));
}
