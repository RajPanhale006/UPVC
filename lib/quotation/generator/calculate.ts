import { round2 } from "@/lib/quotation/calculate";

import { getProductTypeLabel } from "./product-types";
import type {
  CalculatedQuotationItem,
  QuotationGeneratorInput,
  QuotationItemInput,
  QuotationPricingMode,
  QuotationSizeUnit,
  QuotationSummary,
} from "./types";

function formatDimension(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, "");
}

function unitSuffix(unit: QuotationSizeUnit): string {
  switch (unit) {
    case "mm":
      return "mm";
    case "inch":
      return "in";
    case "feet":
      return "ft";
  }
}

export function buildItemDescription(item: QuotationItemInput): string {
  if (item.description?.trim()) return item.description.trim();

  const label = getProductTypeLabel(item.productType);
  const w = formatDimension(item.width);
  const h = formatDimension(item.height);
  const u = unitSuffix(item.unit);
  const qty = Math.max(1, item.quantity);

  if ((item.pricingMode ?? "sqft") === "piece") {
    return `${label} — ${w} × ${h} ${u} (${qty} no.)`;
  }

  return `${label} — ${w} × ${h} ${u} (${qty} no.)`;
}

/** Area in square feet from width × height for the given unit. */
export function calculateItemArea(
  width: number,
  height: number,
  unit: QuotationSizeUnit,
): number {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return 0;
  }

  switch (unit) {
    case "mm":
      return round2((width / 304.8) * (height / 304.8));
    case "inch":
      return round2((width / 12) * (height / 12));
    case "feet":
      return round2(width * height);
    default:
      return 0;
  }
}

export function resolvePricingMode(item: QuotationItemInput): QuotationPricingMode {
  return item.pricingMode ?? "sqft";
}

/** Line amount — sq.ft items: area × qty × rate; piece items: qty × rate. */
export function calculateItemAmount(input: {
  areaSqFt: number;
  quantity: number;
  rate: number;
  pricingMode: QuotationPricingMode;
}): number {
  const qty = Math.max(1, input.quantity);
  const rate = Math.max(0, input.rate);

  if (input.pricingMode === "piece") {
    return round2(qty * rate);
  }

  if (input.areaSqFt <= 0 || rate <= 0) return 0;
  return round2(input.areaSqFt * qty * rate);
}

export function calculateQuotationItem(
  item: QuotationItemInput,
  index: number,
): CalculatedQuotationItem {
  const pricingMode = resolvePricingMode(item);
  const areaSqFt =
    pricingMode === "piece" ? 0 : calculateItemArea(item.width, item.height, item.unit);
  const amount = calculateItemAmount({
    areaSqFt,
    quantity: item.quantity,
    rate: item.rate,
    pricingMode,
  });

  return {
    ...item,
    id: item.id ?? `item-${index + 1}`,
    pricingMode,
    areaSqFt,
    amount,
    description: buildItemDescription(item),
  };
}

export function calculateQuotationSummary(input: QuotationGeneratorInput): QuotationSummary {
  const items = input.items.map(calculateQuotationItem);

  const sqftRows = items.filter((item) => item.pricingMode === "sqft");
  const totalAreaSqFt = round2(
    sqftRows.reduce((sum, item) => sum + item.areaSqFt * Math.max(1, item.quantity), 0),
  );
  const sqftSubtotal = round2(sqftRows.reduce((sum, item) => sum + item.amount, 0));
  const pieceSubtotal = round2(
    items.filter((item) => item.pricingMode === "piece").reduce((sum, item) => sum + item.amount, 0),
  );
  const itemsSubtotal = round2(sqftSubtotal + pieceSubtotal);

  const averageRatePerSqFt =
    totalAreaSqFt > 0 ? round2(sqftSubtotal / totalAreaSqFt) : 0;

  const transportationCharge = round2(Math.max(0, input.transportationCharge ?? 0));
  const extraChargesTotal = round2(
    (input.extraCharges ?? []).reduce((sum, charge) => sum + Math.max(0, charge.amount), 0),
  );

  const beforeDiscount = round2(itemsSubtotal + transportationCharge + extraChargesTotal);
  const discountPercent = Math.min(100, Math.max(0, input.discountPercent ?? 0));
  const discountAmount = round2(beforeDiscount * (discountPercent / 100));
  const subtotalBeforeGst = round2(beforeDiscount - discountAmount);

  const gstEnabled = input.gst?.enabled === true;
  const gstPercent = gstEnabled ? Math.max(0, input.gst?.percent ?? 0) : 0;
  const gstAmount =
    gstEnabled && gstPercent > 0
      ? round2(subtotalBeforeGst * (gstPercent / 100))
      : 0;

  const grandTotal = round2(subtotalBeforeGst + gstAmount);

  return {
    items,
    totalAreaSqFt,
    averageRatePerSqFt,
    itemsSubtotal,
    transportationCharge,
    extraChargesTotal,
    discountAmount,
    subtotalBeforeGst,
    gstAmount,
    grandTotal,
  };
}
