import { mmAreaToSqFt } from "@/lib/calculations/format";
import { GST_PERCENT, shouldApplyGstInTotal, WINDOW_TYPE_LABELS, WINDOW_TYPE_ORDER } from "./defaults";
import type {
  CalculatedWindowRow,
  DimensionUnit,
  GstMode,
  QuotationForm,
  QuotationResult,
  QuotationTotals,
  QuotationWindowRow,
  WindowTypeGroup,
  WindowTypeId,
} from "./types";

const INCH_TO_SQFT_DIVISOR = 144;

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Convert length × height to area in square feet for the given unit. */
export function calculateAreaSqFt(
  length: number,
  height: number,
  unit: DimensionUnit,
): number {
  if (!Number.isFinite(length) || !Number.isFinite(height) || length <= 0 || height <= 0) {
    return 0;
  }

  switch (unit) {
    case "feet":
      return round2(length * height);
    case "inch":
      return round2((length * height) / INCH_TO_SQFT_DIVISOR);
    case "mm":
      return mmAreaToSqFt(length, height);
    default:
      return 0;
  }
}

export function calculateRowAmount(
  areaSqFt: number,
  quantity: number,
  ratePerSqFt: number,
): number {
  if (areaSqFt <= 0 || quantity <= 0 || ratePerSqFt < 0) {
    return 0;
  }
  return round2(areaSqFt * quantity * ratePerSqFt);
}

export function calculateWindowRow(row: QuotationWindowRow): CalculatedWindowRow {
  const areaSqFt = calculateAreaSqFt(row.length, row.height, row.unit);
  const amount = calculateRowAmount(areaSqFt, row.quantity, row.ratePerSqFt);

  return {
    ...row,
    areaSqFt,
    amount,
  };
}

export function calculateGstAmount(subtotal: number, gstMode: GstMode): number {
  if (!shouldApplyGstInTotal(gstMode) || subtotal <= 0) {
    return 0;
  }
  return round2(subtotal * (GST_PERCENT / 100));
}

export function calculateGrandTotal(subtotal: number, gstAmount: number): number {
  return round2(subtotal + gstAmount);
}

export function groupRowsByWindowType(
  rows: CalculatedWindowRow[],
): WindowTypeGroup[] {
  const grouped = new Map<WindowTypeId, CalculatedWindowRow[]>();

  for (const row of rows) {
    const existing = grouped.get(row.windowType) ?? [];
    existing.push(row);
    grouped.set(row.windowType, existing);
  }

  return WINDOW_TYPE_ORDER.filter((type) => grouped.has(type)).map((windowType) => {
    const typeRows = grouped.get(windowType) ?? [];
    const subtotal = round2(typeRows.reduce((sum, row) => sum + row.amount, 0));

    return {
      windowType,
      label: WINDOW_TYPE_LABELS[windowType],
      rows: typeRows,
      subtotal,
    };
  });
}

export function calculateQuotationTotals(
  groups: WindowTypeGroup[],
  gstMode: GstMode,
  transportationCharge = 0,
  customChargesTotal = 0,
  discountPercent = 0,
): QuotationTotals {
  const windowsSubtotal = round2(
    groups.reduce((sum, group) => sum + group.subtotal, 0),
  );
  const transport = round2(Math.max(0, transportationCharge));
  const extras = round2(Math.max(0, customChargesTotal));
  const beforeDiscount = round2(windowsSubtotal + transport + extras);
  const discount = round2(
    beforeDiscount * (Math.min(100, Math.max(0, discountPercent)) / 100),
  );
  const subtotalBeforeGst = round2(beforeDiscount - discount);
  const gstAmount = calculateGstAmount(subtotalBeforeGst, gstMode);
  const grandTotal = calculateGrandTotal(subtotalBeforeGst, gstAmount);

  return {
    windowsSubtotal,
    transportationCharge: transport,
    customChargesTotal: extras,
    discountPercent: discountPercent > 0 ? discountPercent : undefined,
    discountAmount: discount > 0 ? discount : undefined,
    subtotalBeforeGst,
    gstPercent: GST_PERCENT,
    gstAmount,
    grandTotal,
  };
}

export function calculateQuotation(form: QuotationForm): QuotationResult {
  const calculatedRows = form.windows.map(calculateWindowRow);
  const groups = groupRowsByWindowType(calculatedRows);
  const customChargesTotal = round2(
    (form.customCharges ?? []).reduce((sum, charge) => sum + Math.max(0, charge.amount), 0),
  );
  const totals = calculateQuotationTotals(
    groups,
    form.gstMode,
    form.transportationCharge,
    customChargesTotal,
    form.discountPercent ?? 0,
  );

  return {
    form,
    groups,
    totals,
  };
}

export type QuotationAreaSummary = {
  totalSqFt: number;
  averageRatePerSqFt: number;
  windowsSubtotal: number;
};

/** Total window area and weighted average customer rate for summary / PDF footer. */
export function computeQuotationAreaSummary(result: QuotationResult): QuotationAreaSummary {
  const rows = result.groups.flatMap((group) => group.rows);
  const totalSqFt = round2(
    rows.reduce((sum, row) => sum + row.areaSqFt * row.quantity, 0),
  );
  const windowsSubtotal = result.totals.windowsSubtotal;
  const averageRatePerSqFt =
    totalSqFt > 0 ? round2(windowsSubtotal / totalSqFt) : 0;

  return {
    totalSqFt,
    averageRatePerSqFt,
    windowsSubtotal,
  };
}
