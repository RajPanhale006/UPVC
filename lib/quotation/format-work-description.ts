import { WINDOW_TYPE_LABELS } from "./defaults";
import type { CalculatedWindowRow, QuotationWindowRow, WindowTypeId } from "./types";

function formatDimension(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, "");
}

function dimensionUnitLabel(unit: QuotationWindowRow["unit"]): string {
  switch (unit) {
    case "mm":
      return "mm";
    case "feet":
      return "ft";
    case "inch":
      return "in";
    default:
      return "";
  }
}

/** Human-readable product type for quotation PDF and sharing. */
export function resolveQuotationProductLabel(
  row: QuotationWindowRow | CalculatedWindowRow,
): string {
  if (row.description?.trim()) {
    return row.description.trim();
  }

  if (row.windowType === "upvc-door") {
    if (row.doorConfiguration === "double") return "Double UPVC Door";
    if (row.doorConfiguration === "single") return "Single UPVC Door";
    return WINDOW_TYPE_LABELS["upvc-door"];
  }

  const notes = (row.hardwareNotes ?? "").toLowerCase();

  if (row.windowType === "3-track-upvc") {
    if (/3 glass|three glass|3g|no net/.test(notes)) {
      return "3 Track (3 Glass)";
    }
    if (/2 glass.*net|2g1n|mesh|net/.test(notes)) {
      return "3 Track (2 Glass + 1 Net)";
    }
  }

  if (row.windowType === "2.5-track-upvc") {
    return WINDOW_TYPE_LABELS["2.5-track-upvc"];
  }

  return WINDOW_TYPE_LABELS[row.windowType as WindowTypeId] ?? row.windowType;
}

/** Line description for quotation PDF table — size + product type + qty. */
export function formatWorkDescription(row: CalculatedWindowRow): string {
  const length = formatDimension(row.length);
  const height = formatDimension(row.height);
  const unit = dimensionUnitLabel(row.unit);
  const size = unit ? `${length} x ${height} ${unit}` : `${length} x ${height}`;
  const productLabel = resolveQuotationProductLabel(row);
  return `${size} — ${productLabel} (${row.quantity} no.)`;
}
