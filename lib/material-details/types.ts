import type { JobProductKind } from "@/lib/jobs/types";
import type { ProfileCostSummaryRow } from "@/lib/summary/types";

export type MaterialDetailsCategory =
  | "Profile"
  | "Glass"
  | "Mesh"
  | "Hardware"
  | "Labour"
  | "Overhead"
  | "Other";

export type MaterialDetailsLineItem = {
  category: MaterialDetailsCategory;
  item: string;
  specification?: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
  note?: string;
};

export type MaterialDetailsProduct = {
  id: string;
  label: string;
  productKind: JobProductKind;
  quantity: number;
  widthMm: number;
  heightMm: number;
  areaSqft: number;
  trackLabel?: string;
  profileCode?: string;
  lines: MaterialDetailsLineItem[];
  profileRows: ProfileCostSummaryRow[];
  materialTotal: number;
  labourTotal: number;
  overheadTotal: number;
  workshopTotal: number;
  isValid: boolean;
  error?: string;
};

export type MaterialDetailsJobResult = {
  jobId: string;
  projectName: string;
  customerName: string;
  generatedAt: string;
  /** Where line items came from — Quick Quote sheet takes priority when sizes are entered there. */
  source: "quick-quote" | "job-products";
  products: MaterialDetailsProduct[];
  grandMaterialTotal: number;
  grandLabourTotal: number;
  grandOverheadTotal: number;
  grandWorkshopTotal: number;
  totalAreaSqft: number;
  validProductCount: number;
};

export type MaterialDetailsPdfInput = MaterialDetailsJobResult;
