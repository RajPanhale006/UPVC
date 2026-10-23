import { normalizeImportFile } from "./normalize-import-file";

const LOCAL_TESSERACT_BASE = "/tesseract";

function getLocalTesseractOptions(onProgress?: (message: string) => void) {
  return {
    workerPath: `${LOCAL_TESSERACT_BASE}/worker.min.js`,
    corePath: `${LOCAL_TESSERACT_BASE}/core`,
    langPath: `${LOCAL_TESSERACT_BASE}/lang`,
    workerBlobURL: false,
    cacheMethod: "none" as const,
    gzip: true,
    logger: (event: { status?: string; progress?: number }) => {
      if (event.status === "recognizing text" && typeof event.progress === "number") {
        onProgress?.(`Scanning image… ${Math.round(event.progress * 100)}%`);
      } else if (event.status === "loading tesseract core") {
        onProgress?.("Loading OCR engine…");
      } else if (event.status === "initializing tesseract") {
        onProgress?.("Initializing OCR…");
      } else if (event.status === "loading language traineddata") {
        onProgress?.("Loading language data…");
      }
    },
  };
}

/** Client-side OCR — uses bundled assets on native; CDN fallback on web dev. */
export async function extractTextFromImage(
  file: File,
  onProgress?: (message: string) => void,
): Promise<string> {
  const normalized = normalizeImportFile(file);
  const { createWorker } = await import("tesseract.js");

  onProgress?.("Preparing image scan…");

  const worker = await createWorker("eng", 1, getLocalTesseractOptions(onProgress));

  try {
    const result = await worker.recognize(normalized);
    return result.data.text ?? "";
  } finally {
    await worker.terminate();
  }
}
