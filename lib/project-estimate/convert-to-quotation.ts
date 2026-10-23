import { addCurrentProductToQuotation } from "@/lib/calculations/bridge/quotation-from-job";
import type { DoorHardwareMasterSettings } from "@/lib/door-hardware";
import type { WorkshopJob } from "@/lib/jobs";
import type { ProfileRateSettings } from "@/lib/profiles";
import type { QuotationForm } from "@/lib/quotation";
import { createCustomCharge } from "@/lib/quotation/workflow";

import type { ProjectEstimateSettings } from "./types";

export type ConvertToQuotationResult =
  | { ok: true; form: QuotationForm; message: string; addedCount: number }
  | { ok: false; message: string };

/** Sync all job products into quotation and apply project estimate charges. */
export function convertProjectEstimateToQuotation(input: {
  job: WorkshopJob;
  quotationForm: QuotationForm;
  profileRates: ProfileRateSettings;
  doorHardwareMaster: DoorHardwareMasterSettings;
  settings: ProjectEstimateSettings;
  replaceExisting?: boolean;
}): ConvertToQuotationResult {
  const { job, profileRates, doorHardwareMaster, settings } = input;
  const productIds = new Set(job.products.map((p) => p.id));
  let form: QuotationForm = {
    ...input.quotationForm,
    windows: input.replaceExisting
      ? []
      : input.quotationForm.windows.filter(
          (r) => !r.productId || !productIds.has(r.productId),
        ),
  };

  let addedCount = 0;

  for (const product of job.products) {
    const meta = {
      ...job.cuttingJobMeta,
      windowLocation: product.location || job.cuttingJobMeta.windowLocation,
      jobName: product.label || job.cuttingJobMeta.jobName,
    };

    const result = addCurrentProductToQuotation({
      estimationInputs: product.estimationInputs,
      cuttingOptions: product.cuttingOptions,
      profileRates,
      cuttingJobMeta: meta,
      quotationForm: form,
      productId: product.id,
    });

    if (result.ok) {
      form = result.form;
      addedCount += 1;
    }
  }

  if (addedCount === 0) {
    return {
      ok: false,
      message: "No valid products to add. Calculate and save each product first.",
    };
  }

  const customCharges = (form.customCharges ?? []).filter((c) => c.type !== "installation");
  if (settings.installationCharge > 0) {
    customCharges.push(createCustomCharge("installation", settings.installationCharge));
  }

  form = {
    ...form,
    customerName: form.customerName || job.customerName,
    customerAddress: form.customerAddress || job.billingAddress,
    customerPhone: form.customerPhone || job.customerPhone,
    transportationCharge: settings.transportationCharge,
    discountPercent: settings.discountPercent,
    customCharges,
    status: form.status ?? "draft",
  };

  return {
    ok: true,
    form,
    addedCount,
    message: `${addedCount} product(s) added to quotation with installation, transport and discount applied.`,
  };
}
