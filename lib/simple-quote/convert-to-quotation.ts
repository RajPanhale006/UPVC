import { buildPreviewDataFromEstimation } from "@/components/product-preview/preview-mapper";
import { calculateProduct, getProductProfileCode } from "@/lib/calculations";
import { mmAreaToSqFt } from "@/lib/calculations/format";
import type { DoorHardwareMasterSettings } from "@/lib/door-hardware";
import type { WorkshopJob } from "@/lib/jobs";
import type { ProjectEstimateSettings } from "@/lib/project-estimate/types";
import type { ProfileRateSettings } from "@/lib/profiles";
import { round2 } from "@/lib/quotation/calculate";
import type { QuotationForm, QuotationWindowRow, WindowTypeId } from "@/lib/quotation";
import { createCustomCharge } from "@/lib/quotation/workflow";
import { TRACK_LABELS } from "@/lib/estimation";

import { isLowersProduct } from "./lowers-pricing";
import { getSimpleQuoteProductLabel } from "./product-types";
import { rowToProductInputs } from "./row-to-product";
import type { SimpleQuoteRateSettings } from "./rate-settings";
import type { SimpleQuoteProductType, SimpleQuoteRow, SimpleQuoteRowResult, SimpleQuoteTotals } from "./types";

export type ConvertSimpleQuoteToQuotationResult =
  | { ok: true; form: QuotationForm; message: string; addedCount: number }
  | { ok: false; message: string };

function createRowId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `qq-row-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function quoteProductTypeToWindowType(type: SimpleQuoteProductType): WindowTypeId {
  switch (type) {
    case "2-track":
      return "2-track-upvc";
    case "2.5-track":
      return "2.5-track-upvc";
    case "3-track-2g1n":
    case "3-track-3g":
      return "3-track-upvc";
    case "single-door":
    case "double-door":
      return "upvc-door";
    case "fixed-frame":
      return "fixed-upvc-partition";
    case "lowers":
      return "openable-single-glass";
    default:
      return "3-track-upvc";
  }
}

function sashLabelForProductType(type: SimpleQuoteProductType): string {
  switch (type) {
    case "2-track":
      return "2 Glass sliding sashes";
    case "2.5-track":
      return "2 Glass + 1 Net";
    case "3-track-2g1n":
      return "2 Glass + 1 Net";
    case "3-track-3g":
      return "3 Glass (no net)";
    default:
      return getSimpleQuoteProductLabel(type);
  }
}

function resolveRatePerSqFt(result: SimpleQuoteRowResult): number {
  const areaPerUnit = mmAreaToSqFt(result.widthMm, result.heightMm);
  if (result.pricingMode === "lumpsum") {
    const perPiece = result.customerRatePerPiece ?? 0;
    return areaPerUnit > 0 ? round2(perPiece / areaPerUnit) : 0;
  }
  return result.customerRatePerSqFt;
}

function buildQuotationRowFromQuoteLine(input: {
  row: SimpleQuoteRow;
  result: SimpleQuoteRowResult;
  profileRates: ProfileRateSettings;
  doorHardwareMaster: DoorHardwareMasterSettings;
  cuttingJobMeta: WorkshopJob["cuttingJobMeta"];
  rateSettings?: SimpleQuoteRateSettings;
}): QuotationWindowRow | null {
  const { row, result, profileRates, doorHardwareMaster, cuttingJobMeta, rateSettings } =
    input;

  const windowType = quoteProductTypeToWindowType(row.productType);
  const ratePerSqFt = resolveRatePerSqFt(result);
  if (ratePerSqFt <= 0) return null;

  const label = getSimpleQuoteProductLabel(row.productType);
  let previewData: QuotationWindowRow["previewData"];
  let calculationMethod: string | undefined;
  let methodVersion: string | undefined;
  let profileLabel = label;
  let glassPanelLabel = "Glass";
  let hardwareNotes = sashLabelForProductType(row.productType);
  let doorConfiguration: QuotationWindowRow["doorConfiguration"];
  let openingSide: QuotationWindowRow["openingSide"];
  let openingDirection: QuotationWindowRow["openingDirection"];

  if (!isLowersProduct(row.productType)) {
    const { estimationInputs, cuttingOptions } = rowToProductInputs(
      row,
      profileRates,
      rateSettings,
    );
    const calc = calculateProduct({
      estimationInputs,
      cuttingOptions,
      profileRates,
      cuttingJobMeta,
      doorHardwareMaster,
    });

    if (calc.validation.isValid) {
      const profileCode = getProductProfileCode(calc);
      previewData = buildPreviewDataFromEstimation(
        estimationInputs,
        cuttingOptions,
        profileCode,
      );
      calculationMethod = calc.method.name;
      methodVersion = calc.method.version;
      profileLabel = profileCode;

      if (row.productType === "single-door" || row.productType === "double-door") {
        doorConfiguration = estimationInputs.doorSettings?.configuration;
        openingSide = estimationInputs.doorSettings?.openingSide;
        openingDirection = estimationInputs.doorSettings?.openingDirection;
        glassPanelLabel = "Glass / panel";
        hardwareNotes = `${doorConfiguration === "double" ? "Double" : "Single"} · ${openingSide} · ${openingDirection}`;
      } else if (row.productType === "fixed-frame") {
        glassPanelLabel = `${estimationInputs.fixedFrameSettings?.glassThicknessMm ?? 6} mm clear glass`;
        hardwareNotes = `${estimationInputs.fixedFrameSettings?.constructionMode ?? "SEPARATE_MODULES"} · ${estimationInputs.fixedFrameSettings?.moduleCount ?? 2} modules`;
      } else {
        hardwareNotes = `${TRACK_LABELS[estimationInputs.trackSystemId]} · ${calc.method.name}`;
      }
    }
  } else if (result.pricingNote) {
    hardwareNotes = result.pricingNote;
  }

  return {
    id: createRowId(),
    productId: `qq-${row.id}`,
    windowType,
    length: Math.round(result.widthMm),
    height: Math.round(result.heightMm),
    unit: "mm",
    quantity: result.quantity,
    ratePerSqFt,
    description:
      isLowersProduct(row.productType) && result.pricingNote
        ? `${getSimpleQuoteProductLabel(row.productType)} — ${result.pricingNote}`
        : getSimpleQuoteProductLabel(row.productType),
    doorConfiguration,
    openingSide,
    openingDirection,
    profileLabel,
    glassPanelLabel,
    hardwareNotes,
    calculationMethod,
    methodVersion,
    previewData,
  };
}

/** Map Quick Quote calculated rows directly into quotation — preserves sizes, qty and customer rates. */
export function convertSimpleQuoteToQuotation(input: {
  job: WorkshopJob;
  rows: SimpleQuoteRow[];
  totals: SimpleQuoteTotals;
  quotationForm: QuotationForm;
  profileRates: ProfileRateSettings;
  doorHardwareMaster: DoorHardwareMasterSettings;
  rateSettings?: SimpleQuoteRateSettings;
  settings?: ProjectEstimateSettings;
  replaceExisting?: boolean;
}): ConvertSimpleQuoteToQuotationResult {
  const {
    job,
    rows,
    totals,
    profileRates,
    doorHardwareMaster,
    rateSettings,
    settings,
  } = input;

  const validResults = totals.rows.filter((row) => row.isValid);
  if (validResults.length === 0) {
    return {
      ok: false,
      message: "No valid rows to add. Enter sizes and calculate first.",
    };
  }

  const rowById = new Map(rows.map((row) => [row.id, row]));
  const windows: QuotationWindowRow[] = [];

  for (const result of validResults) {
    const sourceRow = rowById.get(result.rowId);
    if (!sourceRow) continue;

    const quoteRow = buildQuotationRowFromQuoteLine({
      row: sourceRow,
      result,
      profileRates,
      doorHardwareMaster,
      cuttingJobMeta: job.cuttingJobMeta,
      rateSettings,
    });

    if (quoteRow) {
      windows.push(quoteRow);
    }
  }

  if (windows.length === 0) {
    return {
      ok: false,
      message: "Could not build quotation lines from Quick Quote rows.",
    };
  }

  const customCharges = (input.quotationForm.customCharges ?? []).filter(
    (c) => c.type !== "installation",
  );
  if (settings && settings.installationCharge > 0) {
    customCharges.push(createCustomCharge("installation", settings.installationCharge));
  }

  const form: QuotationForm = {
    ...input.quotationForm,
    windows: input.replaceExisting !== false ? windows : [...input.quotationForm.windows, ...windows],
    customerName: input.quotationForm.customerName || job.customerName,
    customerAddress: input.quotationForm.customerAddress || job.billingAddress,
    customerPhone: input.quotationForm.customerPhone || job.customerPhone,
    transportationCharge: settings?.transportationCharge ?? input.quotationForm.transportationCharge,
    discountPercent: settings?.discountPercent ?? input.quotationForm.discountPercent,
    customCharges,
    status: input.quotationForm.status ?? "draft",
  };

  return {
    ok: true,
    form,
    addedCount: windows.length,
    message: `${windows.length} Quick Quote line(s) added to quotation with sizes and customer rates.`,
  };
}
