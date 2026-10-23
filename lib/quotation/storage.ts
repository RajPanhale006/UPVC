import { getDefaultQuotationForm, shouldApplyGstInTotal } from "./defaults";
import type { GstMode, PdfPageMode, QuotationForm } from "./types";

const STORAGE_KEY = "upvc-workshop-quotation";

type LegacyQuotationForm = Partial<QuotationForm> & {
  includeGst?: boolean;
};

function normalizeGstMode(parsed: LegacyQuotationForm, fallback: GstMode): GstMode {
  if (
    parsed.gstMode === "apply" ||
    parsed.gstMode === "exclude" ||
    parsed.gstMode === "terms-only"
  ) {
    return parsed.gstMode;
  }
  if (parsed.includeGst === true) return "apply";
  if (parsed.includeGst === false) return "exclude";
  return fallback;
}

function normalizePdfPageMode(parsed: LegacyQuotationForm, fallback: PdfPageMode): PdfPageMode {
  if (parsed.pdfPageMode === "single" || parsed.pdfPageMode === "dual") {
    return parsed.pdfPageMode;
  }
  return fallback;
}

export function loadQuotationForm(): QuotationForm {
  if (typeof window === "undefined") {
    return getDefaultQuotationForm();
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return getDefaultQuotationForm();
    }

    const parsed = JSON.parse(raw) as LegacyQuotationForm;
    const defaults = getDefaultQuotationForm();

    return {
      ...defaults,
      ...parsed,
      gstMode: normalizeGstMode(parsed, defaults.gstMode),
      pdfPageMode: normalizePdfPageMode(parsed, defaults.pdfPageMode),
      quotationId: parsed.quotationId ?? defaults.quotationId,
      revision: parsed.revision ?? 1,
      status: parsed.status ?? "draft",
      customCharges: parsed.customCharges ?? [],
      windows:
        parsed.windows && parsed.windows.length > 0
          ? parsed.windows
          : defaults.windows,
    };
  } catch {
    return getDefaultQuotationForm();
  }
}

export function saveQuotationForm(form: QuotationForm): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
}

export function resetQuotationForm(): QuotationForm {
  const defaults = getDefaultQuotationForm();
  saveQuotationForm(defaults);
  return defaults;
}
