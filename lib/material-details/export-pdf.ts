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

import type { MaterialDetailsJobResult, MaterialDetailsProduct } from "./types";

function getFinalY(doc: jsPDF, fallback: number): number {
  const table = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable;
  return table?.finalY ?? fallback;
}

function formatRs(value: number): string {
  return `Rs. ${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function addProductSection(doc: jsPDF, product: MaterialDetailsProduct, startY: number, margin: number) {
  let y = drawSectionTitle(
    doc,
    `${product.label} · Qty ${product.quantity} · ${product.areaSqft.toFixed(2)} sq.ft`,
    startY,
    margin,
  );

  autoTable(doc, {
    startY: y + 2,
    theme: "plain",
    styles: { ...brandTableBodyStyles(), fontSize: 8 },
    body: [
      ["Size", `${Math.round(product.widthMm)} × ${Math.round(product.heightMm)} mm`],
      ["Track / type", product.trackLabel ?? "—"],
      ["Profile", product.profileCode ?? "—"],
    ],
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 36, fillColor: PDF_COLORS.lightBg },
    },
    margin: { left: margin, right: margin },
  });

  y = getFinalY(doc, y + 20) + 4;

  autoTable(doc, {
    startY: y,
    head: [["Category", "Item", "Qty", "Unit", "Rate", "Amount", "Notes"]],
    body: product.lines.map((line) => [
      line.category,
      line.specification ? `${line.item} (${line.specification})` : line.item,
      String(line.quantity),
      line.unit,
      formatRs(line.rate),
      formatRs(line.amount),
      line.note ?? "",
    ]),
    styles: { ...brandTableBodyStyles(), fontSize: 7.5, cellPadding: 1.6 },
    headStyles: { ...brandTableHeadStyles(), fontSize: 7 },
    margin: { left: margin, right: margin },
  });

  y = getFinalY(doc, y + 20) + 4;

  if (product.profileRows.length > 0) {
    y = drawSectionTitle(doc, "Profile breakdown", y, margin);
    autoTable(doc, {
      startY: y + 2,
      head: [["Profile", "Code", "Run ft", "Weight kg", "Rate/kg", "Cost"]],
      body: product.profileRows.map((row) => [
        row.profileName,
        row.profileCode,
        row.costingRunFt.toFixed(2),
        row.totalWeight?.toFixed(2) ?? "—",
        row.ratePerKg?.toFixed(2) ?? "—",
        formatRs(row.totalCost),
      ]),
      styles: { ...brandTableBodyStyles(), fontSize: 7.5 },
      headStyles: brandTableHeadStyles(),
      margin: { left: margin, right: margin },
    });
    y = getFinalY(doc, y + 20) + 4;
  }

  autoTable(doc, {
    startY: y,
    theme: "plain",
    styles: { ...brandTableBodyStyles(), fontSize: 8.5 },
    body: [
      ["Material total", formatRs(product.materialTotal)],
      ["Labour total", formatRs(product.labourTotal)],
      ["Overhead total", formatRs(product.overheadTotal)],
      ["Workshop total", formatRs(product.workshopTotal)],
    ],
    columnStyles: {
      0: { fontStyle: "bold", fillColor: PDF_COLORS.lightBg },
      1: { fontStyle: "bold", halign: "right" },
    },
    margin: { left: margin, right: margin },
  });

  return getFinalY(doc, y + 24) + 8;
}

export function buildMaterialDetailsPdf(data: MaterialDetailsJobResult): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = PDF_MARGIN;
  const pageHeight = doc.internal.pageSize.getHeight();

  let y = drawBrandHeader(doc, {
    docTitle: "Material Details Sheet",
    docSubtitle: "Full material, hardware, glass, mesh, labour & overhead breakdown",
    rightLabel: formatPdfDateTime(data.generatedAt),
    margin,
  });

  autoTable(doc, {
    startY: y,
    theme: "plain",
    styles: { ...brandTableBodyStyles(), fontSize: 9 },
    body: [
      ["Job ID", data.jobId],
      ["Customer", data.customerName || "—"],
      ["Project", data.projectName || "—"],
      ["Products", String(data.validProductCount)],
      ["Total area", `${data.totalAreaSqft.toFixed(2)} sq.ft`],
      ["Grand workshop total", formatRs(data.grandWorkshopTotal)],
    ],
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 44, fillColor: PDF_COLORS.lightBg },
    },
    margin: { left: margin, right: margin },
  });

  y = getFinalY(doc, y + 30) + 6;

  for (const product of data.products.filter((p) => p.isValid)) {
    if (y > pageHeight - 60) {
      doc.addPage();
      y = margin;
    }
    y = addProductSection(doc, product, y, margin);
  }

  drawBrandFooter(doc);
  return doc;
}

export async function exportMaterialDetailsPdf(
  data: MaterialDetailsJobResult,
  filename?: string,
): Promise<void> {
  const { savePdfDocument } = await import("@/lib/pdf/save");
  const doc = buildMaterialDetailsPdf(data);
  await savePdfDocument(doc, filename ?? `material-details-${data.jobId}.pdf`);
}
