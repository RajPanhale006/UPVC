import type { jsPDF } from "jspdf";

import { fitPreviewDimensions } from "@/lib/preview/pdf-embed";

import type { QuotationReferencePhotoItem } from "./reference-photos";
import {
  QUOTATION_PDF_COLORS,
  QUOTATION_PDF_FONT,
  QUOTATION_PDF_MARGINS,
} from "./pdf-theme";

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN_LEFT = QUOTATION_PDF_MARGINS.left;
const MARGIN_RIGHT = QUOTATION_PDF_MARGINS.right;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
const FOOTER_RESERVE = 14;
const GRID_GAP = 8;
const LABEL_GAP = 4;

function detectImageFormat(dataUrl: string): "PNG" | "JPEG" | "WEBP" {
  if (/^data:image\/jpe?g/i.test(dataUrl)) return "JPEG";
  if (/^data:image\/webp/i.test(dataUrl)) return "WEBP";
  return "PNG";
}

function drawPhotoCell(
  doc: jsPDF,
  item: QuotationReferencePhotoItem,
  x: number,
  y: number,
  cellW: number,
  imageH: number,
): number {
  const preview = item.preview;
  const { width, height } = fitPreviewDimensions(preview.aspectRatio, cellW - 4, imageH);
  const imageX = x + (cellW - width) / 2;

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.roundedRect(imageX - 0.5, y - 0.5, width + 1, height + 1, 1.5, 1.5, "S");

  if (preview.dataUrl) {
    doc.addImage(
      preview.dataUrl,
      detectImageFormat(preview.dataUrl),
      imageX,
      y,
      width,
      height,
      undefined,
      "FAST",
    );
  }

  doc.setFont(QUOTATION_PDF_FONT, "bold");
  doc.setFontSize(9);
  doc.setTextColor(...QUOTATION_PDF_COLORS.maroon);
  const labelLines = doc.splitTextToSize(item.label, cellW);
  doc.text(labelLines, x + cellW / 2, y + height + LABEL_GAP, { align: "center" });

  return y + height + LABEL_GAP + labelLines.length * 3.6 + 2;
}

export function drawQuotationReferencePhotosPage(
  doc: jsPDF,
  items: QuotationReferencePhotoItem[],
  drawBackground: (doc: jsPDF) => void,
): void {
  if (items.length === 0) return;

  doc.addPage();
  drawBackground(doc);

  let y = 22;
  doc.setFont(QUOTATION_PDF_FONT, "bold");
  doc.setFontSize(14);
  doc.setTextColor(...QUOTATION_PDF_COLORS.maroon);
  doc.text("Reference Images", PAGE_WIDTH / 2, y, { align: "center" });
  y += 7;

  doc.setFont(QUOTATION_PDF_FONT, "normal");
  doc.setFontSize(10);
  doc.setTextColor(...QUOTATION_PDF_COLORS.black);
  doc.text("Window types included in this quotation", PAGE_WIDTH / 2, y, { align: "center" });
  y += 10;

  const cols = items.length === 1 ? 1 : 2;
  const cellW = cols === 1 ? Math.min(120, CONTENT_WIDTH) : (CONTENT_WIDTH - GRID_GAP) / cols;
  const startX = cols === 1 ? (PAGE_WIDTH - cellW) / 2 : MARGIN_LEFT;
  const imageH = items.length <= 2 ? 78 : items.length <= 4 ? 58 : 46;
  const rowLabelReserve = 14;
  const rowHeight = imageH + rowLabelReserve;

  let col = 0;
  let rowY = y;
  let maxRowBottom = y;

  for (const item of items) {
    const needsNewPage = rowY + rowHeight > PAGE_HEIGHT - FOOTER_RESERVE - 8;

    if (needsNewPage) {
      doc.addPage();
      drawBackground(doc);
      rowY = 22;
      col = 0;
      maxRowBottom = rowY;
    }

    const xPos = startX + col * (cellW + GRID_GAP);
    const bottom = drawPhotoCell(doc, item, xPos, rowY, cellW, imageH);
    maxRowBottom = Math.max(maxRowBottom, bottom);

    col += 1;
    if (col >= cols) {
      col = 0;
      rowY = maxRowBottom + GRID_GAP;
      maxRowBottom = rowY;
    }
  }
}
