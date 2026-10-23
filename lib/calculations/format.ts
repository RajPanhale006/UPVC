import { MM_PER_FOOT, MM_PER_INCH, mmToFeetInches } from "@/lib/units/conversion";

export { feetInchesToMm, mmToFeetInches, normalizeMm } from "@/lib/units/conversion";

const MM_TO_SQFT = 92903.04;

export function mmToRunningFeet(lengthMm: number, qty = 1): number {
  if (!Number.isFinite(lengthMm) || lengthMm <= 0 || qty <= 0) return 0;
  return Math.round(((lengthMm * qty) / MM_PER_FOOT) * 100) / 100;
}

export function mmAreaToSqFt(widthMm: number, heightMm: number): number {
  if (widthMm <= 0 || heightMm <= 0) return 0;
  return Math.round((widthMm * heightMm) / MM_TO_SQFT * 100) / 100;
}

export function areaFromFeetInchesFields(
  widthFeet: number,
  widthInches: number,
  heightFeet: number,
  heightInches: number,
): number {
  const widthFt = widthFeet + widthInches / 12;
  const heightFt = heightFeet + heightInches / 12;
  if (widthFt <= 0 || heightFt <= 0) return 0;
  return Math.round(widthFt * heightFt * 100) / 100;
}

/** Display: "6 ft 11.1 in" instead of raw decimal inches. */
export function formatDimension(
  mm: number,
  inchPrecision = 1,
): string {
  if (!Number.isFinite(mm) || mm <= 0) return "—";
  const { feet, inches } = mmToFeetInches(mm);
  const roundedInches = Math.round(inches * 10 ** inchPrecision) / 10 ** inchPrecision;
  if (feet <= 0) {
    return `${roundedInches} in`;
  }
  return `${feet} ft ${roundedInches} in`;
}

export function formatDimensionPair(widthMm: number, heightMm: number): string {
  return `${Math.round(widthMm)} × ${Math.round(heightMm)} mm (${formatDimension(widthMm)} × ${formatDimension(heightMm)})`;
}

export function formatArea(sqFt: number): string {
  if (!Number.isFinite(sqFt) || sqFt <= 0) return "—";
  return `${sqFt.toFixed(2)} sq.ft`;
}

export function formatCurrency(inr: number): string {
  if (!Number.isFinite(inr)) return "₹0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(inr);
}

export function mmToInchesDisplay(mm: number, precision = 2): string {
  return `${(mm / MM_PER_INCH).toFixed(precision)}"`;
}
