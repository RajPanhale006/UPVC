import {
  getProductTypeLabel,
  QUOTATION_PRODUCT_ORDER,
  QUOTATION_REFERENCE_IMAGE_PATHS,
} from "./product-types";
import type {
  CalculatedQuotationItem,
  QuotationItemInput,
  QuotationProductType,
  ReferenceImageItem,
  ResolvedReferenceImage,
} from "./types";

export function getUniqueItemTypes(
  items: Array<Pick<QuotationItemInput, "productType">>,
): QuotationProductType[] {
  const present = new Set(items.map((item) => item.productType));
  return QUOTATION_PRODUCT_ORDER.filter((type) => present.has(type));
}

/** Reference image paths for unique product types in this quotation (one image per type). */
export function getReferenceImagesForQuotation(
  items: Array<Pick<QuotationItemInput, "productType">>,
): ReferenceImageItem[] {
  return getUniqueItemTypes(items).map((productType) => ({
    productType,
    label: getProductTypeLabel(productType),
    imagePath: QUOTATION_REFERENCE_IMAGE_PATHS[productType],
  }));
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Could not read reference image."));
    reader.readAsDataURL(blob);
  });
}

function measureAspectRatio(dataUrl: string): Promise<number> {
  if (typeof document === "undefined") return Promise.resolve(0.75);

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img.height / img.width || 0.75);
    img.onerror = () => resolve(0.75);
    img.src = dataUrl;
  });
}

const imageCache = new Map<string, ResolvedReferenceImage>();

/** Load bundled reference images as data URLs for PDF embedding. */
export async function resolveReferenceImagesForQuotation(
  items: CalculatedQuotationItem[] | QuotationItemInput[],
): Promise<ResolvedReferenceImage[]> {
  const references = getReferenceImagesForQuotation(items);
  const resolved: ResolvedReferenceImage[] = [];

  for (const ref of references) {
    const cached = imageCache.get(ref.imagePath);
    if (cached) {
      resolved.push(cached);
      continue;
    }

    try {
      const response = await fetch(ref.imagePath);
      if (!response.ok) continue;
      const blob = await response.blob();
      const dataUrl = await blobToDataUrl(blob);
      const aspectRatio = await measureAspectRatio(dataUrl);
      const entry: ResolvedReferenceImage = { ...ref, dataUrl, aspectRatio };
      imageCache.set(ref.imagePath, entry);
      resolved.push(entry);
    } catch {
      // Skip missing images — user may replace files later.
    }
  }

  return resolved;
}
