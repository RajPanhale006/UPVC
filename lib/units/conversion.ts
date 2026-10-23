/** Exact UPVC workshop conversion constants — do not approximate. */
export const MM_PER_FOOT = 304.8;
export const MM_PER_INCH = 25.4;
export const INCHES_PER_FOOT = 12;

/** Round to the nearest whole millimetre for fabrication dimensions. */
export function normalizeMm(mm: number): number {
  if (!Number.isFinite(mm)) {
    return 0;
  }
  return Math.round(mm);
}

/** Decimal feet input — not the same as separate feet + inches fields. */
export function feetToMm(feet: number): number {
  return normalizeMm(feet * MM_PER_FOOT);
}

export function inchesToMm(inches: number): number {
  return normalizeMm(inches * MM_PER_INCH);
}

/** Separate feet and inches fields (not decimal feet). */
export function feetAndInchesToMm(feet: number, inches: number): number {
  return normalizeMm(feet * MM_PER_FOOT + inches * MM_PER_INCH);
}

/** @alias feetAndInchesToMm — used by estimation inputs (ft + in fields). */
export function feetInchesToMm(feet: number, inches: number): number {
  return feetAndInchesToMm(feet, inches);
}

/**
 * Convert canonical millimetres to whole feet + remainder inches for display/editing.
 */
export function mmToFeetInches(mm: number): { feet: number; inches: number } {
  const normalized = normalizeMm(mm);
  if (normalized <= 0) {
    return { feet: 0, inches: 0 };
  }

  const totalInches = normalized / MM_PER_INCH;
  const feet = Math.floor(totalInches / INCHES_PER_FOOT);
  const inches = Math.round((totalInches - feet * INCHES_PER_FOOT) * 10000) / 10000;
  return { feet, inches };
}
