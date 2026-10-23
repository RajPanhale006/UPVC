import { feetInchesToMm, MM_PER_INCH, INCHES_PER_FOOT } from "@/lib/units/conversion";

import type { SimpleQuoteRow } from "./types";

/** Convert mm to ft/in without rounding mm first — preserves decimal input. */
export function mmToFeetInchesExact(mm: number): { feet: number; inches: number } {
  if (!Number.isFinite(mm) || mm <= 0) {
    return { feet: 0, inches: 0 };
  }
  const totalInches = mm / MM_PER_INCH;
  const feet = Math.floor(totalInches / INCHES_PER_FOOT);
  const inches = Math.round((totalInches - feet * INCHES_PER_FOOT) * 100000) / 100000;
  return { feet, inches };
}

export function getRowWidthMm(row: SimpleQuoteRow): number {
  if (row.widthMm != null && row.widthMm > 0) return row.widthMm;
  return feetInchesToMm(row.widthFeet, row.widthInches);
}

export function getRowHeightMm(row: SimpleQuoteRow): number {
  if (row.heightMm != null && row.heightMm > 0) return row.heightMm;
  return feetInchesToMm(row.heightFeet, row.heightInches);
}

export function rowHasDimensions(row: SimpleQuoteRow): boolean {
  return getRowWidthMm(row) > 0 && getRowHeightMm(row) > 0;
}

export function resolveRowFeetInches(row: SimpleQuoteRow): {
  widthFeet: number;
  widthInches: number;
  heightFeet: number;
  heightInches: number;
} {
  if (row.widthMm != null && row.widthMm > 0 && row.heightMm != null && row.heightMm > 0) {
    const w = mmToFeetInchesExact(row.widthMm);
    const h = mmToFeetInchesExact(row.heightMm);
    return {
      widthFeet: w.feet,
      widthInches: w.inches,
      heightFeet: h.feet,
      heightInches: h.inches,
    };
  }
  return {
    widthFeet: row.widthFeet,
    widthInches: row.widthInches,
    heightFeet: row.heightFeet,
    heightInches: row.heightInches,
  };
}

export function applyFeetInchesToRow(
  row: SimpleQuoteRow,
  patch: Partial<Pick<SimpleQuoteRow, "widthFeet" | "widthInches" | "heightFeet" | "heightInches">>,
): SimpleQuoteRow {
  const next: SimpleQuoteRow = { ...row, ...patch };
  const touchesWidth = "widthFeet" in patch || "widthInches" in patch;
  const touchesHeight = "heightFeet" in patch || "heightInches" in patch;
  if (touchesWidth) {
    next.widthMm = null;
    next.widthMmStr = "";
  }
  if (touchesHeight) {
    next.heightMm = null;
    next.heightMmStr = "";
  }
  return next;
}

export function applyMmToRow(
  row: SimpleQuoteRow,
  axis: "width" | "height",
  raw: string,
): SimpleQuoteRow {
  const next = { ...row };
  if (axis === "width") {
    next.widthMmStr = raw;
  } else {
    next.heightMmStr = raw;
  }

  const mm = Number.parseFloat(raw);
  if (!Number.isFinite(mm) || mm <= 0) {
    if (axis === "width") {
      next.widthMm = null;
      next.widthFeet = 0;
      next.widthInches = 0;
    } else {
      next.heightMm = null;
      next.heightFeet = 0;
      next.heightInches = 0;
    }
    return next;
  }

  const fi = mmToFeetInchesExact(mm);
  if (axis === "width") {
    next.widthMm = mm;
    next.widthFeet = fi.feet;
    next.widthInches = fi.inches;
    next.widthMmStr = raw;
  } else {
    next.heightMm = mm;
    next.heightFeet = fi.feet;
    next.heightInches = fi.inches;
    next.heightMmStr = raw;
  }
  return next;
}

export function displayRowMm(row: SimpleQuoteRow, axis: "width" | "height"): string {
  const str = axis === "width" ? row.widthMmStr : row.heightMmStr;
  if (str != null && str !== "") return str;
  const mm = axis === "width" ? row.widthMm : row.heightMm;
  if (mm != null && mm > 0) return String(mm);
  return "";
}
