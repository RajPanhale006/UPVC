import {
  getDefaultQuotationReferencePhotos,
  isReferencePhotoDataUrl,
} from "./default-reference-photos";
import { getDefaultCompanySettings } from "./defaults";
import { WINDOW_TYPE_ORDER } from "@/lib/quotation/defaults";
import type { CompanySettings } from "./types";

const STORAGE_KEY = "upvc-workshop-company-settings";

function normalizeSettings(parsed: Partial<CompanySettings>): CompanySettings {
  const defaults = getDefaultCompanySettings();
  const merged = { ...defaults, ...parsed };
  if (!merged.phone1 && merged.phones) {
    const parts = merged.phones.split("/").map((p) => p.trim());
    merged.phone1 = parts[0] ?? "";
    merged.phone2 = parts[1] ?? "";
  }
  if (!merged.phones && (merged.phone1 || merged.phone2)) {
    merged.phones = [merged.phone1, merged.phone2].filter(Boolean).join(" / ");
  }
  merged.quotationReferencePhotos = getDefaultQuotationReferencePhotos();
  for (const windowType of WINDOW_TYPE_ORDER) {
    const saved = parsed.quotationReferencePhotos?.[windowType];
    if (saved && isReferencePhotoDataUrl(saved)) {
      merged.quotationReferencePhotos[windowType] = saved;
    }
  }
  return merged;
}

export function restoreQuotationReferencePhotosToDefaults(
  settings: CompanySettings,
): CompanySettings {
  return {
    ...settings,
    quotationReferencePhotos: getDefaultQuotationReferencePhotos(),
  };
}

export function loadCompanySettings(): CompanySettings {
  if (typeof window === "undefined") {
    return getDefaultCompanySettings();
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultCompanySettings();
    const parsed = JSON.parse(raw) as Partial<CompanySettings>;
    return normalizeSettings(parsed);
  } catch {
    return getDefaultCompanySettings();
  }
}

export function saveCompanySettings(settings: CompanySettings): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function resetCompanySettings(): CompanySettings {
  const defaults = getDefaultCompanySettings();
  saveCompanySettings(defaults);
  return defaults;
}
