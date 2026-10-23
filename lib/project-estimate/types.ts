import type { GstMode } from "@/lib/quotation/types";

export type ProjectEstimateSettings = {
  installationCharge: number;
  transportationCharge: number;
  discountPercent: number;
};

export type ProjectEstimateLine = {
  productId: string;
  label: string;
  productKind: "window" | "door" | "fixed-frame";
  systemLabel: string;
  quantity: number;
  widthMm: number;
  heightMm: number;
  areaSqft: number;
  workshopTotal: number;
  ratePerSqFt: number;
  lineTotal: number;
  isValid: boolean;
  error?: string;
};

export type ProjectEstimateResult = {
  lines: ProjectEstimateLine[];
  productsSubtotal: number;
  totalWorkshopCost: number;
  installationCharge: number;
  transportationCharge: number;
  discountPercent: number;
  discountAmount: number;
  subtotalBeforeDiscount: number;
  subtotalAfterDiscount: number;
  gstMode: GstMode;
  gstPercent: number;
  gstAmount: number;
  grandTotal: number;
  validProductCount: number;
  invalidProductCount: number;
};
