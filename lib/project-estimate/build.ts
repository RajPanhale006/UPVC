import { calculateProduct } from "@/lib/calculations";
import type { DoorHardwareMasterSettings } from "@/lib/door-hardware";
import type { WorkshopJob } from "@/lib/jobs";
import type { ProfileRateSettings } from "@/lib/profiles";
import { GST_PERCENT, shouldApplyGstInTotal } from "@/lib/quotation/defaults";
import { round2 } from "@/lib/quotation/calculate";
import type { GstMode } from "@/lib/quotation/types";
import type { CuttingJobMeta } from "@/lib/summary/types";

import type { ProjectEstimateLine, ProjectEstimateResult, ProjectEstimateSettings } from "./types";
import { describeProductSystem } from "./product-line-label";

function productLabel(product: WorkshopJob["products"][number]): string {
  if (product.label?.trim()) return product.label.trim();
  return product.productKind === "door" ? `Door ${product.id}` : `Window ${product.id}`;
}

export function buildProjectEstimate(
  job: WorkshopJob,
  profileRates: ProfileRateSettings,
  doorHardwareMaster: DoorHardwareMasterSettings,
  settings: ProjectEstimateSettings,
  gstMode: GstMode = job.quotation.gstMode,
): ProjectEstimateResult {
  const lines: ProjectEstimateLine[] = job.products.map((product) => {
    const meta: CuttingJobMeta = {
      ...job.cuttingJobMeta,
      windowLocation: product.location || job.cuttingJobMeta.windowLocation,
      jobName: product.label || job.cuttingJobMeta.jobName,
    };

    const result = calculateProduct({
      estimationInputs: product.estimationInputs,
      cuttingOptions: product.cuttingOptions,
      profileRates,
      cuttingJobMeta: meta,
      doorHardwareMaster,
    });

    if (!result.validation.isValid || !result.estimation) {
      return {
        productId: product.id,
        label: productLabel(product),
        productKind: product.productKind,
        systemLabel: describeProductSystem(
          product.productKind,
          product.estimationInputs,
          product.cuttingOptions,
        ),
        quantity: Math.max(1, product.estimationInputs.numberOfWindows || 1),
        widthMm: result.inputDimensions.widthMm,
        heightMm: result.inputDimensions.heightMm,
        areaSqft: 0,
        workshopTotal: 0,
        ratePerSqFt: 0,
        lineTotal: 0,
        isValid: false,
        error: result.validation.blockingMessage ?? "Calculation invalid",
      };
    }

    const qty = Math.max(1, product.estimationInputs.numberOfWindows || 1);
    const est = result.estimation;
    const workshopTotal =
      qty > 1 ? est.orderWorkshopTotal : est.workshopTotal;
    const ratePerSqFt = est.customerRateAvailable
      ? est.suggestedCustomerRatePerSqFt
      : est.baseRatePerSqftAfterProfit || est.costPerSqft || 0;

    const lineTotal =
      qty > 1 && est.customerBasePriceAvailable
        ? est.orderSuggestedCustomerBasePrice
        : est.customerBasePriceAvailable
          ? est.suggestedCustomerBasePrice
          : round2((result.inputDimensions.areaSqFt * qty * ratePerSqFt));

    return {
      productId: product.id,
      label: productLabel(product),
      productKind: product.productKind,
      systemLabel: describeProductSystem(
        product.productKind,
        product.estimationInputs,
        product.cuttingOptions,
      ),
      quantity: qty,
      widthMm: result.inputDimensions.widthMm,
      heightMm: result.inputDimensions.heightMm,
      areaSqft: round2(result.inputDimensions.areaSqFt * qty),
      workshopTotal: round2(workshopTotal),
      ratePerSqFt: round2(ratePerSqFt),
      lineTotal: round2(lineTotal),
      isValid: lineTotal > 0,
      error: lineTotal <= 0 ? "Customer rate unavailable — calculate and save first." : undefined,
    };
  });

  const validProductCount = lines.filter((l) => l.isValid).length;
  const invalidProductCount = lines.length - validProductCount;
  const productsSubtotal = round2(
    lines.filter((l) => l.isValid).reduce((sum, l) => sum + l.lineTotal, 0),
  );
  const totalWorkshopCost = round2(
    lines.filter((l) => l.isValid).reduce((sum, l) => sum + l.workshopTotal, 0),
  );

  const installationCharge = round2(Math.max(0, settings.installationCharge));
  const transportationCharge = round2(Math.max(0, settings.transportationCharge));
  const discountPercent = Math.min(100, Math.max(0, settings.discountPercent));

  const subtotalBeforeDiscount = round2(
    productsSubtotal + installationCharge + transportationCharge,
  );
  const discountAmount = round2(subtotalBeforeDiscount * (discountPercent / 100));
  const subtotalAfterDiscount = round2(subtotalBeforeDiscount - discountAmount);

  const gstAmount = shouldApplyGstInTotal(gstMode)
    ? round2(subtotalAfterDiscount * (GST_PERCENT / 100))
    : 0;
  const grandTotal = round2(subtotalAfterDiscount + gstAmount);

  return {
    lines,
    productsSubtotal,
    totalWorkshopCost,
    installationCharge,
    transportationCharge,
    discountPercent,
    discountAmount,
    subtotalBeforeDiscount,
    subtotalAfterDiscount,
    gstMode,
    gstPercent: GST_PERCENT,
    gstAmount,
    grandTotal,
    validProductCount,
    invalidProductCount,
  };
}
