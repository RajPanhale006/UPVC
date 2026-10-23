import type { SimpleQuoteProductType } from "./types";

export type SimpleQuoteProductOption = {
  value: SimpleQuoteProductType;
  label: string;
  group: "Windows" | "Doors" | "Lowers" | "Other";
};

export const SIMPLE_QUOTE_PRODUCT_OPTIONS: SimpleQuoteProductOption[] = [
  { group: "Windows", value: "2-track", label: "2 Track (2 Glass)" },
  { group: "Windows", value: "2.5-track", label: "2.5 Track (2 Glass + 1 Net)" },
  { group: "Windows", value: "3-track-2g1n", label: "3 Track (2 Glass + 1 Net)" },
  { group: "Windows", value: "3-track-3g", label: "3 Track (3 Glass)" },
  { group: "Doors", value: "single-door", label: "Single Door" },
  { group: "Doors", value: "double-door", label: "Double Door" },
  { group: "Lowers", value: "lowers", label: "Lowers (Casement Frame)" },
  { group: "Other", value: "fixed-frame", label: "Fixed Frame" },
];

export function getSimpleQuoteProductLabel(type: SimpleQuoteProductType): string {
  return (
    SIMPLE_QUOTE_PRODUCT_OPTIONS.find((option) => option.value === type)?.label ?? type
  );
}
