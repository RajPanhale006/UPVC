import type { SimpleQuoteProductType } from "../types";

/** Guess track/door type from free text near a size line. */
export function detectProductTypeFromText(text: string): SimpleQuoteProductType {
  const t = text.toLowerCase();

  if (/lower|louver|louvre/.test(t)) return "lowers";
  if (/double\s*door|d\/d|ddoor/.test(t)) return "double-door";
  if (/single\s*door|s\/d|upvc\s*door|\bdoor\b/.test(t)) return "single-door";
  if (/fixed\s*frame|partition|fixed\s*upvc/.test(t)) return "fixed-frame";
  if (/2\.5\s*track|2\.5t|2\.5\s*t/.test(t)) return "2.5-track";
  if (/3\s*track.*3\s*glass|three\s*glass|3g\s*no\s*net/.test(t)) return "3-track-3g";
  if (/3\s*track|3t|t109|2\s*glass\s*\+\s*1\s*net|2g1n/.test(t)) return "3-track-2g1n";
  if (/2\s*track|2t|t60/.test(t)) return "2-track";

  return "3-track-2g1n";
}

export function normalizeProductTypeToken(raw: string): SimpleQuoteProductType | null {
  const token = raw.trim().toLowerCase();
  if (!token) return null;

  const map: Record<string, SimpleQuoteProductType> = {
    "2-track": "2-track",
    "2 track": "2-track",
    "2t": "2-track",
    "2.5-track": "2.5-track",
    "2.5 track": "2.5-track",
    "2.5t": "2.5-track",
    "3-track-2g1n": "3-track-2g1n",
    "3 track 2g1n": "3-track-2g1n",
    "3 track": "3-track-2g1n",
    "3-track-3g": "3-track-3g",
    "3 track 3g": "3-track-3g",
    "single-door": "single-door",
    "single door": "single-door",
    "door": "single-door",
    "double-door": "double-door",
    "double door": "double-door",
    "fixed-frame": "fixed-frame",
    "fixed frame": "fixed-frame",
    lowers: "lowers",
    lower: "lowers",
    louver: "lowers",
    louvre: "lowers",
  };

  if (map[token]) return map[token];
  return detectProductTypeFromText(token);
}
