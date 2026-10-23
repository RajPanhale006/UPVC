import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { PDFDocument } from "pdf-lib";

import { COMPANY_NAME } from "@/lib/brand";
import { savePdfDocument } from "@/lib/pdf/save";
import {
  brandTableBodyStyles,
  brandTableHeadStyles,
  drawBrandFooter,
  drawBrandHeader,
  drawSectionTitle,
  formatPdfDate,
  PDF_COLORS,
  PDF_MARGIN,
  pdfCreatorName,
} from "@/lib/pdf/theme";
import { embedPreviewInPdf } from "@/lib/preview/pdf-embed";
import type { PdfPreviewRenderResult } from "@/lib/preview/pdf-embed";
import type { ProfileRateSettings } from "@/lib/profiles/types";

import {
  getBearingSteelTrackRatePerFt,
  getSelectedGlassRate,
  getSelectedLockRate,
  HARDWARE_QTY,
  isDoorProduct,
} from "./defaults";
import { getFrameProfileKey } from "./running-feet";
import type { EstimationInputs, EstimationResult, OverheadKey } from "./types";

const METADATA_PREFIX = "UPVCEST:";
const DOCUMENT_VERSION = 1 as const;

export type EstimationDocument = {
  version: typeof DOCUMENT_VERSION;
  exportedAt: string;
  inputs: EstimationInputs;
};

function encode(inputs: EstimationInputs): string {
  const doc: EstimationDocument = {
    version: DOCUMENT_VERSION,
    exportedAt: new Date().toISOString(),
    inputs,
  };
  return METADATA_PREFIX + btoa(unescape(encodeURIComponent(JSON.stringify(doc))));
}

function decode(raw: string | undefined | null): EstimationInputs | null {
  if (!raw || !raw.startsWith(METADATA_PREFIX)) {
    return null;
  }
  try {
    const parsed = JSON.parse(
      decodeURIComponent(escape(atob(raw.slice(METADATA_PREFIX.length)))),
    ) as EstimationDocument;
    if (parsed?.version !== DOCUMENT_VERSION || !parsed.inputs) {
      return null;
    }
    return parsed.inputs;
  } catch {
    return null;
  }
}

/** Use Rs. prefix — Helvetica in jsPDF does not render the rupee symbol reliably. */
function formatAmount(value: number): string {
  const formatted = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return `Rs. ${formatted}`;
}

function formatRate(value: number): string {
  const formatted = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return `Rs. ${formatted} / sqft`;
}

function formatWindowSize(inputs: EstimationInputs, widthMm: number, heightMm: number): string {
  const wFt = inputs.widthFeet;
  const wIn = inputs.widthInches;
  const hFt = inputs.heightFeet;
  const hIn = inputs.heightInches;
  return `${wFt} ft ${wIn} in × ${hFt} ft ${hIn} in  (${widthMm} × ${heightMm} mm)`;
}

function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function buildEstimationFilename(inputs: EstimationInputs): string {
  const customer = slugify(inputs.customerName) || "estimation";
  const date = new Date().toISOString().slice(0, 10);
  return `${customer}-${date}.pdf`;
}

export function buildCostBreakdownFilename(inputs: EstimationInputs): string {
  const customer = slugify(inputs.customerName) || "cost-sheet";
  const date = new Date().toISOString().slice(0, 10);
  return `${customer}-cost-${date}.pdf`;
}

const OVERHEAD_LABELS: Record<OverheadKey, string> = {
  transportation: "Transportation",
  electricity: "Electricity",
  maintenance: "Maintenance",
  depreciation: "Depreciation",
  otherExp: "Other expenses",
  rentFixedCost: "Rent (fixed)",
};

function getFinalY(doc: jsPDF, fallback: number): number {
  return (
    (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? fallback
  );
}

function embedEstimationMetadata(doc: jsPDF, inputs: EstimationInputs): void {
  const encoded = encode(inputs);
  doc.setProperties({
    title: `${inputs.customerName || "Quotation"} - ${COMPANY_NAME}`,
    subject: encoded,
    keywords: encoded,
    creator: pdfCreatorName(),
  });
}

function addDocumentHeader(
  doc: jsPDF,
  title: string,
  inputs: EstimationInputs,
  trackLabel: string,
  margin: number,
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = drawBrandHeader(doc, {
    docTitle: title,
    rightLabel: formatPdfDate(),
    margin,
  });

  if (inputs.customerName || inputs.location) {
    autoTable(doc, {
      startY: y,
      theme: "plain",
      styles: brandTableBodyStyles(),
      body: [
        ...(inputs.customerName ? [["Customer", inputs.customerName]] : []),
        ...(inputs.location ? [["Location", inputs.location]] : []),
        ["Track", trackLabel],
      ],
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 38, fillColor: PDF_COLORS.lightBg },
        1: { cellWidth: pageWidth - margin * 2 - 38 },
      },
      margin: { left: margin, right: margin },
    });
    y = getFinalY(doc, y + 16) + 4;
  } else {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Track: ${trackLabel}`, margin, y);
    y += 8;
  }

  return y;
}

function addQuotationSummaryTable(
  doc: jsPDF,
  result: EstimationResult,
  startY: number,
  margin: number,
): number {
  const inputs = result.inputs;
  const selected = result.selectedTrack;
  const qty = selected.numberOfWindows;
  const pageWidth = doc.internal.pageSize.getWidth();

  autoTable(doc, {
    startY,
    theme: "plain",
    styles: brandTableBodyStyles(),
    body: [
      ["Window Size", formatWindowSize(inputs, selected.widthMm, selected.heightMm)],
      ["Area (per window)", `${selected.areaSqft} sqft`],
      ["No. of Windows", String(qty)],
    ],
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 45, fillColor: PDF_COLORS.lightBg },
      1: { cellWidth: pageWidth - margin * 2 - 45 },
    },
    margin: { left: margin, right: margin },
  });

  let cursor = getFinalY(doc, startY + 20) + 8;

  const workshopTotal = qty > 1 ? selected.orderWorkshopTotal : selected.workshopTotal;
  const profitTotal =
    qty > 1 ? selected.profitAmount * qty : selected.profitAmount;
  const customerRateTotal =
    qty > 1
      ? selected.baseRatePerSqftAfterProfit * selected.areaSqft * qty
      : selected.baseRatePerSqftAfterProfit * selected.areaSqft;
  const gstTotal = qty > 1 ? selected.orderGstAmount : selected.totalGstAmount;
  const withGstTotal =
    qty > 1 ? selected.orderFinalAmountWithGst : selected.finalAmountWithGst;
  const withoutGstTotal =
    qty > 1 ? selected.orderFinalAmountWithoutGst : selected.finalAmountWithoutGst;

  cursor = drawSectionTitle(doc, "Customer Quotation", cursor, margin);

  autoTable(doc, {
    startY: cursor + 2,
    head: [["Particular", "Amount", "Rate / Sqft"]],
    body: [
      [
        "Workshop Cost",
        formatAmount(workshopTotal),
        formatRate(selected.costPerSqft),
      ],
      [
        `Profit (${inputs.profitMarginPercent}%)`,
        formatAmount(profitTotal),
        formatRate(selected.profitPerSqft),
      ],
      [
        "Customer Rate",
        formatAmount(customerRateTotal),
        formatRate(selected.baseRatePerSqftAfterProfit),
      ],
      [
        `GST (${inputs.gstPercent}%)`,
        formatAmount(gstTotal),
        formatRate(selected.gstPerSqft),
      ],
      [
        "With GST Bill",
        formatAmount(withGstTotal),
        formatRate(selected.ratePerSqftWithGst),
      ],
      [
        "Without GST Bill",
        formatAmount(withoutGstTotal),
        formatRate(selected.ratePerSqftWithoutGst),
      ],
    ],
    styles: brandTableBodyStyles(),
    headStyles: brandTableHeadStyles(),
    alternateRowStyles: { fillColor: PDF_COLORS.lightBg },
    columnStyles: {
      0: { cellWidth: 55 },
      1: { cellWidth: 55, halign: "right", fontStyle: "bold", textColor: PDF_COLORS.primaryDark },
      2: { cellWidth: 55, halign: "right" },
    },
    didParseCell(data) {
      if (data.section === "body" && (data.row.index === 4 || data.row.index === 5)) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor =
          data.row.index === 4 ? PDF_COLORS.highlightBg : PDF_COLORS.lightBg;
        data.cell.styles.textColor = PDF_COLORS.primaryDark;
      }
    },
    margin: { left: margin, right: margin },
  });

  cursor = getFinalY(doc, cursor) + 4;

  if (qty > 1) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...PDF_COLORS.muted);
    doc.text(
      `Quotation amounts are for ${qty} windows of the same size.`,
      margin,
      cursor,
    );
    doc.setTextColor(...PDF_COLORS.text);
    cursor += 6;
  }

  return cursor;
}

export function buildEstimationPdf(result: EstimationResult): jsPDF {
  const inputs = result.inputs;
  const selected = result.selectedTrack;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = PDF_MARGIN;

  let y = addDocumentHeader(
    doc,
    "Window Quotation",
    inputs,
    selected.trackLabel,
    margin,
  );

  y = addQuotationSummaryTable(doc, result, y, margin);

  drawBrandFooter(doc, `${COMPANY_NAME} — UPVC estimation & quotation`, margin);

  embedEstimationMetadata(doc, inputs);
  return doc;
}

export async function exportEstimationPdf(
  result: EstimationResult,
): Promise<void> {
  const doc = buildEstimationPdf(result);
  await savePdfDocument(doc, buildEstimationFilename(result.inputs));
}

export function buildEstimationCostBreakdownPdf(
  result: EstimationResult,
  profileRates: ProfileRateSettings,
  preview?: PdfPreviewRenderResult | null,
): jsPDF {
  const inputs = result.inputs;
  const selected = result.selectedTrack;
  const qty = selected.numberOfWindows;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = PDF_MARGIN;
  const pageWidth = doc.internal.pageSize.getWidth();
  const hardware = HARDWARE_QTY[inputs.trackSystemId];
  const wastageFactor = 1 + inputs.wastagePercent / 100;
  const rf = selected.runningFeet;
  const profileMap = new Map(
    profileRates.profiles.map((profile) => [profile.key, profile]),
  );
  const frameProfile = profileMap.get(getFrameProfileKey(inputs.trackSystemId));
  const sashProfile = profileMap.get("sash");
  const interlockProfile = profileMap.get("interlock");
  const beadingProfile = profileMap.get("beading");
  const glassRate = getSelectedGlassRate(inputs);
  const lockRate = getSelectedLockRate(inputs);
  const jaaliAmount = selected.materials.find((m) => m.key === "jaali")?.amount ?? 0;
  const jaaliSqft =
    jaaliAmount > 0 && inputs.jaaliRatePerSqft > 0
      ? Math.round((jaaliAmount / inputs.jaaliRatePerSqft) * 100) / 100
      : null;

  let y = addDocumentHeader(
    doc,
    "Cost Calculation Sheet",
    inputs,
    selected.trackLabel,
    margin,
  );

  const diagramWidth = 58;
  const diagramHeight = 44;
  const diagramX = pageWidth - margin - diagramWidth;
  const metaStartY = y;

  embedPreviewInPdf(doc, preview ?? null, diagramX, metaStartY, diagramWidth, diagramHeight);

  autoTable(doc, {
    startY: metaStartY,
    theme: "plain",
    styles: brandTableBodyStyles(),
    body: [
      ["Window Size", formatWindowSize(inputs, selected.widthMm, selected.heightMm)],
      ["Area (per window)", `${selected.areaSqft} sqft`],
      ["No. of Windows", String(qty)],
      ["Lock type", inputs.lockType],
      ["Glass", inputs.glassSize],
    ],
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 45, fillColor: PDF_COLORS.lightBg },
      1: { cellWidth: pageWidth - margin * 2 - 45 - diagramWidth - 6 },
    },
    margin: { left: margin, right: margin + diagramWidth + 6 },
  });

  y = getFinalY(doc, y + 24) + 6;

  y = drawSectionTitle(doc, "Rates Used", y, margin);

  autoTable(doc, {
    startY: y + 2,
    head: [["Item", "Rate"]],
    body: [
      ["Profile rate", `Rs. ${inputs.profileRatePerKg.toFixed(2)} / kg`],
      ["Wastage", `${inputs.wastagePercent}%`],
      ["Frame profile", `Rs. ${(frameProfile?.ratePerFt ?? 0).toFixed(2)} / ft`],
      ["Sash profile", `Rs. ${(sashProfile?.ratePerFt ?? 0).toFixed(2)} / ft`],
      ["Interlock profile", `Rs. ${(interlockProfile?.ratePerFt ?? 0).toFixed(2)} / ft`],
      ["Beading profile", `Rs. ${(beadingProfile?.ratePerFt ?? 0).toFixed(2)} / ft`],
      ["Steel reinforcement", `Rs. ${inputs.steelReinforcementRatePerFt.toFixed(2)} / ft`],
      [`Glass (${inputs.glassSize})`, `Rs. ${glassRate.toFixed(2)} / sqft`],
      [`Lock (${inputs.lockType})`, `Rs. ${lockRate.toFixed(2)} / piece`],
      ["Screw", `Rs. ${inputs.screwRatePerWindow.toFixed(2)} / window`],
      [
        "Other hardware",
        `Rs. ${inputs.otherHardwareCostPerWindow.toFixed(2)} / window`,
      ],
      ["Brush rubber", `Rs. ${inputs.brushRubberRatePerFt.toFixed(2)} / ft`],
      ["Jaali / net", `Rs. ${inputs.jaaliRatePerSqft.toFixed(2)} / sqft`],
      ["Bearing steel track", `Rs. ${getBearingSteelTrackRatePerFt(inputs).toFixed(2)} / ft`],
      ["Labour", `Rs. ${inputs.labourRatePerSqft.toFixed(2)} / sqft`],
      ...(
        Object.entries(OVERHEAD_LABELS) as [OverheadKey, string][]
      ).map(([key, label]) => [
        label,
        `Rs. ${inputs.overheads[key].toFixed(2)} / window`,
      ]),
      ["Profit margin", `${inputs.profitMarginPercent}%`],
      ["GST", `${inputs.gstPercent}%`],
      ["Without GST loading", `${inputs.withoutGstLoadingPercent}%`],
    ],
    styles: brandTableBodyStyles(),
    headStyles: brandTableHeadStyles(),
    alternateRowStyles: { fillColor: PDF_COLORS.lightBg },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: pageWidth - margin * 2 - 70, halign: "right" },
    },
    margin: { left: margin, right: margin },
  });

  y = getFinalY(doc, y) + 8;

  y = drawSectionTitle(doc, "Material Cost (per window)", y, margin);

  const frameFt = rf.frameFt * wastageFactor;
  const sashFt = rf.sashFt * wastageFactor;
  const interlockFt = rf.interlockFt * wastageFactor;
  const beadingFt = rf.beadingFt * wastageFactor;
  const steelFt = rf.steelFt * wastageFactor;
  const frameRate = frameProfile?.ratePerFt ?? 0;
  const sashRate = sashProfile?.ratePerFt ?? 0;
  const interlockRate = interlockProfile?.ratePerFt ?? 0;
  const beadingRate = beadingProfile?.ratePerFt ?? 0;

  autoTable(doc, {
    startY: y + 2,
    head: [["Component", "Qty / Basis", "Rate", "Amount"]],
    body: [
      ...[
        ["Frame UPVC", `${frameFt.toFixed(2)} ft`, `Rs. ${frameRate.toFixed(2)} / ft`, frameFt * frameRate],
        ["Sash UPVC", `${sashFt.toFixed(2)} ft`, `Rs. ${sashRate.toFixed(2)} / ft`, sashFt * sashRate],
        ["Interlock UPVC", `${interlockFt.toFixed(2)} ft`, `Rs. ${interlockRate.toFixed(2)} / ft`, interlockFt * interlockRate],
        ["Beading UPVC", `${beadingFt.toFixed(2)} ft`, `Rs. ${beadingRate.toFixed(2)} / ft`, beadingFt * beadingRate],
        [
          "Steel reinforcement",
          `${steelFt.toFixed(2)} ft`,
          `Rs. ${inputs.steelReinforcementRatePerFt.toFixed(2)} / ft`,
          steelFt * inputs.steelReinforcementRatePerFt,
        ],
      ].map(([label, qtyBasis, rate, amount]) => [
        label,
        qtyBasis,
        rate,
        formatAmount(Math.round((amount as number) * 100) / 100),
      ]),
      [
        "Glass",
        `${selected.areaSqft} sqft`,
        `Rs. ${glassRate.toFixed(2)} / sqft`,
        formatAmount(selected.materials.find((m) => m.key === "glass")?.amount ?? 0),
      ],
      [
        "Bearing",
        `${hardware.bearingQty} pcs`,
        `Rs. ${inputs.bearingRatePerPiece.toFixed(2)} / pc`,
        formatAmount(selected.materials.find((m) => m.key === "bearing")?.amount ?? 0),
      ],
      [
        "Lock",
        `${hardware.lockQty} pcs`,
        `Rs. ${lockRate.toFixed(2)} / pc`,
        formatAmount(selected.materials.find((m) => m.key === "lock")?.amount ?? 0),
      ],
      [
        "Screw",
        "1 window",
        `Rs. ${inputs.screwRatePerWindow.toFixed(2)} / window`,
        formatAmount(selected.materials.find((m) => m.key === "screw")?.amount ?? 0),
      ],
      [
        "Other hardware",
        "1 window",
        `Rs. ${inputs.otherHardwareCostPerWindow.toFixed(2)} / window`,
        formatAmount(
          selected.materials.find((m) => m.key === "other-hardware")?.amount ?? 0,
        ),
      ],
      [
        "Brush rubber",
        `${rf.perimeterFt.toFixed(2)} ft`,
        `Rs. ${inputs.brushRubberRatePerFt.toFixed(2)} / ft`,
        formatAmount(selected.materials.find((m) => m.key === "brush-rubber")?.amount ?? 0),
      ],
      [
        "Jaali / net",
        jaaliSqft != null ? `${jaaliSqft} sqft (mesh panel)` : "N/A",
        `Rs. ${inputs.jaaliRatePerSqft.toFixed(2)} / sqft`,
        formatAmount(jaaliAmount),
      ],
      [
        "Bearing steel track",
        `${rf.bearingSteelTrackFt.toFixed(2)} ft`,
        `Rs. ${getBearingSteelTrackRatePerFt(inputs).toFixed(2)} / ft`,
        formatAmount(
          selected.materials.find((m) => m.key === "bearing-steel-track")?.amount ?? 0,
        ),
      ],
      [
        { content: "Material total", colSpan: 3, styles: { fontStyle: "bold" } },
        formatAmount(selected.materialTotal),
      ],
    ],
    styles: brandTableBodyStyles(),
    headStyles: brandTableHeadStyles(),
    alternateRowStyles: { fillColor: PDF_COLORS.lightBg },
    columnStyles: {
      0: { cellWidth: 42 },
      1: { cellWidth: 38 },
      2: { cellWidth: 42 },
      3: { cellWidth: 38, halign: "right", fontStyle: "bold", textColor: PDF_COLORS.primaryDark },
    },
    margin: { left: margin, right: margin },
  });

  if (isDoorProduct(inputs) && selected.doorHardwareItems?.length) {
    y = getFinalY(doc, y) + 8;
    y = drawSectionTitle(doc, "Door Hardware Cost", y, margin);

    autoTable(doc, {
      startY: y + 2,
      head: [["Hardware", "Specification", "Qty", "Unit Rate", "Total"]],
      body: [
        ...selected.doorHardwareItems.map((item) => [
          item.name,
          item.specification ?? "—",
          String(item.quantity),
          item.isRateMissing ? "—" : `Rs. ${(item.unitRate ?? 0).toFixed(2)}`,
          item.isRateMissing ? "—" : formatAmount(item.totalCost ?? 0),
        ]),
        [
          {
            content: "Total Door Hardware Cost",
            colSpan: 4,
            styles: { fontStyle: "bold" },
          },
          formatAmount(selected.totalDoorHardwareCost ?? 0),
        ],
      ],
      styles: brandTableBodyStyles(),
      headStyles: brandTableHeadStyles(),
      alternateRowStyles: { fillColor: PDF_COLORS.lightBg },
      columnStyles: {
        0: { cellWidth: 38 },
        1: { cellWidth: 42 },
        2: { cellWidth: 18, halign: "right" },
        3: { cellWidth: 32, halign: "right" },
        4: { cellWidth: 32, halign: "right", fontStyle: "bold", textColor: PDF_COLORS.primaryDark },
      },
      margin: { left: margin, right: margin },
    });

    y = getFinalY(doc, y) + 8;
  } else {
    y = getFinalY(doc, y) + 8;
  }

  y = drawSectionTitle(doc, "Labour & Overheads (per window)", y, margin);

  autoTable(doc, {
    startY: y + 2,
    head: [["Item", "Qty / Basis", "Rate", "Amount"]],
    body: [
      [
        "Labour",
        `${selected.areaSqft} sqft`,
        `Rs. ${inputs.labourRatePerSqft.toFixed(2)} / sqft`,
        formatAmount(selected.labourTotal),
      ],
      ...(
        Object.entries(OVERHEAD_LABELS) as [OverheadKey, string][]
      ).map(([key, label]) => [
        label,
        "1 window",
        `Rs. ${inputs.overheads[key].toFixed(2)} / window`,
        formatAmount(inputs.overheads[key]),
      ]),
      [
        { content: "Overhead total", colSpan: 3, styles: { fontStyle: "bold" } },
        formatAmount(selected.overheadTotal),
      ],
    ],
    styles: brandTableBodyStyles(),
    headStyles: brandTableHeadStyles(),
    alternateRowStyles: { fillColor: PDF_COLORS.lightBg },
    columnStyles: {
      0: { cellWidth: 42 },
      1: { cellWidth: 38 },
      2: { cellWidth: 42 },
      3: { cellWidth: 38, halign: "right", fontStyle: "bold", textColor: PDF_COLORS.primaryDark },
    },
    margin: { left: margin, right: margin },
  });

  y = getFinalY(doc, y) + 8;

  y = drawSectionTitle(doc, "Running Feet Summary", y, margin);

  autoTable(doc, {
    startY: y + 2,
    head: [["Part", "Feet (raw)", "With wastage"]],
    body: [
      ["Frame", rf.frameFt.toFixed(2), rf.frameFtWithWastage.toFixed(2)],
      ["Sash", rf.sashFt.toFixed(2), rf.sashFtWithWastage.toFixed(2)],
      ...(rf.screenSashFt > 0
        ? [
            [
              "Net sash",
              rf.screenSashFt.toFixed(2),
              rf.screenSashFtWithWastage.toFixed(2),
            ],
          ]
        : []),
      ["Interlock", rf.interlockFt.toFixed(2), rf.interlockFtWithWastage.toFixed(2)],
      ["Beading", rf.beadingFt.toFixed(2), rf.beadingFtWithWastage.toFixed(2)],
      ["Steel", rf.steelFt.toFixed(2), `${(rf.steelFt * wastageFactor).toFixed(2)}`],
      ["Total UPVC", rf.totalUpvcFt.toFixed(2), rf.totalUpvcFtWithWastage.toFixed(2)],
      ["Perimeter", rf.perimeterFt.toFixed(2), "—"],
    ],
    styles: brandTableBodyStyles(),
    headStyles: brandTableHeadStyles(),
    alternateRowStyles: { fillColor: PDF_COLORS.lightBg },
    margin: { left: margin, right: margin },
  });

  y = getFinalY(doc, y) + 8;

  y = drawSectionTitle(doc, "Workshop Totals", y, margin);

  const customerBaseRows: [string, string][] = selected.customerBasePriceAvailable
    ? [
        [
          `Standard margin (${selected.customerBaseMarginPercent}%)`,
          formatAmount(selected.customerBaseMarginAmount),
        ],
        [
          "Suggested Customer Base Price",
          formatAmount(selected.suggestedCustomerBasePrice),
        ],
        ...(selected.customerRateAvailable
          ? [
              [
                "Suggested Customer Rate per Sq.ft",
                formatRate(selected.suggestedCustomerRatePerSqFt),
              ] as [string, string],
            ]
          : []),
      ]
    : [];

  const perWindowRows: [string, string][] = [
    ["Material total", formatAmount(selected.materialTotal)],
    ["Labour", formatAmount(selected.labourTotal)],
    ["Overheads", formatAmount(selected.overheadTotal)],
    ["Workshop total", formatAmount(selected.workshopTotal)],
    ["Cost / sqft", formatRate(selected.costPerSqft)],
    ...customerBaseRows,
  ];

  const orderCustomerBaseRows: [string, string][] =
    qty > 1 && selected.customerBasePriceAvailable
      ? [
          [
            `Margin (${selected.customerBaseMarginPercent}%) × qty`,
            formatAmount(selected.orderCustomerBaseMarginAmount),
          ],
          [
            "Suggested Customer Base Price × qty",
            formatAmount(selected.orderSuggestedCustomerBasePrice),
          ],
        ]
      : [];

  const orderRows: [string, string][] =
    qty > 1
      ? [
          ["Workshop total × qty", formatAmount(selected.orderWorkshopTotal)],
          ...orderCustomerBaseRows,
          ["GST total × qty", formatAmount(selected.orderGstAmount)],
          ["Final with GST × qty", formatAmount(selected.orderFinalAmountWithGst)],
          [
            "Final without GST × qty",
            formatAmount(selected.orderFinalAmountWithoutGst),
          ],
        ]
      : [];

  autoTable(doc, {
    startY: y + 2,
    head: [["Summary", "Per window", ...(qty > 1 ? ["Order total"] : [])]],
    body: [
      ...perWindowRows.map(([label, perWindow]) => [
        label,
        perWindow,
        ...(qty > 1
          ? [
              label === "Material total"
                ? formatAmount(selected.materialTotal * qty)
                : label === "Labour"
                  ? formatAmount(selected.labourTotal * qty)
                  : label === "Overheads"
                    ? formatAmount(selected.overheadTotal * qty)
                    : label === "Workshop total"
                      ? formatAmount(selected.orderWorkshopTotal)
                      : formatRate(selected.costPerSqft),
            ]
          : []),
      ]),
      ...(qty > 1
        ? orderRows.map(([label, amount]) => [label, "—", amount])
        : []),
    ],
    styles: brandTableBodyStyles(),
    headStyles: brandTableHeadStyles(),
    alternateRowStyles: { fillColor: PDF_COLORS.lightBg },
    columnStyles: {
      0: { cellWidth: 55 },
      1: { cellWidth: 50, halign: "right", fontStyle: "bold", textColor: PDF_COLORS.primaryDark },
      ...(qty > 1 ? { 2: { cellWidth: 50, halign: "right", fontStyle: "bold", textColor: PDF_COLORS.primaryDark } } : {}),
    },
    margin: { left: margin, right: margin },
  });

  y = getFinalY(doc, y) + 12;

  if (y > doc.internal.pageSize.getHeight() - 80) {
    doc.addPage();
    y = drawBrandHeader(doc, {
      docTitle: "Cost Calculation Sheet",
      docSubtitle: "— continued",
      margin,
    });
  }

  y = addQuotationSummaryTable(doc, result, y, margin);

  drawBrandFooter(
    doc,
    `${COMPANY_NAME} — internal cost calculation sheet`,
    margin,
  );

  embedEstimationMetadata(doc, inputs);
  return doc;
}

export async function buildEstimationCostBreakdownPdfAsync(
  result: EstimationResult,
  profileRates: ProfileRateSettings,
): Promise<jsPDF> {
  const { buildPreviewDataFromEstimation } = await import(
    "@/components/product-preview/preview-mapper"
  );
  const { renderProductPreviewForPdf } = await import("@/lib/preview/render-preview-image");
  const preview = await renderProductPreviewForPdf(
    buildPreviewDataFromEstimation(result.inputs),
    { pixelWidth: 420, mode: "compact" },
  );
  return buildEstimationCostBreakdownPdf(result, profileRates, preview);
}

export async function exportEstimationCostBreakdownPdf(
  result: EstimationResult,
  profileRates: ProfileRateSettings,
): Promise<void> {
  const doc = await buildEstimationCostBreakdownPdfAsync(result, profileRates);
  await savePdfDocument(doc, buildCostBreakdownFilename(result.inputs));
}

export async function importEstimationPdf(
  file: File,
): Promise<EstimationInputs> {
  const bytes = await file.arrayBuffer();
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });

  const fromSubject = decode(pdf.getSubject() ?? undefined);
  if (fromSubject) {
    return fromSubject;
  }

  const fromKeywords = decode(pdf.getKeywords() ?? undefined);
  if (fromKeywords) {
    return fromKeywords;
  }

  throw new Error(
    "This PDF was not exported from Shivshakti Enterprises. Export a quotation from this app first, then import it here.",
  );
}
