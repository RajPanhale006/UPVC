import { feetAndInchesToMm } from "@/lib/units/conversion";

import { mmToFeetInchesExact, rowHasDimensions } from "../row-dimensions";
import { createEmptyQuoteRow } from "../storage";
import type { SimpleQuoteRow } from "../types";
import type { ImportQuoteLine } from "./types";

export function importLinesToQuoteRows(lines: ImportQuoteLine[]): SimpleQuoteRow[] {
  return lines.map((line) => {
    const row = createEmptyQuoteRow();

    if (line.unit === "mm") {
      row.widthMm = line.width;
      row.heightMm = line.height;
      row.widthMmStr = String(line.width);
      row.heightMmStr = String(line.height);
      const width = mmToFeetInchesExact(line.width);
      const height = mmToFeetInchesExact(line.height);
      row.widthFeet = width.feet;
      row.widthInches = width.inches;
      row.heightFeet = height.feet;
      row.heightInches = height.inches;
    } else {
      row.widthFeet = Math.floor(line.width);
      row.widthInches = Math.round((line.width % 1) * 12 * 10) / 10;
      row.heightFeet = Math.floor(line.height);
      row.heightInches = Math.round((line.height % 1) * 12 * 10) / 10;

      // If values look like mm mis-read as feet, normalize.
      const widthMm = feetAndInchesToMm(row.widthFeet, row.widthInches);
      const heightMm = feetAndInchesToMm(row.heightFeet, row.heightInches);
      if (widthMm > 2500 || heightMm > 2500) {
        const w = mmToFeetInchesExact(line.width);
        const h = mmToFeetInchesExact(line.height);
        row.widthFeet = w.feet;
        row.widthInches = w.inches;
        row.heightFeet = h.feet;
        row.heightInches = h.inches;
      }
    }

    row.quantity = Math.max(1, line.quantity ?? 1);
    row.productType = line.productType ?? "3-track-2g1n";
    return row;
  });
}

export function mergeImportedQuoteRows(
  current: SimpleQuoteRow[],
  imported: SimpleQuoteRow[],
): SimpleQuoteRow[] {
  const kept = current.filter(rowHasDimensions);
  return [...kept, ...imported];
}

export function replaceImportedQuoteRows(imported: SimpleQuoteRow[]): SimpleQuoteRow[] {
  return imported.length > 0 ? imported : [createEmptyQuoteRow()];
}
