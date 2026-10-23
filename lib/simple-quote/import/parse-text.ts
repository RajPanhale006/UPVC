import { parseDimensionsFromText, parseQuantityFromText } from "@/lib/assistant/audit";

import { detectProductTypeFromText, normalizeProductTypeToken } from "./detect-product-type";
import { parsePairedMmNumbers } from "./parse-paired-mm";
import type { ImportQuoteLine } from "./types";

function parseQtyToken(raw: string): number | null {
  const n = Number.parseInt(raw.replace(/[^\d]/g, ""), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function lineFromParts(
  width: number,
  height: number,
  unit: "mm" | "feet-inches",
  context: string,
  quantity?: number,
  productTypeRaw?: string,
): ImportQuoteLine | null {
  if (width <= 0 || height <= 0) return null;
  if (unit === "mm" && (width < 100 || height < 100 || width > 15000 || height > 15000)) {
    return null;
  }

  return {
    width,
    height,
    unit,
    quantity: quantity ?? undefined,
    productType:
      (productTypeRaw ? normalizeProductTypeToken(productTypeRaw) : null) ??
      detectProductTypeFromText(context) ??
      "3-track-2g1n",
    sourceText: context.trim() || undefined,
  };
}

function looksLikeSerial(value: string): boolean {
  const trimmed = value.trim();
  if (!/^\d{1,4}$/.test(trimmed)) return false;
  const n = Number.parseInt(trimmed, 10);
  return n >= 1 && n <= 9999;
}

function parseStructuredCells(cells: string[]): ImportQuoteLine | null {
  let workingCells = cells;
  if (cells.length >= 3 && looksLikeSerial(cells[0] ?? "")) {
    workingCells = cells.slice(1);
  }

  const joined = workingCells.join(" ");
  let dims = parseDimensionsFromText(joined);

  const numericCells = workingCells
    .map((cell) => Number.parseFloat(String(cell).replace(/[^\d.]/g, "")))
    .filter((n) => Number.isFinite(n) && n > 0);

  if (!dims && numericCells.length >= 2) {
    const width = numericCells[0]!;
    const height = numericCells[1]!;
    dims = {
      width,
      height,
      unit: width <= 30 && height <= 30 && !/\bmm\b/i.test(joined) ? "feet-inches" : "mm",
    };
  }

  if (!dims) return null;

  let quantity: number | undefined;
  let productTypeRaw: string | undefined;

  for (const cell of workingCells) {
    const c = cell.trim();
    if (!c) continue;
    const qty = parseQtyToken(c);
    if (qty && !quantity) {
      quantity = qty;
    }
    if (!productTypeRaw && normalizeProductTypeToken(c)) {
      productTypeRaw = c;
    }
  }

  if (!quantity && numericCells.length >= 3) {
    const maybeQty = Math.round(numericCells[2]!);
    if (maybeQty >= 1 && maybeQty <= 500) quantity = maybeQty;
  }

  if (!dims?.width || !dims?.height || !dims.unit) return null;

  const qtyFromText = parseQuantityFromText(joined);
  return lineFromParts(
    dims.width,
    dims.height,
    dims.unit,
    joined,
    quantity ?? qtyFromText ?? undefined,
    productTypeRaw,
  );
}

/** Parse free text / PDF extract / pasted lists into quote lines. */
export function parseTextToImportLines(text: string): ImportQuoteLine[] {
  const lines: ImportQuoteLine[] = [];

  function push(line: ImportQuoteLine | null) {
    if (!line) return;
    lines.push(line);
  }

  const normalized = text.replace(/\r/g, "\n");
  const rowTexts = normalized.split(/\n+/).map((line) => line.trim()).filter(Boolean);

  for (const row of rowTexts) {
    const tabCells = row.split(/\t+/);
    if (tabCells.length >= 2) {
      push(parseStructuredCells(tabCells));
      continue;
    }

    const csvCells = row.split(/[,;|]+/).map((c) => c.trim());
    if (csvCells.length >= 3) {
      push(parseStructuredCells(csvCells));
    }

    const dims = parseDimensionsFromText(row);
    if (dims?.width && dims?.height && dims.unit) {
      push(
        lineFromParts(
          dims.width,
          dims.height,
          dims.unit,
          row,
          parseQuantityFromText(row) ?? undefined,
        ),
      );
    }
  }

  if (lines.length === 0) {
    for (const paired of parsePairedMmNumbers(normalized.replace(/\n/g, " "))) {
      push(paired);
    }
  }

  return lines;
}
