import { calculateProduct } from "@/lib/calculations";
import { mmAreaToSqFt } from "@/lib/calculations/format";
import { round2 } from "@/lib/quotation/calculate";
import type { DoorHardwareMasterSettings } from "@/lib/door-hardware";
import type { ProfileRateSettings } from "@/lib/profiles";
import type { CuttingJobMeta } from "@/lib/summary/types";

import {
  formatLowersPricingNote,
  isLowersProduct,
  resolveLowersRatePerPiece,
} from "./lowers-pricing";
import { rowHasDimensions, getRowHeightMm, getRowWidthMm } from "./row-dimensions";
import { getSimpleQuoteProductLabel } from "./product-types";
import { rowToProductInputs } from "./row-to-product";
import {
  getDefaultSimpleQuoteRateSettings,
  type SimpleQuoteRateSettings,
} from "./rate-settings";
import type { SimpleQuoteRow, SimpleQuoteTotals } from "./types";

function hasDimensions(row: SimpleQuoteRow): boolean {
  return rowHasDimensions(row);
}

function calculateLowersRow(
  row: SimpleQuoteRow,
  rateSettings: SimpleQuoteRateSettings,
): SimpleQuoteTotals["rows"][number] {
  const label = getSimpleQuoteProductLabel(row.productType);
  const qty = Math.max(1, row.quantity);
  const widthMm = getRowWidthMm(row);
  const heightMm = getRowHeightMm(row);
  const areaSqft = round2(mmAreaToSqFt(widthMm, heightMm) * qty);
  const { ratePerPiece, tier } = resolveLowersRatePerPiece(row, rateSettings);
  const customerTotal = round2(ratePerPiece * qty);

  if (ratePerPiece <= 0) {
    return {
      rowId: row.id,
      label,
      productType: row.productType,
      quantity: qty,
      widthMm,
      heightMm,
      areaSqft,
      workshopTotal: 0,
      workshopRatePerSqFt: 0,
      customerRatePerSqFt: 0,
      customerTotal: 0,
      profitAmount: 0,
      pricingMode: "lumpsum" as const,
      customerRatePerPiece: 0,
      pricingNote: formatLowersPricingNote(tier, ratePerPiece),
      isValid: false,
      error: "Enter a valid Lowers rate per piece.",
    };
  }

  return {
    rowId: row.id,
    label,
    productType: row.productType,
    quantity: qty,
    widthMm,
    heightMm,
    areaSqft,
    workshopTotal: customerTotal,
    workshopRatePerSqFt: 0,
    customerRatePerSqFt: 0,
    customerTotal,
    profitAmount: 0,
    pricingMode: "lumpsum" as const,
    customerRatePerPiece: ratePerPiece,
    pricingNote: formatLowersPricingNote(tier, ratePerPiece),
    isValid: true,
  };
}

export function calculateSimpleQuoteRows(
  rows: SimpleQuoteRow[],
  profileRates: ProfileRateSettings,
  doorHardwareMaster: DoorHardwareMasterSettings,
  cuttingJobMeta: CuttingJobMeta,
  rateSettings?: SimpleQuoteRateSettings,
): SimpleQuoteTotals {
  const settings = rateSettings ?? getDefaultSimpleQuoteRateSettings();

  const results = rows.map((row) => {
    const label = getSimpleQuoteProductLabel(row.productType);
    const qty = Math.max(1, row.quantity);

    if (!hasDimensions(row)) {
      return {
        rowId: row.id,
        label,
        productType: row.productType,
        quantity: qty,
        widthMm: 0,
        heightMm: 0,
        areaSqft: 0,
        workshopTotal: 0,
        workshopRatePerSqFt: 0,
        customerRatePerSqFt: 0,
        customerTotal: 0,
        profitAmount: 0,
        isValid: false,
        error: "Enter width and height.",
      };
    }

    if (isLowersProduct(row.productType)) {
      return calculateLowersRow(row, settings);
    }

    const { estimationInputs, cuttingOptions } = rowToProductInputs(
      row,
      profileRates,
      settings,
    );
    const result = calculateProduct({
      estimationInputs,
      cuttingOptions,
      profileRates,
      cuttingJobMeta,
      doorHardwareMaster,
    });

    if (!result.validation.isValid || !result.estimation) {
      return {
        rowId: row.id,
        label,
        productType: row.productType,
        quantity: qty,
        widthMm: result.inputDimensions.widthMm,
        heightMm: result.inputDimensions.heightMm,
        areaSqft: 0,
        workshopTotal: 0,
        workshopRatePerSqFt: 0,
        customerRatePerSqFt: 0,
        customerTotal: 0,
        profitAmount: 0,
        isValid: false,
        error: result.validation.blockingMessage ?? "Calculation failed.",
      };
    }

    const est = result.estimation;
    const areaPerUnit = result.inputDimensions.areaSqFt;
    const workshopPerUnit = est.workshopTotal;
    const customerPerUnit =
      est.customerBasePriceAvailable && est.suggestedCustomerBasePrice > 0
        ? est.suggestedCustomerBasePrice
        : round2(
            areaPerUnit *
              (est.baseRatePerSqftAfterProfit || est.costPerSqft || 0),
          );

    const workshopRatePerSqFt =
      areaPerUnit > 0 ? round2(workshopPerUnit / areaPerUnit) : round2(est.costPerSqft);
    const customerRatePerSqFt =
      areaPerUnit > 0 ? round2(customerPerUnit / areaPerUnit) : 0;

    const workshopTotal = round2(workshopPerUnit * qty);
    const customerTotal = round2(customerPerUnit * qty);

    return {
      rowId: row.id,
      label,
      productType: row.productType,
      quantity: qty,
      widthMm: result.inputDimensions.widthMm,
      heightMm: result.inputDimensions.heightMm,
      areaSqft: round2(areaPerUnit * qty),
      workshopTotal,
      workshopRatePerSqFt,
      customerRatePerSqFt,
      customerTotal,
      profitAmount: round2(customerTotal - workshopTotal),
      pricingMode: "area" as const,
      isValid: customerTotal > 0,
      error: customerTotal <= 0 ? "Customer rate unavailable." : undefined,
    };
  });

  const validRows = results.filter((row) => row.isValid);

  const totalAreaSqft = round2(validRows.reduce((sum, row) => sum + row.areaSqft, 0));
  const totalWorkshopCost = round2(validRows.reduce((sum, row) => sum + row.workshopTotal, 0));
  const totalCustomerAmount = round2(validRows.reduce((sum, row) => sum + row.customerTotal, 0));

  return {
    rows: results,
    totalAreaSqft,
    totalWorkshopCost,
    averageWorkshopRatePerSqFt:
      totalAreaSqft > 0 ? round2(totalWorkshopCost / totalAreaSqft) : 0,
    averageCustomerRatePerSqFt:
      totalAreaSqft > 0 ? round2(totalCustomerAmount / totalAreaSqft) : 0,
    totalCustomerAmount,
    totalProfitAmount: round2(validRows.reduce((sum, row) => sum + row.profitAmount, 0)),
    validRowCount: validRows.length,
    invalidRowCount: results.length - validRows.length,
  };
}
