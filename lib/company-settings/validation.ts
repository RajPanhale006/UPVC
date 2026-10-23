import { WINDOW_TYPE_ORDER } from "@/lib/quotation/defaults";

import { isBundledReferencePhotoPath } from "./default-reference-photos";
import type { CompanySettings } from "./types";

const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[\d\s+\-/()]{8,20}$/;
const WEBSITE_REGEX =
  /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w\-./?%&=]*)?$/i;

export type ValidationResult = {
  ok: boolean;
  errors: string[];
};

export function validatePhone(value: string, required = false): ValidationResult {
  const trimmed = value.trim();
  if (!trimmed) {
    return required
      ? { ok: false, errors: ["Phone number is required"] }
      : { ok: true, errors: [] };
  }
  if (!PHONE_REGEX.test(trimmed)) {
    return { ok: false, errors: ["Invalid phone number format"] };
  }
  return { ok: true, errors: [] };
}

export function validateEmail(value: string, required = false): ValidationResult {
  const trimmed = value.trim();
  if (!trimmed) {
    return required
      ? { ok: false, errors: ["Email is required"] }
      : { ok: true, errors: [] };
  }
  if (!EMAIL_REGEX.test(trimmed)) {
    return { ok: false, errors: ["Invalid email format"] };
  }
  return { ok: true, errors: [] };
}

export function validateWebsite(value: string): ValidationResult {
  const trimmed = value.trim();
  if (!trimmed) return { ok: true, errors: [] };
  if (!WEBSITE_REGEX.test(trimmed)) {
    return { ok: false, errors: ["Invalid website format"] };
  }
  return { ok: true, errors: [] };
}

export function validateGst(value: string): ValidationResult {
  const trimmed = value.trim();
  if (!trimmed) return { ok: true, errors: [] };
  if (!GST_REGEX.test(trimmed)) {
    return { ok: false, errors: ["Invalid GST number format (15 characters)"] };
  }
  return { ok: true, errors: [] };
}

export function validateImageDataUrl(
  dataUrl: string,
  maxBytes = 512_000,
): ValidationResult {
  if (!dataUrl) return { ok: true, errors: [] };
  if (!dataUrl.startsWith("data:image/")) {
    return { ok: false, errors: ["Image must be PNG, JPEG, or WebP"] };
  }
  const base64 = dataUrl.split(",")[1] ?? "";
  const approxBytes = (base64.length * 3) / 4;
  if (approxBytes > maxBytes) {
    return { ok: false, errors: [`Image must be under ${Math.round(maxBytes / 1024)} KB`] };
  }
  return { ok: true, errors: [] };
}

export function validateCompanySettings(settings: CompanySettings): ValidationResult {
  const errors: string[] = [];

  if (!settings.companyName.trim()) {
    errors.push("Company name is required");
  }

  for (const r of [
    validatePhone(settings.phone1, false),
    validatePhone(settings.phone2, false),
    validateEmail(settings.email, false),
    validateWebsite(settings.website),
    validateGst(settings.gstNumber),
    validateImageDataUrl(settings.logoDataUrl ?? ""),
    validateImageDataUrl(settings.signatureDataUrl ?? ""),
    validateImageDataUrl(settings.stampDataUrl ?? ""),
    validateImageDataUrl(settings.upiQrDataUrl ?? ""),
  ]) {
    errors.push(...r.errors);
  }

  for (const windowType of WINDOW_TYPE_ORDER) {
    const photo = settings.quotationReferencePhotos?.[windowType];
    if (!photo || isBundledReferencePhotoPath(photo)) continue;
    errors.push(...validateImageDataUrl(photo, 800_000).errors);
  }

  return { ok: errors.length === 0, errors };
}

export async function readImageFileAsDataUrl(
  file: File,
  maxBytes = 512_000,
): Promise<{ ok: true; dataUrl: string } | { ok: false; error: string }> {
  if (!file.type.startsWith("image/")) {
    return { ok: false, error: "Please select an image file" };
  }
  if (file.size > maxBytes) {
    return { ok: false, error: `Image must be under ${Math.round(maxBytes / 1024)} KB` };
  }
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result ?? "");
      const check = validateImageDataUrl(dataUrl, maxBytes);
      if (!check.ok) {
        resolve({ ok: false, error: check.errors[0] ?? "Invalid image" });
        return;
      }
      resolve({ ok: true, dataUrl });
    };
    reader.onerror = () => resolve({ ok: false, error: "Could not read image file" });
    reader.readAsDataURL(file);
  });
}
