import { buildPreviewDataFromEstimation } from "@/components/product-preview/preview-mapper";
import { calculateProduct, getProductProfileCode } from "@/lib/calculations";
import type { DoorHardwareMasterSettings } from "@/lib/door-hardware";
import { appendActivity } from "@/lib/jobs/activity";
import { createDefaultCuttingJobMeta, createProductFromEstimation } from "@/lib/jobs/products";
import type { JobProduct, WorkshopJob } from "@/lib/jobs";
import type { ProfileRateSettings } from "@/lib/profiles";
import type { CuttingJobMeta } from "@/lib/summary/types";

import { calculateSimpleQuoteRows } from "./calculate-rows";
import { isLowersProduct } from "./lowers-pricing";
import { getSimpleQuoteProductLabel } from "./product-types";
import { rowToProductInputs } from "./row-to-product";
import type { SimpleQuoteRateSettings } from "./rate-settings";
import type { SimpleQuoteRow } from "./types";

export type SyncSimpleQuoteResult =
  | { ok: true; job: WorkshopJob; syncedCount: number; message: string }
  | { ok: false; message: string };

export function syncSimpleQuoteRowsToJob(
  job: WorkshopJob,
  rows: SimpleQuoteRow[],
  profileRates: ProfileRateSettings,
  doorHardwareMaster: DoorHardwareMasterSettings,
  userName: string,
  rateSettings?: SimpleQuoteRateSettings,
): SyncSimpleQuoteResult {
  const totals = calculateSimpleQuoteRows(
    rows,
    profileRates,
    doorHardwareMaster,
    job.cuttingJobMeta,
    rateSettings,
  );

  if (totals.validRowCount === 0) {
    return {
      ok: false,
      message: "No valid rows to sync. Enter sizes and calculate first.",
    };
  }

  const validRowIds = new Set(
    totals.rows.filter((row) => row.isValid).map((row) => row.rowId),
  );
  const validRows = rows.filter((row) => validRowIds.has(row.id));

  const products: JobProduct[] = [];
  const existingIds: string[] = [];

  for (const row of validRows) {
    if (isLowersProduct(row.productType)) continue;

    const { estimationInputs, cuttingOptions, productKind } = rowToProductInputs(
      row,
      profileRates,
      rateSettings,
    );
    const label = `${getSimpleQuoteProductLabel(row.productType)} — ${Math.round(
      totals.rows.find((result) => result.rowId === row.id)?.widthMm ?? 0,
    )}×${Math.round(
      totals.rows.find((result) => result.rowId === row.id)?.heightMm ?? 0,
    )} mm`;

    const meta: CuttingJobMeta = {
      ...job.cuttingJobMeta,
      jobName: label,
    };

    const calc = calculateProduct({
      estimationInputs,
      cuttingOptions,
      profileRates,
      cuttingJobMeta: meta,
      doorHardwareMaster,
    });

    if (!calc.validation.isValid) continue;

    const base = createProductFromEstimation(
      job.id,
      productKind,
      estimationInputs,
      existingIds,
      label,
    );
    existingIds.push(base.id);

    const profileCode = getProductProfileCode(calc);
    const previewData = buildPreviewDataFromEstimation(
      estimationInputs,
      cuttingOptions,
      profileCode,
    );

    products.push({
      ...base,
      cuttingOptions,
      calculationMethod: calc.method.name,
      methodVersion: calc.method.version,
      previewData,
      areaSqft: calc.inputDimensions.areaSqFt,
      ratePerSqft: calc.estimation?.costPerSqft,
    });
  }

  if (products.length === 0) {
    const lowersOnly = validRows.every((row) => isLowersProduct(row.productType));
    return {
      ok: false,
      message: lowersOnly
        ? "Lowers are lumpsum lines in Quick Quote — use PDF export or add sliding window/door rows to sync."
        : "Could not build products from quote rows.",
    };
  }

  const nextJob: WorkshopJob = {
    ...job,
    products,
    activeProductId: products[0]?.id ?? null,
    cuttingJobMeta: createDefaultCuttingJobMeta(products[0]?.productKind ?? "window"),
    updatedAt: new Date().toISOString(),
  };

  const withActivity = appendActivity(
    nextJob,
    "product-edited",
    `${products.length} product(s) synced from Quick Quote Sheet`,
    userName,
  );

  return {
    ok: true,
    job: withActivity,
    syncedCount: products.length,
    message: `${products.length} product(s) saved to ${job.id}.`,
  };
}
