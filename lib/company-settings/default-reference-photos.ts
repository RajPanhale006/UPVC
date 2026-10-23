import { WINDOW_TYPE_LABELS, WINDOW_TYPE_ORDER } from "@/lib/quotation/defaults";
import type { WindowTypeId } from "@/lib/quotation/types";

const PHOTO_DIR = "/quotation-reference-photos";

/** Bump when bundled files change so browsers reload cached images. */
export const REFERENCE_PHOTO_CACHE_VERSION = "2";

/** What each reference photo should show — helps verify name vs image. */
export const REFERENCE_PHOTO_HINTS: Record<WindowTypeId, string> = {
  "2-track-upvc": "2 glass sliding panels",
  "2.5-track-upvc": "2 glass + 1 mesh/net panel",
  "3-track-upvc": "3 panels — 2 glass + 1 mesh/net",
  "openable-single-glass": "Casement / openable lowers (upload your photo)",
  "fixed-glass": "Single fixed glass pane (non-sliding)",
  "fixed-upvc-partition": "Fixed glass partition with door",
  "upvc-door": "Single hinged UPVC door",
};

/** Bundled reference photos shipped with the app. */
export const DEFAULT_QUOTATION_REFERENCE_PHOTOS: Partial<Record<WindowTypeId, string>> = {
  "2-track-upvc": `${PHOTO_DIR}/2-track-upvc.jpg`,
  "2.5-track-upvc": `${PHOTO_DIR}/2.5-track-upvc.jpg`,
  "3-track-upvc": `${PHOTO_DIR}/3-track-upvc.jpg`,
  "fixed-glass": `${PHOTO_DIR}/fixed-glass.jpg`,
  "fixed-upvc-partition": `${PHOTO_DIR}/fixed-upvc-partition.jpg`,
  "upvc-door": `${PHOTO_DIR}/upvc-door.jpg`,
};

export function isBundledReferencePhotoPath(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.startsWith(`${PHOTO_DIR}/`) && /\.(jpe?g|png|webp)$/i.test(trimmed);
}

export function isReferencePhotoDataUrl(value: string): boolean {
  return /^data:image\//i.test(value.trim());
}

export function getDefaultQuotationReferencePhotos(): Partial<Record<WindowTypeId, string>> {
  return { ...DEFAULT_QUOTATION_REFERENCE_PHOTOS };
}

export function referencePhotoDisplaySrc(source: string): string {
  const trimmed = source.trim();
  if (!trimmed || isReferencePhotoDataUrl(trimmed)) return trimmed;
  const joiner = trimmed.includes("?") ? "&" : "?";
  return `${trimmed}${joiner}v=${REFERENCE_PHOTO_CACHE_VERSION}`;
}

export function listDefaultReferencePhotoTypes(): WindowTypeId[] {
  return [...WINDOW_TYPE_ORDER];
}

export function getReferencePhotoLabel(windowType: WindowTypeId): string {
  return WINDOW_TYPE_LABELS[windowType];
}
