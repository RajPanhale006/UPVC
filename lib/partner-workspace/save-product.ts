import { buildPreviewDataFromEstimation } from "@/components/product-preview/preview-mapper";
import { calculateProduct, getProductProfileCode } from "@/lib/calculations";
import type { CuttingOptions } from "@/lib/cutting/types";
import type { EstimationInputs } from "@/lib/estimation/types";
import type { ProfileRateSettings } from "@/lib/profiles/types";
import type { CuttingJobMeta } from "@/lib/summary/types";

import { appendActivity } from "@/lib/jobs/activity";
import {
  getActiveProduct,
  syncActiveProductToJob,
} from "@/lib/jobs/products";
import type { WorkshopJob } from "@/lib/jobs";

export type SavePartnerProductResult =
  | { ok: true; job: WorkshopJob; message: string; productId: string }
  | { ok: false; message: string };

export function savePartnerProductToJob(
  job: WorkshopJob,
  estimationInputs: EstimationInputs,
  cuttingOptions: CuttingOptions,
  cuttingJobMeta: CuttingJobMeta,
  profileRates: ProfileRateSettings,
  userName: string,
): SavePartnerProductResult {
  const active = getActiveProduct(job);
  if (!active) {
    return { ok: false, message: "No active product slot. Create a new product first." };
  }

  const product = calculateProduct({
    estimationInputs,
    cuttingOptions,
    profileRates,
    cuttingJobMeta,
  });

  if (!product.validation.isValid) {
    return {
      ok: false,
      message:
        product.validation.blockingMessage ??
        "Fix calculation errors before saving to the job.",
    };
  }

  const profileCode = getProductProfileCode(product);
  const previewData = buildPreviewDataFromEstimation(
    estimationInputs,
    cuttingOptions,
    profileCode,
  );

  let next = syncActiveProductToJob(job, estimationInputs, cuttingOptions, cuttingJobMeta);
  const syncedActive = getActiveProduct(next);
  if (!syncedActive) {
    return { ok: false, message: "Could not sync product to job." };
  }

  const enriched = {
    ...syncedActive,
    calculationMethod: product.method.name,
    methodVersion: product.method.version,
    previewData,
    areaSqft: product.inputDimensions.areaSqFt,
    ratePerSqft: product.estimation?.costPerSqft,
  };

  next = {
    ...next,
    products: next.products.map((p) => (p.id === enriched.id ? enriched : p)),
    updatedAt: new Date().toISOString(),
  };

  const label =
    enriched.productKind === "door"
      ? `Door ${enriched.id}`
      : `Window ${enriched.id}`;

  next = appendActivity(
    next,
    "product-edited",
    `${label} saved from Smart Estimation Center`,
    userName,
    enriched.id,
  );

  return {
    ok: true,
    job: next,
    productId: enriched.id,
    message: `${label} saved to ${job.id}.`,
  };
}
