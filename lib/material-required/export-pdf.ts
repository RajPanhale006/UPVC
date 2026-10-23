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

import type { MaterialRequiredPdfMode, MaterialRequiredResult } from "./types";
import { getMaterialRequiredNewBarTotal } from "./build-material-required";

function getFinalY(doc: jsPDF, fallback: number): number {
  const table = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable;
  return table?.finalY ?? fallback;
}

export function buildMaterialRequiredPdf(
  data: MaterialRequiredResult,
  mode: MaterialRequiredPdfMode = "internal",
): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
  const margin = PDF_MARGIN;
  const pageWidth = doc.internal.pageSize.getWidth();
  const includePricing = mode === "internal";

  let y = drawBrandHeader(doc, {
    docTitle:
      mode === "internal"
        ? "Material Required / Purchase Sheet"
        : "Supplier Enquiry — Material Requirement",
    docSubtitle: includePricing
      ? "Internal material & cost sheet"
      : "Purchase quantities only — no internal rates",
    rightLabel: formatPdfDateTime(data.header.date),
    margin,
  });

  autoTable(doc, {
    startY: y,
    theme: "plain",
    styles: { ...brandTableBodyStyles(), fontSize: 8.5 },
    body: [
      ["Job ID", data.header.jobId],
      ["Customer", data.header.customerName || "—"],
      ["Site / Project", data.header.siteName || data.header.projectName || "—"],
      ["Products", `${data.header.validProducts} / ${data.header.totalProducts}`],
      ["Total area", `${data.header.totalAreaSqft.toFixed(2)} sq.ft`],
      ["Systems", data.header.systemsIncluded.join(" · ") || "—"],
      ["Optimizer", data.header.optimizerStatus],
      ["New full bars (job)", String(getMaterialRequiredNewBarTotal(data))],
    ],
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 42, fillColor: PDF_COLORS.lightBg },
    },
    margin: { left: margin, right: margin },
  });

  y = getFinalY(doc, y + 16);
  y = drawSectionTitle(doc, "UPVC profile requirement", y + 2, margin);

  autoTable(doc, {
    startY: y + 2,
    head: [[
      "Profile",
      "SKU",
      ...(includePricing ? ["kg/m"] : []),
      "Stock mm",
      "Cut pcs",
      "Net mm",
      "Stock used",
      "New bars",
      "Purchase mm",
      ...(includePricing ? ["Kg", "Rate/kg", "Amount"] : ["Total kg"]),
      "Reusable",
      "Scrap",
      "Kerf",
      "Util %",
    ]],
    body: data.upvcProfiles.map((row) => {
      const base = [
        row.profileName,
        row.profileCode,
      ];
      if (includePricing) {
        base.push(row.kgPerMetre?.toFixed(3) ?? "—");
      }
      base.push(
        String(row.standardBarLengthMm),
        String(row.cutPiecesCount),
        String(Math.round(row.netRequiredLengthMm)),
        String(row.inventoryBarsConsumed),
        String(row.newBarsRequired),
        String(Math.round(row.purchasedLengthMm)),
      );
      if (includePricing) {
        base.push(
          row.purchaseWeightKg.toFixed(2),
          row.ratePerKg?.toFixed(0) ?? "—",
          row.amount.toFixed(2),
        );
      } else {
        base.push(row.purchaseWeightKg.toFixed(2));
      }
      base.push(
        String(Math.round(row.reusableLeftoverMm)),
        String(Math.round(row.scrapMm)),
        String(Math.round(row.totalKerfMm)),
        row.materialUtilizationPercent.toFixed(1),
      );
      return base;
    }),
    styles: { ...brandTableBodyStyles(), fontSize: 7, cellPadding: 1.5 },
    headStyles: { ...brandTableHeadStyles(), fontSize: 6.5 },
    margin: { left: margin, right: margin },
  });

  y = getFinalY(doc, y + 8);

  if (data.steel.length > 0) {
    if (y > doc.internal.pageSize.getHeight() - 40) {
      doc.addPage();
      y = margin;
    }
    y = drawSectionTitle(doc, "Steel reinforcement", y + 4, margin);
    autoTable(doc, {
      startY: y + 2,
      head: [[
        "SKU",
        "Cut pcs",
        "Net mm",
        "Stock used",
        "New bars",
        "Purchase ft",
        ...(includePricing ? ["Rate/ft", "Amount"] : []),
        "Reusable",
        "Scrap",
      ]],
      body: data.steel.map((row) => [
        row.profileCode,
        String(row.cutPiecesCount),
        String(Math.round(row.netRequiredLengthMm)),
        String(row.inventoryBarsConsumed),
        String(row.newBarsRequired),
        row.purchaseRunningFt.toFixed(2),
        ...(includePricing ? [row.rate.toFixed(2), row.amount.toFixed(2)] : []),
        String(Math.round(row.reusableLeftoverMm)),
        String(Math.round(row.scrapMm)),
      ]),
      styles: { ...brandTableBodyStyles(), fontSize: 7.5 },
      headStyles: brandTableHeadStyles(),
      margin: { left: margin, right: margin },
    });
    y = getFinalY(doc, y + 8);
  }

  doc.addPage();
  y = margin;
  y = drawSectionTitle(doc, "Glass · Mesh · Hardware", y, margin);

  if (data.glass.length > 0) {
    autoTable(doc, {
      startY: y + 2,
      head: [[
        "Product",
        "Qty",
        "Thickness",
        "Pieces",
        "Cut size mm",
        "Cut area sq.ft",
        "Cost area sq.ft",
        ...(includePricing ? ["Rate/sq.ft", "Amount"] : []),
      ]],
      body: data.glass.map((row) => [
        row.productLabel,
        String(row.quantity),
        row.glassThickness,
        String(row.pieceCount),
        `${Math.round(row.cutWidthMm)} × ${Math.round(row.cutHeightMm)}`,
        row.actualCutAreaSqft.toFixed(2),
        row.costingAreaSqft.toFixed(2),
        ...(includePricing
          ? [row.ratePerSqft.toFixed(2), row.amount.toFixed(2)]
          : []),
      ]),
      styles: { ...brandTableBodyStyles(), fontSize: 7.5 },
      headStyles: brandTableHeadStyles(),
      margin: { left: margin, right: margin },
    });
    y = getFinalY(doc, y + 6);
  }

  if (data.mesh.length > 0) {
    autoTable(doc, {
      startY: y + 2,
      head: [[
        "Product",
        "Qty",
        "Mesh size mm",
        "Area sq.ft",
        ...(includePricing ? ["Rate/sq.ft", "Amount"] : []),
      ]],
      body: data.mesh.map((row) => [
        row.productLabel,
        String(row.quantity),
        `${Math.round(row.meshWidthMm)} × ${Math.round(row.meshHeightMm)}`,
        row.meshAreaSqft.toFixed(2),
        ...(includePricing ? [row.ratePerSqft.toFixed(2), row.amount.toFixed(2)] : []),
      ]),
      styles: { ...brandTableBodyStyles(), fontSize: 7.5 },
      headStyles: brandTableHeadStyles(),
      margin: { left: margin, right: margin },
    });
    y = getFinalY(doc, y + 6);
  }

  if (data.hardware.length > 0) {
    autoTable(doc, {
      startY: y + 2,
      head: [[
        "Item",
        "SKU",
        "Qty",
        ...(includePricing ? ["Rate", "Amount"] : ["Unit"]),
        "Purchase req.",
      ]],
      body: data.hardware.map((row) => [
        row.item,
        row.sku,
        String(row.quantity),
        ...(includePricing ? [row.rate.toFixed(2), row.amount.toFixed(2)] : [row.unit]),
        String(row.purchaseRequired),
      ]),
      styles: { ...brandTableBodyStyles(), fontSize: 7.5 },
      headStyles: brandTableHeadStyles(),
      margin: { left: margin, right: margin },
    });
    y = getFinalY(doc, y + 8);
  }

  y = drawSectionTitle(doc, "Purchase summary", y + 4, margin);
  autoTable(doc, {
    startY: y + 2,
    head: [["Section", ...(includePricing ? ["Amount (₹)"] : ["Notes"])]],
    body: [
      ...data.purchaseSummary.map((section) => [
        section.label,
        includePricing ? section.total.toFixed(2) : "Qty per tables above",
      ]),
      ...(includePricing
        ? [["Grand total", data.grandTotal.toFixed(2)]]
        : []),
    ],
    styles: { ...brandTableBodyStyles(), fontSize: 8.5 },
    headStyles: brandTableHeadStyles(),
    margin: { left: margin, right: margin },
  });

  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(...PDF_COLORS.muted);
  doc.text(
    "Bar counts from practical 5800 mm job-level optimizer — same source as Labour Working PDF.",
    margin,
    doc.internal.pageSize.getHeight() - 10,
    { maxWidth: pageWidth - margin * 2 },
  );

  drawBrandFooter(doc, "Material Required — Shivshakti ProERP");
  return doc;
}

export async function exportMaterialRequiredPdf(
  data: MaterialRequiredResult,
  filename: string,
  mode: MaterialRequiredPdfMode = "internal",
): Promise<void> {
  const { savePdfDocument } = await import("@/lib/pdf/save");
  const doc = buildMaterialRequiredPdf(data, mode);
  await savePdfDocument(doc, filename);
}
