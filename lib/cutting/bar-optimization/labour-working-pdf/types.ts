import type { ProfileRateSettings } from "@/lib/profiles/types";
import type { PdfPreviewRenderResult } from "@/lib/preview/pdf-embed";
import type { SummaryData } from "@/lib/summary/types";

import type { WorkshopJobOptimizationResult } from "../optimize-workshop-job";

export type LabourWorkingPdfInput = {
  summary: SummaryData;
  optimization: WorkshopJobOptimizationResult;
  profileRates: ProfileRateSettings;
  jobCode?: string;
  projectName?: string;
  exportedAt?: string;
  previews?: Map<string, PdfPreviewRenderResult>;
};
