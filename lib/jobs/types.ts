import type { ProductPreviewData } from "@/components/product-preview/preview-types";
import type { CuttingOptions } from "@/lib/cutting/types";
import type { EstimationInputs } from "@/lib/estimation/types";
import type { QuotationForm } from "@/lib/quotation/types";
import type { CuttingJobMeta } from "@/lib/summary/types";

export type JobStatus =
  | "draft"
  | "measurement-pending"
  | "measured"
  | "estimation-ready"
  | "quotation-ready"
  | "quotation-sent"
  | "approved"
  | "in-production"
  | "installation-pending"
  | "completed"
  | "cancelled";

export type JobProductKind = "window" | "door" | "fixed-frame";

export type JobProduct = {
  id: string;
  productKind: JobProductKind;
  label: string;
  location: string;
  notes: string;
  sortOrder: number;
  estimationInputs: EstimationInputs;
  cuttingOptions: CuttingOptions;
  areaSqft?: number;
  ratePerSqft?: number;
  calculationMethod?: string;
  methodVersion?: string;
  previewData?: ProductPreviewData;
  createdAt: string;
  updatedAt: string;
};

export type JobActivityAction =
  | "job-created"
  | "job-updated"
  | "product-added"
  | "product-edited"
  | "product-removed"
  | "product-reordered"
  | "product-duplicated"
  | "estimation-generated"
  | "quotation-created"
  | "quotation-updated"
  | "quotation-sent"
  | "quotation-approved"
  | "quotation-rejected"
  | "document-generated"
  | "document-finalized"
  | "document-archived"
  | "company-settings-changed"
  | "calculation-method-changed";

export type JobActivityEntry = {
  id: string;
  action: JobActivityAction;
  user: string;
  timestamp: string;
  relatedRecordId?: string;
  summary: string;
};

export type StoredQuotationRevision = {
  quotationId: string;
  revision: number;
  form: QuotationForm;
  savedAt: string;
  savedBy: string;
};

export type WorkshopJob = {
  id: string;
  customerName: string;
  customerPhone: string;
  billingAddress: string;
  siteAddress: string;
  projectName: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  status: JobStatus;
  products: JobProduct[];
  activeProductId: string | null;
  notes: string;
  cuttingJobMeta: CuttingJobMeta;
  quotation: QuotationForm;
  quotationRevisions: StoredQuotationRevision[];
  documentIds: string[];
  activity: JobActivityEntry[];
};

export type JobRegistry = {
  activeJobId: string | null;
  jobs: Record<string, WorkshopJob>;
};

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  draft: "Draft",
  "measurement-pending": "Measurement Pending",
  measured: "Measured",
  "estimation-ready": "Estimation Ready",
  "quotation-ready": "Quotation Ready",
  "quotation-sent": "Quotation Sent",
  approved: "Approved",
  "in-production": "In Production",
  "installation-pending": "Installation Pending",
  completed: "Completed",
  cancelled: "Cancelled",
};
