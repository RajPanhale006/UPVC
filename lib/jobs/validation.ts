import type { CuttingOptions } from "@/lib/cutting/types";
import type { EstimationInputs } from "@/lib/estimation/types";
import type { ProfileRateSettings } from "@/lib/profiles/types";
import type { QuotationResult } from "@/lib/quotation/types";
import type { CuttingJobMeta } from "@/lib/summary/types";

import { calculateProduct } from "@/lib/calculations/calculate-product";

export type ValidationIssue = {
  id: string;
  label: string;
  ok: boolean;
  message?: string;
};

export type DocumentValidationContext = {
  documentType:
    | "labour-cutting"
    | "internal-estimation"
    | "standard-quotation"
    | "premium-proposal"
    | "workshop-cost-summary"
    | "profile-weight-summary";
  job: {
    customerName: string;
    customerPhone: string;
    billingAddress: string;
    projectName: string;
  };
  estimationInputs?: EstimationInputs;
  cuttingOptions?: CuttingOptions;
  profileRates?: ProfileRateSettings;
  cuttingJobMeta?: CuttingJobMeta;
  quotationResult?: QuotationResult;
  companyName?: string;
};

export function validateBeforeDocument(
  ctx: DocumentValidationContext,
): { ok: boolean; issues: ValidationIssue[] } {
  const issues: ValidationIssue[] = [];

  const isCustomerDoc =
    ctx.documentType === "standard-quotation" || ctx.documentType === "premium-proposal";
  const isLabour = ctx.documentType === "labour-cutting";
  const isEstimation = ctx.documentType === "internal-estimation";
  const isQuotation = ctx.documentType === "standard-quotation";

  if (isCustomerDoc || isQuotation) {
    issues.push({
      id: "customer-name",
      label: "Customer name",
      ok: Boolean(ctx.job.customerName.trim()),
      message: "Customer name is required",
    });
    if (isCustomerDoc) {
      issues.push({
        id: "customer-phone",
        label: "Customer phone",
        ok: Boolean(ctx.job.customerPhone.trim()),
        message: "Customer phone recommended for sharing",
      });
    }
  }

  if (ctx.estimationInputs && ctx.cuttingOptions && ctx.profileRates && ctx.cuttingJobMeta) {
    const product = calculateProduct({
      estimationInputs: ctx.estimationInputs,
      cuttingOptions: ctx.cuttingOptions,
      profileRates: ctx.profileRates,
      cuttingJobMeta: ctx.cuttingJobMeta,
    });

    issues.push({
      id: "dimensions",
      label: "Product dimensions",
      ok: product.validation.isValid,
      message: product.validation.blockingMessage ?? undefined,
    });

    if (isEstimation) {
      issues.push({
        id: "internal-rates",
        label: "Internal profile rates",
        ok: ctx.profileRates.marketRatePerKg > 0,
        message: "Profile market rate must be set",
      });
    }
  }

  if (isQuotation && ctx.quotationResult) {
    issues.push({
      id: "quotation-lines",
      label: "Quotation line items",
      ok: ctx.quotationResult.form.windows.length > 0,
      message: "Add at least one product line",
    });
    issues.push({
      id: "quotation-total",
      label: "Grand total",
      ok: ctx.quotationResult.totals.grandTotal > 0,
      message: "Grand total must be positive",
    });
    const missingRates = ctx.quotationResult.form.windows.some((r) => r.ratePerSqFt <= 0);
    issues.push({
      id: "customer-rates",
      label: "Customer rates",
      ok: !missingRates,
      message: "All line items need a customer rate",
    });
  }

  if (isLabour) {
    // Pricing not required for labour sheets — dimension validation only
  }

  issues.push({
    id: "company-name",
    label: "Company name",
    ok: Boolean(ctx.companyName?.trim()),
    message: "Configure company settings",
  });

  const ok = issues.every((i) => i.ok || i.id === "customer-phone");
  return { ok, issues };
}
