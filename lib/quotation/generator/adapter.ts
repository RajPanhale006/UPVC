import { calculateQuotation } from "@/lib/quotation/calculate";
import { GST_PERCENT, shouldApplyGstInTotal } from "@/lib/quotation/defaults";
import type { QuotationForm, QuotationResult, WindowTypeId } from "@/lib/quotation/types";

import type { QuotationGeneratorInput, QuotationItemInput, QuotationProductType } from "./types";

const WINDOW_TYPE_TO_PRODUCT: Record<WindowTypeId, QuotationProductType> = {
  "2-track-upvc": "2-track",
  "2.5-track-upvc": "3-track-2glass-1mesh",
  "3-track-upvc": "3-track-2glass-1mesh",
  "openable-single-glass": "lowers",
  "fixed-glass": "fix-frame",
  "fixed-upvc-partition": "partition",
  "upvc-door": "door",
};

function mapUnit(unit: QuotationForm["windows"][number]["unit"]): QuotationItemInput["unit"] {
  if (unit === "feet") return "feet";
  if (unit === "inch") return "inch";
  return "mm";
}

export function windowTypeToProductType(windowType: WindowTypeId): QuotationProductType {
  return WINDOW_TYPE_TO_PRODUCT[windowType] ?? "2-track";
}

/** Convert existing quotation form/result into generator input. */
export function quotationResultToGeneratorInput(result: QuotationResult): QuotationGeneratorInput {
  const { form, totals } = result;

  const items: QuotationItemInput[] = result.groups.flatMap((group) =>
    group.rows.map((row) => ({
      id: row.id,
      productType: windowTypeToProductType(row.windowType),
      width: row.length,
      height: row.height,
      unit: mapUnit(row.unit),
      quantity: row.quantity,
      pricingMode: "sqft" as const,
      rate: row.ratePerSqFt,
    })),
  );

  const extraCharges = (form.customCharges ?? [])
    .filter((charge) => charge.amount > 0)
    .map((charge) => ({
      label: charge.description?.trim() || charge.type,
      amount: charge.amount,
    }));

  const gstEnabled = shouldApplyGstInTotal(form.gstMode);
  const gst =
    gstEnabled && totals.gstAmount > 0
      ? {
          enabled: true,
          percent: totals.gstPercent ?? GST_PERCENT,
          label: `GST ${totals.gstPercent ?? GST_PERCENT} %`,
        }
      : null;

  return {
    quotationDate: form.quotationDate,
    customerName: form.customerName,
    customerAddress: form.customerAddress,
    customerPhone: form.customerPhone,
    subject: form.subject,
    terms: form.termOverrides?.length ? form.termOverrides : undefined,
    items,
    transportationCharge: totals.transportationCharge,
    extraCharges,
    discountPercent: form.discountPercent ?? 0,
    gst,
  };
}

export function quotationFormToGeneratorInput(form: QuotationForm): QuotationGeneratorInput {
  return quotationResultToGeneratorInput(calculateQuotation(form));
}
