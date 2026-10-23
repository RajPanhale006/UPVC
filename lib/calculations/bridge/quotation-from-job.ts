import type { CuttingOptions } from "@/lib/cutting/types";
import type { TrackSystemId } from "@/lib/cutting/types";
import { getProductKind, TRACK_LABELS } from "@/lib/estimation";
import type { EstimationInputs } from "@/lib/estimation/types";
import {
  createWindowRow,
  DEFAULT_RATES,
  type QuotationForm,
  type QuotationWindowRow,
  type WindowTypeId,
} from "@/lib/quotation";
import { formatQuotationIdWithRevision, generateQuotationId } from "@/lib/jobs/id-generator";
import { getQuotationDisplayId } from "@/lib/quotation/workflow";

import { buildPreviewDataFromEstimation } from "@/components/product-preview/preview-mapper";
import { calculateProduct } from "../calculate-product";
import type { ProfileRateSettings } from "@/lib/profiles/types";
import type { CuttingJobMeta } from "@/lib/summary/types";

const TRACK_TO_QUOTATION: Record<TrackSystemId, WindowTypeId> = {
  "2-track-t60": "2-track-upvc",
  "2.5-track-t60": "2.5-track-upvc",
  "3-track-t109": "3-track-upvc",
};

export type AddToQuotationInput = {
  estimationInputs: EstimationInputs;
  cuttingOptions: CuttingOptions;
  profileRates: ProfileRateSettings;
  cuttingJobMeta: CuttingJobMeta;
  quotationForm: QuotationForm;
  /** Job product ID — W-001 / D-001 */
  productId?: string;
  /** Optional rate override; defaults from quotation DEFAULT_RATES or estimation. */
  ratePerSqFt?: number;
};

export type AddToQuotationResult =
  | {
      ok: true;
      form: QuotationForm;
      row: QuotationWindowRow;
      message: string;
      duplicate?: false;
    }
  | {
      ok: false;
      message: string;
      duplicate?: false;
    }
  | {
      ok: false;
      duplicate: true;
      message: string;
      existingRow: QuotationWindowRow;
      pendingRow: QuotationWindowRow;
      form: QuotationForm;
    };

export type DuplicateResolution = "update" | "separate" | "cancel";

export function resolveDuplicateProductAdd(
  input: AddToQuotationInput,
  resolution: DuplicateResolution,
  existingRow: QuotationWindowRow,
  pendingRow: QuotationWindowRow,
): AddToQuotationResult {
  if (resolution === "cancel") {
    return { ok: false, message: "Add to quotation cancelled." };
  }

  const quotationId = input.quotationForm.quotationId ?? generateQuotationId();

  if (resolution === "update") {
    const form: QuotationForm = {
      ...input.quotationForm,
      quotationId,
      windows: input.quotationForm.windows.map((r) =>
        r.id === existingRow.id
          ? { ...pendingRow, id: existingRow.id, ratePerSqFt: existingRow.ratePerSqFt }
          : r,
      ),
    };
    return {
      ok: true,
      form,
      row: { ...pendingRow, id: existingRow.id },
      message: `Updated quotation item for product ${pendingRow.productId ?? ""}.`,
    };
  }

  const form: QuotationForm = {
    ...input.quotationForm,
    quotationId,
    windows: [...input.quotationForm.windows, pendingRow],
  };
  return {
    ok: true,
    form,
    row: pendingRow,
    message: `Product ${pendingRow.productId} added as a separate line to ${getQuotationDisplayId(form)}.`,
  };
}

/** Transfer the current cutting job into quotation — no demo/unrelated values. */
export function addCurrentProductToQuotation(
  input: AddToQuotationInput,
): AddToQuotationResult {
  const product = calculateProduct({
    estimationInputs: input.estimationInputs,
    cuttingOptions: input.cuttingOptions,
    profileRates: input.profileRates,
    cuttingJobMeta: input.cuttingJobMeta,
  });

  if (!product.validation.isValid) {
    return {
      ok: false,
      message:
        product.validation.blockingMessage ??
        "Fix calculation errors before adding to quotation.",
    };
  }

  const isDoor = getProductKind(input.estimationInputs) === "door";
  const isFixedFrame = getProductKind(input.estimationInputs) === "fixed-frame";
  const windowType: WindowTypeId = isDoor
    ? "upvc-door"
    : isFixedFrame
      ? "fixed-upvc-partition"
      : TRACK_TO_QUOTATION[input.estimationInputs.trackSystemId];

  const ratePerSqFt =
    input.ratePerSqFt ??
    (product.estimation?.customerRateAvailable
      ? product.estimation.suggestedCustomerRatePerSqFt
      : undefined) ??
    product.estimation?.baseRatePerSqftAfterProfit ??
    product.estimation?.costPerSqft ??
    input.quotationForm.windows.find((r) => r.windowType === windowType)?.ratePerSqFt ??
    DEFAULT_RATES[windowType] ??
    0;

  const row = createWindowRow(windowType);
  const location = input.cuttingJobMeta.windowLocation.trim();
  const title = input.cuttingJobMeta.jobName.trim();

  const previewData = buildPreviewDataFromEstimation(
    input.estimationInputs,
    input.cuttingOptions,
    product.profileCode,
  );

  const nextRow: QuotationWindowRow = {
    ...row,
    productId: input.productId,
    length: product.inputDimensions.widthMm,
    height: product.inputDimensions.heightMm,
    unit: "mm",
    quantity: product.inputDimensions.quantity,
    ratePerSqFt,
    calculationMethod: product.method.name,
    methodVersion: product.method.version,
    doorConfiguration: isDoor
      ? input.estimationInputs.doorSettings?.configuration
      : undefined,
    openingSide: isDoor ? input.estimationInputs.doorSettings?.openingSide : undefined,
    openingDirection: isDoor
      ? input.estimationInputs.doorSettings?.openingDirection
      : undefined,
    profileLabel: product.profileCode,
    glassPanelLabel: isDoor
      ? "Glass / panel"
      : isFixedFrame
        ? `${input.estimationInputs.fixedFrameSettings?.glassThicknessMm ?? 6} mm clear glass`
        : "Glass",
    hardwareNotes: isDoor
      ? `${input.estimationInputs.doorSettings?.configuration === "double" ? "Double" : "Single"} · ${input.estimationInputs.doorSettings?.openingSide} · ${input.estimationInputs.doorSettings?.openingDirection}`
      : isFixedFrame
        ? `${input.estimationInputs.fixedFrameSettings?.constructionMode ?? "SEPARATE_MODULES"} · ${input.estimationInputs.fixedFrameSettings?.moduleCount ?? 2} modules`
        : `${TRACK_LABELS[input.estimationInputs.trackSystemId]} · ${product.method.name}`,
    previewData,
  };

  if (location) {
    nextRow.hardwareNotes = [location, nextRow.hardwareNotes].filter(Boolean).join(" · ");
  }
  if (title && title !== "Window Job" && title !== "Door Job") {
    nextRow.profileLabel = title;
  }

  const quotationId = input.quotationForm.quotationId ?? generateQuotationId();
  const revision = input.quotationForm.revision ?? 1;

  if (input.productId) {
    const existing = input.quotationForm.windows.find(
      (r) => r.productId === input.productId,
    );
    if (existing) {
      return {
        ok: false,
        duplicate: true,
        message: `Product ${input.productId} is already in quotation ${formatQuotationIdWithRevision(quotationId, revision)}.`,
        existingRow: existing,
        pendingRow: nextRow,
        form: input.quotationForm,
      };
    }
  }

  const form: QuotationForm = {
    ...input.quotationForm,
    quotationId,
    revision,
    customerName: input.quotationForm.customerName || input.estimationInputs.customerName,
    windows: [...input.quotationForm.windows, nextRow],
  };

  const displayId = getQuotationDisplayId(form);
  const productLabel =
    input.productId ?? (isDoor ? "door" : isFixedFrame ? "fixed-frame" : "window");

  return {
    ok: true,
    form,
    row: nextRow,
    message: `Product ${productLabel} added to quotation ${displayId}.`,
  };
}
