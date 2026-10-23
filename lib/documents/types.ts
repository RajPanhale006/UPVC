export type DocumentType =
  | "labour-cutting-sheet"
  | "internal-estimation"
  | "standard-quotation"
  | "premium-proposal"
  | "workshop-cost-summary"
  | "profile-weight-summary";

export type DocumentStatus = "draft" | "final" | "superseded" | "archived";

export type DocumentAudience = "internal" | "customer";

export type SourceSnapshot = {
  hash: string;
  summary: string;
  dimensions?: string;
  quantity?: number;
  configuration?: string;
  rate?: number;
  gst?: number;
  grandTotal?: number;
  terms?: string;
  companyDetails?: string;
};

export type JobDocument = {
  id: string;
  jobId: string;
  documentType: DocumentType;
  relatedProductIds: string[];
  quotationId?: string;
  revision: number;
  fileName: string;
  blobKey: string;
  generatedBy: string;
  generatedAt: string;
  calculationMethodVersion?: string;
  companySettingsRef?: string;
  status: DocumentStatus;
  audience: DocumentAudience;
  notes: string;
  sourceSnapshot: SourceSnapshot;
  finalizedBy?: string;
  finalizedAt?: string;
  fileSizeBytes?: number;
};

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  "labour-cutting-sheet": "Labour Cutting Sheet",
  "internal-estimation": "Internal Estimation",
  "standard-quotation": "Standard Quotation",
  "premium-proposal": "Premium Proposal",
  "workshop-cost-summary": "Workshop Cost Summary",
  "profile-weight-summary": "Profile Weight Summary",
};

export const DOCUMENT_AUDIENCE: Record<DocumentType, DocumentAudience> = {
  "labour-cutting-sheet": "internal",
  "internal-estimation": "internal",
  "standard-quotation": "customer",
  "premium-proposal": "customer",
  "workshop-cost-summary": "internal",
  "profile-weight-summary": "internal",
};

export function isCustomerDocument(type: DocumentType): boolean {
  return DOCUMENT_AUDIENCE[type] === "customer";
}

export function isInternalDocument(type: DocumentType): boolean {
  return DOCUMENT_AUDIENCE[type] === "internal";
}

export function sanitizeFileName(name: string): string {
  return name
    .replace(/[^\w.\-() ]+/g, "_")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 180);
}
