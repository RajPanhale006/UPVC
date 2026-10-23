import type { ProductPreviewData } from "@/components/product-preview/preview-types";

export type WindowTypeId =
  | "2-track-upvc"
  | "2.5-track-upvc"
  | "3-track-upvc"
  | "openable-single-glass"
  | "fixed-glass"
  | "fixed-upvc-partition"
  | "upvc-door";

export type DoorConfigurationId = "single" | "double";
export type DoorOpeningSideId = "left" | "right";
export type DoorOpeningDirectionId = "inward" | "outward";

export type DimensionUnit = "feet" | "inch" | "mm";

export type QuotationStatus =
  | "draft"
  | "ready"
  | "sent"
  | "viewed"
  | "approved"
  | "rejected"
  | "expired"
  | "superseded"
  | "cancelled";

export type CustomChargeType =
  | "installation"
  | "transportation"
  | "additional-hardware"
  | "civil-work"
  | "removal"
  | "other";

export type CustomCharge = {
  id: string;
  type: CustomChargeType;
  description: string;
  amount: number;
};

export type QuotationWindowRow = {
  id: string;
  /** Linked job product ID — W-001 / D-001 when added from job. */
  productId?: string;
  windowType: WindowTypeId;
  length: number;
  height: number;
  unit: DimensionUnit;
  quantity: number;
  ratePerSqFt: number;
  description?: string;
  discountPercent?: number;
  groupId?: string;
  /** Door-only optional fields for quotation display. */
  doorConfiguration?: DoorConfigurationId;
  openingSide?: DoorOpeningSideId;
  openingDirection?: DoorOpeningDirectionId;
  profileLabel?: string;
  glassPanelLabel?: string;
  hardwareNotes?: string;
  calculationMethod?: string;
  methodVersion?: string;
  /** Render configuration for ProductPreview — optional for backward compatibility. */
  previewData?: ProductPreviewData;
};

export type GstMode = "apply" | "exclude" | "terms-only";

export type PdfPageMode = "single" | "dual";

export type QuotationForm = {
  customerName: string;
  customerAddress: string;
  customerPhone?: string;
  quotationDate: string;
  subject: string;
  gstMode: GstMode;
  pdfPageMode: PdfPageMode;
  transportationCharge: number;
  windows: QuotationWindowRow[];
  /** Structured quotation ID — QTN-2026-0001 */
  quotationId?: string;
  revision?: number;
  status?: QuotationStatus;
  validUntil?: string;
  discountPercent?: number;
  customCharges?: CustomCharge[];
  termOverrides?: string[];
  sentAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  emailSendStatus?: "pending" | "sent" | "failed";
  emailSendError?: string;
  lastEmailSentAt?: string;
};

export type CalculatedWindowRow = QuotationWindowRow & {
  areaSqFt: number;
  amount: number;
};

export type WindowTypeGroup = {
  windowType: WindowTypeId;
  label: string;
  rows: CalculatedWindowRow[];
  subtotal: number;
};

export type QuotationTotals = {
  windowsSubtotal: number;
  transportationCharge: number;
  customChargesTotal?: number;
  discountPercent?: number;
  discountAmount?: number;
  subtotalBeforeGst: number;
  gstPercent: number;
  gstAmount: number;
  grandTotal: number;
};

export type QuotationResult = {
  form: QuotationForm;
  groups: WindowTypeGroup[];
  totals: QuotationTotals;
};
