import type { SimpleQuoteProductType } from "../types";

export type ImportQuoteLine = {
  width: number;
  height: number;
  unit: "mm" | "feet-inches";
  quantity?: number;
  productType?: SimpleQuoteProductType;
  sourceText?: string;
};

export type ImportQuoteResult = {
  ok: true;
  lines: ImportQuoteLine[];
  warnings: string[];
  source: "excel" | "pdf" | "image" | "ai-text";
} | {
  ok: false;
  message: string;
};
