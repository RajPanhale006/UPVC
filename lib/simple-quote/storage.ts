import type { SimpleQuoteRow } from "./types";

const KEY_PREFIX = "upvc-simple-quote-";

export function createEmptyQuoteRow(): SimpleQuoteRow {
  return {
    id: crypto.randomUUID(),
    widthFeet: 0,
    widthInches: 0,
    heightFeet: 0,
    heightInches: 0,
    widthMm: null,
    heightMm: null,
    widthMmStr: "",
    heightMmStr: "",
    productType: "3-track-2g1n",
    quantity: 1,
  };
}

export function loadSimpleQuoteRows(jobId: string): SimpleQuoteRow[] {
  if (typeof window === "undefined") return [createEmptyQuoteRow()];
  const raw = window.localStorage.getItem(`${KEY_PREFIX}${jobId}`);
  if (!raw) return [createEmptyQuoteRow()];
  try {
    const parsed = JSON.parse(raw) as SimpleQuoteRow[];
    if (!Array.isArray(parsed) || parsed.length === 0) return [createEmptyQuoteRow()];
    return parsed.map((row) => ({
      ...createEmptyQuoteRow(),
      ...row,
      quantity: Math.max(1, Number(row.quantity) || 1),
    }));
  } catch {
    return [createEmptyQuoteRow()];
  }
}

export function saveSimpleQuoteRows(jobId: string, rows: SimpleQuoteRow[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(`${KEY_PREFIX}${jobId}`, JSON.stringify(rows));
}
