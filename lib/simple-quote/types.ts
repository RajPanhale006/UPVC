export type SimpleQuoteProductType =
  | "2-track"
  | "2.5-track"
  | "3-track-2g1n"
  | "3-track-3g"
  | "single-door"
  | "double-door"
  | "fixed-frame"
  | "lowers";

export type SimpleQuoteRow = {
  id: string;
  widthFeet: number;
  widthInches: number;
  heightFeet: number;
  heightInches: number;
  /** Precise mm when entered in mm mode (supports decimals e.g. 1214.66). */
  widthMm?: number | null;
  heightMm?: number | null;
  widthMmStr?: string;
  heightMmStr?: string;
  productType: SimpleQuoteProductType;
  quantity: number;
};

export type SimpleQuoteRowResult = {
  rowId: string;
  label: string;
  productType: SimpleQuoteProductType;
  quantity: number;
  widthMm: number;
  heightMm: number;
  areaSqft: number;
  workshopTotal: number;
  workshopRatePerSqFt: number;
  customerRatePerSqFt: number;
  customerTotal: number;
  profitAmount: number;
  /** Lumpsum per-piece pricing (Lowers). */
  pricingMode?: "area" | "lumpsum";
  customerRatePerPiece?: number;
  pricingNote?: string;
  isValid: boolean;
  error?: string;
};

export type SimpleQuoteTotals = {
  rows: SimpleQuoteRowResult[];
  totalAreaSqft: number;
  totalWorkshopCost: number;
  averageWorkshopRatePerSqFt: number;
  averageCustomerRatePerSqFt: number;
  totalCustomerAmount: number;
  totalProfitAmount: number;
  validRowCount: number;
  invalidRowCount: number;
};

export type SimpleQuotePdfInput = {
  jobId: string;
  projectName: string;
  customerName: string;
  unitMode: "mm" | "ft-in";
  showWorkshopCost: boolean;
  rows: SimpleQuoteRow[];
  totals: SimpleQuoteTotals;
  profitMarginPercent: number;
  generatedAt: string;
};
