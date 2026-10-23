import type { JobProduct } from "@/lib/jobs/types";
import type { ProfileRateSettings } from "@/lib/profiles/types";
import { buildSummaryForProduct } from "@/lib/summary/build-summary-for-product";
import type { CuttingJobMeta } from "@/lib/summary/types";
import type { EstimationInputs } from "@/lib/estimation/types";
import type { CuttingOptions } from "@/lib/cutting/types";

import { optimizeWorkshopJob } from "../optimize-workshop-job";
import type { LabourWorkingPdfInput } from "./types";

export function buildLabourWorkingPdfInput(input: {
  jobId: string;
  jobCode?: string;
  projectName?: string;
  products: JobProduct[];
  profileRates: ProfileRateSettings;
  estimationInputs: EstimationInputs;
  cuttingOptions: CuttingOptions;
  cuttingJobMeta: CuttingJobMeta;
  exportedAt?: string;
}): LabourWorkingPdfInput {
  const summary = buildSummaryForProduct({
    estimationInputs: input.estimationInputs,
    cuttingOptions: input.cuttingOptions,
    profileRates: input.profileRates,
    cuttingJobMeta: input.cuttingJobMeta,
  });

  const optimization = optimizeWorkshopJob({
    jobId: input.jobId,
    products: input.products,
    profileRates: input.profileRates,
  });

  return {
    summary,
    optimization,
    profileRates: input.profileRates,
    jobCode: input.jobCode,
    projectName: input.projectName,
    exportedAt: input.exportedAt ?? new Date().toISOString(),
  };
}
