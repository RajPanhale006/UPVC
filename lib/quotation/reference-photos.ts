import { resolveQuotationPreviewData } from "@/components/product-preview/preview-mapper";
import { resolveReferencePhotoDataUrl } from "@/lib/company-settings/resolve-reference-photo";
import type { CompanySettings } from "@/lib/company-settings/types";
import type { PdfPreviewRenderResult } from "@/lib/preview/pdf-embed";

import { WINDOW_TYPE_LABELS, WINDOW_TYPE_ORDER } from "./defaults";
import type { CalculatedWindowRow, QuotationResult, WindowTypeId } from "./types";

export type QuotationReferencePhotoItem = {
  windowType: WindowTypeId;
  label: string;
  preview: PdfPreviewRenderResult;
};

/** Window types present in this quotation, in standard display order. */
export function getQuotationWindowTypes(result: QuotationResult): WindowTypeId[] {
  const present = new Set(result.groups.map((group) => group.windowType));
  return WINDOW_TYPE_ORDER.filter((type) => present.has(type));
}

export function getReferencePhotoDataUrl(
  windowType: WindowTypeId,
  settings: CompanySettings,
): string | null {
  const dataUrl = settings.quotationReferencePhotos?.[windowType]?.trim();
  return dataUrl || null;
}

function sampleRowForType(
  result: QuotationResult,
  windowType: WindowTypeId,
): CalculatedWindowRow | undefined {
  return result.groups.find((group) => group.windowType === windowType)?.rows[0];
}

export async function getDataUrlAspectRatio(dataUrl: string): Promise<number> {
  if (typeof document === "undefined") return 0.75;

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img.height / img.width || 0.75);
    img.onerror = () => resolve(0.75);
    img.src = dataUrl;
  });
}

async function buildUploadedPhotoPreview(
  windowType: WindowTypeId,
  source: string,
): Promise<PdfPreviewRenderResult | null> {
  const dataUrl = await resolveReferencePhotoDataUrl(source);
  if (!dataUrl) return null;

  const aspectRatio = await getDataUrlAspectRatio(dataUrl);
  return {
    dataUrl,
    aspectRatio,
    caption: WINDOW_TYPE_LABELS[windowType],
  };
}

async function buildDiagramFallbackPreview(
  result: QuotationResult,
  windowType: WindowTypeId,
): Promise<PdfPreviewRenderResult | null> {
  if (typeof document === "undefined") return null;

  const sampleRow = sampleRowForType(result, windowType);
  if (!sampleRow) return null;

  const { renderProductPreviewForPdf } = await import("@/lib/preview/render-preview-image");
  return renderProductPreviewForPdf(resolveQuotationPreviewData(sampleRow), {
    mode: "pdf",
    pixelWidth: 420,
    showDimensions: false,
    showLabels: true,
  });
}

/** One preview per window type — uploaded photo preferred, diagram fallback otherwise. */
export async function resolveQuotationReferencePhotoItems(
  result: QuotationResult,
  settings: CompanySettings,
): Promise<QuotationReferencePhotoItem[]> {
  const types = getQuotationWindowTypes(result);
  const items: QuotationReferencePhotoItem[] = [];

  for (const windowType of types) {
    const label = WINDOW_TYPE_LABELS[windowType];
    const uploaded = getReferencePhotoDataUrl(windowType, settings);

    if (uploaded) {
      const preview = await buildUploadedPhotoPreview(windowType, uploaded);
      if (preview) {
        items.push({ windowType, label, preview });
        continue;
      }
    }

    const fallback = await buildDiagramFallbackPreview(result, windowType);
    if (fallback) {
      items.push({
        windowType,
        label,
        preview: { ...fallback, caption: label },
      });
    }
  }

  return items;
}

/** Sync path — bundled path photos only (data URLs and diagram fallbacks need async). */
export function resolveUploadedReferencePhotoItems(
  result: QuotationResult,
  settings: CompanySettings,
): QuotationReferencePhotoItem[] {
  return getQuotationWindowTypes(result).flatMap((windowType) => {
    const source = getReferencePhotoDataUrl(windowType, settings);
    if (!source || !/^data:image\//i.test(source)) return [];

    return [
      {
        windowType,
        label: WINDOW_TYPE_LABELS[windowType],
        preview: {
          dataUrl: source,
          aspectRatio: 0.75,
          caption: WINDOW_TYPE_LABELS[windowType],
        },
      },
    ];
  });
}
