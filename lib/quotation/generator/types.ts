export type QuotationProductType =
  | "2-track"
  | "3-track-2glass-1mesh"
  | "3-track-3glass"
  | "lowers"
  | "fix-frame"
  | "partition"
  | "door";

export type QuotationSizeUnit = "mm" | "inch" | "feet";

export type QuotationPricingMode = "sqft" | "piece";

export type QuotationItemInput = {
  id?: string;
  productType: QuotationProductType;
  /** Optional override — otherwise built from product type + dimensions. */
  description?: string;
  width: number;
  height: number;
  unit: QuotationSizeUnit;
  quantity: number;
  pricingMode?: QuotationPricingMode;
  /** ₹/sq.ft for sqft items, ₹/pc for piece items. */
  rate: number;
};

export type QuotationExtraCharge = {
  label: string;
  amount: number;
};

export type QuotationGstConfig = {
  enabled: boolean;
  percent: number;
  /** Row label in PDF table, e.g. "GST 18 %". */
  label?: string;
};

export type QuotationCompanyInfo = {
  name: string;
  businessLine: string;
  address: string;
  phones: string;
  email: string;
  website: string;
  footerText?: string;
};

export type QuotationGeneratorInput = {
  quotationDate?: string;
  customerName?: string;
  customerAddress?: string;
  customerPhone?: string;
  subject?: string;
  introText?: string;
  items: QuotationItemInput[];
  terms?: string[];
  transportationCharge?: number;
  extraCharges?: QuotationExtraCharge[];
  discountPercent?: number;
  gst?: QuotationGstConfig | null;
  company?: Partial<QuotationCompanyInfo>;
};

export type CalculatedQuotationItem = QuotationItemInput & {
  id: string;
  pricingMode: QuotationPricingMode;
  areaSqFt: number;
  amount: number;
  description: string;
};

export type QuotationSummary = {
  items: CalculatedQuotationItem[];
  totalAreaSqFt: number;
  averageRatePerSqFt: number;
  itemsSubtotal: number;
  transportationCharge: number;
  extraChargesTotal: number;
  discountAmount: number;
  subtotalBeforeGst: number;
  gstAmount: number;
  grandTotal: number;
};

export type ReferenceImageItem = {
  productType: QuotationProductType;
  label: string;
  imagePath: string;
};

export type ResolvedReferenceImage = ReferenceImageItem & {
  dataUrl: string;
  aspectRatio: number;
};
