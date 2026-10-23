import {
  isBundledReferencePhotoPath,
  isReferencePhotoDataUrl,
} from "./default-reference-photos";

const dataUrlCache = new Map<string, string>();

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Could not read reference photo."));
    reader.readAsDataURL(blob);
  });
}

/** Resolve a stored reference photo (data URL or bundled path) to a data URL for PDF embedding. */
export async function resolveReferencePhotoDataUrl(source: string): Promise<string | null> {
  const trimmed = source.trim();
  if (!trimmed) return null;

  if (isReferencePhotoDataUrl(trimmed)) {
    return trimmed;
  }

  if (isBundledReferencePhotoPath(trimmed) || trimmed.startsWith("/")) {
    const cached = dataUrlCache.get(trimmed);
    if (cached) return cached;

    try {
      const response = await fetch(trimmed);
      if (!response.ok) return null;
      const blob = await response.blob();
      const dataUrl = await blobToDataUrl(blob);
      dataUrlCache.set(trimmed, dataUrl);
      return dataUrl;
    } catch {
      return null;
    }
  }

  return null;
}
