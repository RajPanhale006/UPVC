import { detectProductTypeFromText } from "./detect-product-type";
import type { ImportQuoteLine } from "./types";

/** OCR often returns "1717.7 1387.5 1444.6 1111.3" — pairs of mm sizes without × separator. */
export function parsePairedMmNumbers(text: string): ImportQuoteLine[] {
  const flat = text.replace(/\r/g, " ").replace(/\n/g, " ");
  const numbers = flat
    .match(/\d+(?:\.\d+)?/g)
    ?.map((token) => Number.parseFloat(token))
    .filter((n) => Number.isFinite(n) && n >= 100 && n <= 15000);

  if (!numbers || numbers.length < 2) return [];

  const lines: ImportQuoteLine[] = [];
  for (let i = 0; i + 1 < numbers.length; i += 2) {
    const width = numbers[i]!;
    const height = numbers[i + 1]!;
    if (width < 100 || height < 100) continue;

    lines.push({
      width,
      height,
      unit: "mm",
      quantity: 1,
      productType: detectProductTypeFromText(flat),
      sourceText: `${width} × ${height} mm`,
    });
  }

  return lines;
}
