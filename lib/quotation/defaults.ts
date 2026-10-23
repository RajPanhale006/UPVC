import { generateQuotationId } from "@/lib/jobs/id-generator";

import type { GstMode, PdfPageMode, QuotationForm, QuotationWindowRow, WindowTypeId } from "./types";

export const GST_PERCENT = 18;

export const GST_MODE_LABELS: Record<GstMode, string> = {
  apply: `Apply ${GST_PERCENT}% GST in total`,
  exclude: "Quotation only — no GST",
  "terms-only": "GST compliance in terms only",
};

export function shouldApplyGstInTotal(gstMode: GstMode): boolean {
  return gstMode === "apply";
}

export function getGstTermsLine(gstMode: GstMode): string | null {
  if (gstMode === "terms-only") {
    return "GST as applicable shall be charged extra as per prevailing tax laws.";
  }
  return null;
}

export const PDF_PAGE_MODE_LABELS: Record<PdfPageMode, string> = {
  single: "Fit on 1 page (compact print)",
  dual: "Allow up to 2 pages",
};

export const WINDOW_TYPE_LABELS: Record<WindowTypeId, string> = {
  "2-track-upvc": "2 Track (2 Glass)",
  "2.5-track-upvc": "2.5 Track (2 Glass + 1 Net)",
  "3-track-upvc": "3 Track (2 Glass + 1 Net)",
  "openable-single-glass": "Lowers / Openable Glass",
  "fixed-glass": "Fixed Glass",
  "fixed-upvc-partition": "Fixed Frame",
  "upvc-door": "UPVC Door",
};

/** Display order for grouped quotation tables. */
export const WINDOW_TYPE_ORDER: WindowTypeId[] = [
  "2-track-upvc",
  "2.5-track-upvc",
  "3-track-upvc",
  "openable-single-glass",
  "fixed-glass",
  "fixed-upvc-partition",
  "upvc-door",
];

export const DEFAULT_RATES: Record<WindowTypeId, number> = {
  "2-track-upvc": 470,
  "2.5-track-upvc": 535,
  "3-track-upvc": 600,
  "openable-single-glass": 750,
  "fixed-glass": 650,
  "fixed-upvc-partition": 550,
  "upvc-door": 850,
};

export const UNIT_LABELS = {
  feet: "Feet",
  inch: "Inch",
  mm: "MM",
} as const;

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function createRowId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `row-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createWindowRow(
  windowType: WindowTypeId = "3-track-upvc",
): QuotationWindowRow {
  return {
    id: createRowId(),
    windowType,
    length: 4,
    height: 4,
    unit: "feet",
    quantity: 1,
    ratePerSqFt: DEFAULT_RATES[windowType],
  };
}

export function getDefaultQuotationForm(): QuotationForm {
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + 15);

  return {
    customerName: "",
    customerAddress: "",
    customerPhone: "",
    quotationDate: todayIsoDate(),
    subject: "Quotation for UPVC windows",
    gstMode: "terms-only",
    pdfPageMode: "single",
    transportationCharge: 0,
    windows: [createWindowRow()],
    quotationId: generateQuotationId(),
    revision: 1,
    status: "draft",
    validUntil: validUntil.toISOString().slice(0, 10),
    customCharges: [],
  };
}

export function getDefaultRateForType(windowType: WindowTypeId): number {
  return DEFAULT_RATES[windowType];
}
