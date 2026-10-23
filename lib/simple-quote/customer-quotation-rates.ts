import { round2 } from "@/lib/quotation/calculate";

import type { SimpleQuoteRowResult, SimpleQuoteTotals } from "./types";

export type CustomerQuotationRowRateOverride = {
  ratePerSqFt?: number;
  ratePerPiece?: number;
};

export type CustomerQuotationRateSettings = {
  /** When true, quotation uses calculated customer rates (margin applied). */
  useCalculatedRates: boolean;
  /** Single ₹/sq.ft for all area-based rows when not using calculated rates. */
  manualRatePerSqFt: number | null;
  /** Optional per-row overrides (used when per-line mode is enabled). */
  perRowOverrides: Record<string, CustomerQuotationRowRateOverride>;
  /** When true, use perRowOverrides instead of manualRatePerSqFt. */
  usePerRowRates: boolean;
};

const KEY_PREFIX = "upvc-customer-quotation-rates-";

export function getDefaultCustomerQuotationRateSettings(): CustomerQuotationRateSettings {
  return {
    useCalculatedRates: true,
    manualRatePerSqFt: null,
    perRowOverrides: {},
    usePerRowRates: false,
  };
}

export function loadCustomerQuotationRateSettings(jobId: string): CustomerQuotationRateSettings {
  if (typeof window === "undefined") {
    return getDefaultCustomerQuotationRateSettings();
  }

  const raw = window.localStorage.getItem(`${KEY_PREFIX}${jobId}`);
  if (!raw) {
    return getDefaultCustomerQuotationRateSettings();
  }

  try {
    const parsed = JSON.parse(raw) as Partial<CustomerQuotationRateSettings>;
    const defaults = getDefaultCustomerQuotationRateSettings();
    const perRowOverrides: Record<string, CustomerQuotationRowRateOverride> = {};

    if (parsed.perRowOverrides && typeof parsed.perRowOverrides === "object") {
      for (const [rowId, value] of Object.entries(parsed.perRowOverrides)) {
        if (!value || typeof value !== "object") continue;
        const override = value as CustomerQuotationRowRateOverride;
        perRowOverrides[rowId] = {
          ratePerSqFt:
            Number.isFinite(override.ratePerSqFt) && (override.ratePerSqFt ?? 0) >= 0
              ? override.ratePerSqFt
              : undefined,
          ratePerPiece:
            Number.isFinite(override.ratePerPiece) && (override.ratePerPiece ?? 0) >= 0
              ? override.ratePerPiece
              : undefined,
        };
      }
    }

    return {
      useCalculatedRates:
        typeof parsed.useCalculatedRates === "boolean"
          ? parsed.useCalculatedRates
          : defaults.useCalculatedRates,
      manualRatePerSqFt:
        Number.isFinite(parsed.manualRatePerSqFt) && (parsed.manualRatePerSqFt ?? 0) > 0
          ? (parsed.manualRatePerSqFt as number)
          : null,
      perRowOverrides,
      usePerRowRates:
        typeof parsed.usePerRowRates === "boolean" ? parsed.usePerRowRates : defaults.usePerRowRates,
    };
  } catch {
    return getDefaultCustomerQuotationRateSettings();
  }
}

export function saveCustomerQuotationRateSettings(
  jobId: string,
  settings: CustomerQuotationRateSettings,
): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(`${KEY_PREFIX}${jobId}`, JSON.stringify(settings));
}

function areaPerUnit(row: SimpleQuoteRowResult): number {
  const qty = Math.max(1, row.quantity);
  return row.areaSqft / qty;
}

function applyRowCustomerRate(
  row: SimpleQuoteRowResult,
  ratePerSqFt?: number,
  ratePerPiece?: number,
): SimpleQuoteRowResult {
  if (!row.isValid) return row;

  if (row.pricingMode === "lumpsum") {
    const piece = ratePerPiece ?? row.customerRatePerPiece ?? 0;
    if (piece <= 0) return row;
    const customerTotal = round2(piece * row.quantity);
    return {
      ...row,
      customerRatePerPiece: piece,
      customerTotal,
      profitAmount: round2(customerTotal - row.workshopTotal),
    };
  }

  const rate = ratePerSqFt ?? row.customerRatePerSqFt;
  if (rate <= 0) return row;

  const unitArea = areaPerUnit(row);
  const customerPerUnit = round2(unitArea * rate);
  const customerTotal = round2(customerPerUnit * row.quantity);

  return {
    ...row,
    customerRatePerSqFt: rate,
    customerTotal,
    profitAmount: round2(customerTotal - row.workshopTotal),
  };
}

function recomputeTotals(rows: SimpleQuoteRowResult[]): SimpleQuoteTotals {
  const validRows = rows.filter((row) => row.isValid);
  const totalAreaSqft = round2(validRows.reduce((sum, row) => sum + row.areaSqft, 0));
  const totalWorkshopCost = round2(validRows.reduce((sum, row) => sum + row.workshopTotal, 0));
  const totalCustomerAmount = round2(validRows.reduce((sum, row) => sum + row.customerTotal, 0));

  return {
    rows,
    totalAreaSqft,
    totalWorkshopCost,
    averageWorkshopRatePerSqFt:
      totalAreaSqft > 0 ? round2(totalWorkshopCost / totalAreaSqft) : 0,
    averageCustomerRatePerSqFt:
      totalAreaSqft > 0 ? round2(totalCustomerAmount / totalAreaSqft) : 0,
    totalCustomerAmount,
    totalProfitAmount: round2(validRows.reduce((sum, row) => sum + row.profitAmount, 0)),
    validRowCount: validRows.length,
    invalidRowCount: rows.length - validRows.length,
  };
}

/** Apply manual customer quotation rates on top of calculated Quick Quote totals. */
export function applyCustomerQuotationRates(
  totals: SimpleQuoteTotals,
  settings: CustomerQuotationRateSettings,
): SimpleQuoteTotals {
  const hasPerRowOverrides = Object.keys(settings.perRowOverrides).length > 0;
  if (settings.useCalculatedRates && !hasPerRowOverrides) {
    return totals;
  }

  const rows = totals.rows.map((row) => {
    if (!row.isValid) return row;

    const override = settings.perRowOverrides[row.rowId];
    if (settings.usePerRowRates && override) {
      return applyRowCustomerRate(row, override.ratePerSqFt, override.ratePerPiece);
    }

    if (!settings.useCalculatedRates && settings.manualRatePerSqFt != null && settings.manualRatePerSqFt > 0) {
      if (row.pricingMode === "lumpsum") {
        return row;
      }
      return applyRowCustomerRate(row, settings.manualRatePerSqFt);
    }

    if (override) {
      return applyRowCustomerRate(row, override.ratePerSqFt, override.ratePerPiece);
    }

    return row;
  });

  return recomputeTotals(rows);
}

export function buildPerRowOverridesFromTotals(
  totals: SimpleQuoteTotals,
): Record<string, CustomerQuotationRowRateOverride> {
  const overrides: Record<string, CustomerQuotationRowRateOverride> = {};
  for (const row of totals.rows) {
    if (!row.isValid) continue;
    if (row.pricingMode === "lumpsum") {
      overrides[row.rowId] = { ratePerPiece: row.customerRatePerPiece ?? 0 };
    } else {
      overrides[row.rowId] = { ratePerSqFt: row.customerRatePerSqFt };
    }
  }
  return overrides;
}
