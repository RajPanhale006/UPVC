import type { jsPDF } from "jspdf";

export type PdfPreviewRenderResult = {
  dataUrl: string;
  aspectRatio: number;
  caption: string;
};

export function fitPreviewDimensions(
  aspectRatio: number,
  maxW: number,
  maxH: number,
): { width: number; height: number } {
  const safeAspect = aspectRatio > 0 ? aspectRatio : 1;
  let width = maxW;
  let height = width * safeAspect;
  if (height > maxH) {
    height = maxH;
    width = height / safeAspect;
  }
  return { width, height };
}

export function drawPreviewFallbackBox(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
): number {
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.setLineWidth(0.25);
  doc.roundedRect(x, y, width, height, 2, 2, "FD");
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("Preview not available", x + width / 2, y + height / 2, { align: "center" });
  return y + height;
}

export function embedPreviewInPdf(
  doc: jsPDF,
  preview: PdfPreviewRenderResult | null | undefined,
  x: number,
  y: number,
  maxW: number,
  maxH: number,
  options?: { drawBorder?: boolean; drawCaption?: boolean },
): number {
  const drawBorder = options?.drawBorder ?? true;
  const drawCaption = options?.drawCaption ?? true;

  const { width, height } = preview
    ? fitPreviewDimensions(preview.aspectRatio, maxW, maxH)
    : { width: maxW, height: maxH };

  if (!preview?.dataUrl) {
    const bottom = drawPreviewFallbackBox(doc, x, y, width, height);
    if (drawCaption && preview?.caption) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      const lines = doc.splitTextToSize(preview.caption, width + 4);
      doc.text(lines, x + width / 2, bottom + 3, { align: "center" });
      return bottom + 3 + lines.length * 3;
    }
    return bottom;
  }

  if (drawBorder) {
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.roundedRect(x - 0.5, y - 0.5, width + 1, height + 1, 1.5, 1.5, "S");
  }

  doc.addImage(preview.dataUrl, "PNG", x, y, width, height, undefined, "FAST");

  let bottom = y + height;
  if (drawCaption && preview.caption) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    const lines = doc.splitTextToSize(preview.caption, width + 6);
    doc.text(lines, x + width / 2, bottom + 3, { align: "center" });
    bottom += 3 + lines.length * 3;
  }

  return bottom;
}
