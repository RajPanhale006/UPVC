import type { ImportQuoteLine } from "./types";
import { detectProductTypeFromText, normalizeProductTypeToken } from "./detect-product-type";
import { parseTextToImportLines } from "./parse-text";

type ColumnMap = {
  width?: number;
  height?: number;
  quantity?: number;
  type?: number;
  serial?: number;
};

const WIDTH_HEADERS = ["width", "w", "width mm", "width(ft)", "wide"];
const HEIGHT_HEADERS = ["height", "h", "height mm", "height(ft)", "high"];
const QTY_HEADERS = ["qty", "quantity", "nos", "no", "pcs", "count", "n"];
const TYPE_HEADERS = ["type", "track", "system", "product", "window type", "door type"];
const SERIAL_HEADERS = ["sr", "sr no", "sr.", "sr. no.", "sno", "s.no", "serial", "#"];

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[()]/g, "")
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function headerMatches(header: string, aliases: string[]): boolean {
  if (aliases.includes(header)) return true;
  if (header === "w" || header === "h") return aliases.includes(header);
  if (/\bwidth\b/.test(header) && aliases === WIDTH_HEADERS) return true;
  if (/\bheight\b/.test(header) && aliases === HEIGHT_HEADERS) return true;
  return false;
}

function findHeaderRow(rows: unknown[][]): { headerIndex: number; map: ColumnMap } | null {
  for (let i = 0; i < Math.min(rows.length, 8); i++) {
    const row = rows[i];
    if (!Array.isArray(row)) continue;
    const map: ColumnMap = {};

    row.forEach((cell, index) => {
      const header = normalizeHeader(cell);
      if (headerMatches(header, WIDTH_HEADERS)) map.width = index;
      if (headerMatches(header, HEIGHT_HEADERS)) map.height = index;
      if (QTY_HEADERS.includes(header)) map.quantity = index;
      if (TYPE_HEADERS.includes(header)) map.type = index;
      if (SERIAL_HEADERS.includes(header)) map.serial = index;
    });

    if (map.width != null && map.height != null) {
      return { headerIndex: i, map };
    }
  }
  return null;
}

function parseNumberCell(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number.parseFloat(String(value).replace(/[^\d.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function inferMmFromRow(row: unknown[], map: ColumnMap): { width: number; height: number } | null {
  const width = parseNumberCell(row[map.width!]);
  const height = parseNumberCell(row[map.height!]);
  if (width && height) {
    return { width, height };
  }

  const numerics = row
    .map((cell, index) => ({ index, value: parseNumberCell(cell) }))
    .filter((entry): entry is { index: number; value: number } => entry.value != null);

  if (numerics.length < 2) return null;

  const serialIndex = map.serial;
  const dimensionValues = numerics.filter(
    (entry) => serialIndex == null || entry.index !== serialIndex,
  );

  const candidates =
    dimensionValues.length >= 2
      ? dimensionValues
      : numerics.length >= 3
        ? numerics.slice(-2)
        : numerics;

  if (candidates.length < 2) return null;

  const [first, second] = candidates.slice(-2);
  if (!first || !second) return null;

  return { width: first.value, height: second.value };
}

function rowFromMappedCells(
  row: unknown[],
  map: ColumnMap,
  context: string,
): ImportQuoteLine | null {
  const dims = inferMmFromRow(row, map);
  if (!dims) return null;

  const { width, height } = dims;
  const quantity = map.quantity != null ? parseNumberCell(row[map.quantity]) : null;
  const typeRaw = map.type != null ? String(row[map.type] ?? "").trim() : "";

  const unit: "mm" | "feet-inches" =
    width <= 30 && height <= 30 && !/\bmm\b/i.test(context) ? "feet-inches" : "mm";

  return {
    width,
    height,
    unit,
    quantity: quantity ?? undefined,
    productType:
      (typeRaw ? normalizeProductTypeToken(typeRaw) : null) ??
      detectProductTypeFromText(context) ??
      "3-track-2g1n",
    sourceText: context,
  };
}

function rowLooksEmpty(row: unknown[]): boolean {
  return row.every((cell) => String(cell ?? "").trim() === "");
}

export async function parseExcelToImportLines(file: File): Promise<ImportQuoteLine[]> {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as unknown[][];

  const header = findHeaderRow(rows);
  const parsed: ImportQuoteLine[] = [];

  if (header) {
    for (let i = header.headerIndex + 1; i < rows.length; i++) {
      const row = rows[i];
      if (!Array.isArray(row) || rowLooksEmpty(row)) continue;
      const context = row.map((c) => String(c ?? "")).join(" ");
      const line = rowFromMappedCells(row, header.map, context);
      if (line) parsed.push(line);
    }
    if (parsed.length > 0) return parsed;
  }

  // Common layout: Sr | Width (mm) | Height (mm) without matching header aliases.
  for (let i = 0; i < Math.min(rows.length, 12); i++) {
    const row = rows[i];
    if (!Array.isArray(row) || row.length < 3) continue;
    const headerText = row.map((c) => normalizeHeader(c)).join(" ");
    if (!/\bwidth\b/.test(headerText) || !/\bheight\b/.test(headerText)) continue;

    const fallbackMap: ColumnMap = {
      width: row.findIndex((cell) => /\bwidth\b/.test(normalizeHeader(cell))),
      height: row.findIndex((cell) => /\bheight\b/.test(normalizeHeader(cell))),
      serial: row.findIndex((cell) => SERIAL_HEADERS.includes(normalizeHeader(cell))),
    };
    if (fallbackMap.width! < 0 || fallbackMap.height! < 0) continue;

    for (let r = i + 1; r < rows.length; r++) {
      const dataRow = rows[r];
      if (!Array.isArray(dataRow) || rowLooksEmpty(dataRow)) continue;
      const context = dataRow.map((c) => String(c ?? "")).join(" ");
      const line = rowFromMappedCells(dataRow, fallbackMap, context);
      if (line) parsed.push(line);
    }
    if (parsed.length > 0) return parsed;
  }

  const flatText = rows
    .map((row) => (Array.isArray(row) ? row.map((c) => String(c ?? "")).join("\t") : ""))
    .join("\n");
  return parseTextToImportLines(flatText);
}
