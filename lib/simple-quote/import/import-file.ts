import { isNativeApp } from "@/lib/capacitor/platform";

import {
  isExcelLikeFile,
  isImageFile,
  isLikelyImagePick,
  isPdfFile,
  normalizeImportFile,
} from "./normalize-import-file";
import { parseExcelToImportLines } from "./parse-excel";
import { parsePdfToImportLines } from "./parse-pdf";
import {
  importLinesToQuoteRows,
  mergeImportedQuoteRows,
  replaceImportedQuoteRows,
} from "./to-quote-rows";
import type { ImportQuoteLine, ImportQuoteResult } from "./types";
import type { SimpleQuoteRow } from "../types";

async function parseImageViaApi(file: File): Promise<ImportQuoteLine[]> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/simple-quote/import", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as {
    ok?: boolean;
    lines?: ImportQuoteLine[];
  };

  return payload.lines ?? [];
}

async function parseImageWithOcr(
  file: File,
  onProgress?: (message: string) => void,
): Promise<ImportQuoteLine[]> {
  const { extractTextFromImage } = await import("./ocr-image");
  const { parseTextToImportLines } = await import("./parse-text");

  onProgress?.("Reading text from image…");
  const text = await extractTextFromImage(file, onProgress);
  const lines = parseTextToImportLines(text);

  if (lines.length === 0) {
    const preview = text.replace(/\s+/g, " ").trim().slice(0, 100);
    throw new Error(
      preview
        ? `Could not find sizes in image. OCR read: "${preview}…" — try Excel or enter manually.`
        : "Could not read text from this image. Try a clearer photo or Excel (.xlsx).",
    );
  }

  return lines;
}

async function parseImageFile(
  file: File,
  onProgress?: (message: string) => void,
): Promise<{ lines: ImportQuoteLine[]; source: "image" | "ai-text" }> {
  if (!isNativeApp()) {
    onProgress?.("Trying AI read…");
    const apiLines = await parseImageViaApi(file);
    if (apiLines.length > 0) {
      return { lines: apiLines, source: "ai-text" };
    }
  } else {
    onProgress?.("Reading photo on device…");
  }

  const ocrLines = await parseImageWithOcr(file, onProgress);
  return { lines: ocrLines, source: "image" };
}

async function enhanceLinesWithAi(text: string): Promise<ImportQuoteLine[]> {
  const response = await fetch("/api/simple-quote/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) return [];

  const payload = (await response.json()) as { lines?: ImportQuoteLine[] };
  return payload.lines ?? [];
}

export async function importQuoteFile(
  file: File,
  onProgress?: (message: string) => void,
): Promise<ImportQuoteResult> {
  const normalized = normalizeImportFile(file);
  const warnings: string[] = [];
  let lines: ImportQuoteLine[] = [];
  let source: "excel" | "pdf" | "image" | "ai-text" = "excel";

  try {
    if (isExcelLikeFile(normalized)) {
      source = "excel";
      lines = await parseExcelToImportLines(normalized);
    } else if (isPdfFile(normalized)) {
      source = "pdf";
      lines = await parsePdfToImportLines(normalized);
      if (lines.length === 0 && !isNativeApp()) {
        const { extractPdfText } = await import("./parse-pdf");
        const text = await extractPdfText(normalized);
        lines = await enhanceLinesWithAi(text);
        if (lines.length > 0) source = "ai-text";
      }
    } else if (isImageFile(normalized) || isLikelyImagePick(normalized)) {
      const imageResult = await parseImageFile(normalized, onProgress);
      lines = imageResult.lines;
      source = imageResult.source;
    } else {
      return {
        ok: false,
        message: "Unsupported file. Use Excel (.xlsx), PDF, or an image (photo/scan).",
      };
    }
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Import failed.",
    };
  }

  if (lines.length === 0) {
    return {
      ok: false,
      message:
        "No window/door sizes found in the file. Use columns Width, Height, Qty, Type — or sizes like 1187 x 1208 mm.",
    };
  }

  return { ok: true, lines, warnings, source };
}

export async function applyImportedFileToRows(
  file: File,
  currentRows: SimpleQuoteRow[],
  onProgress?: (message: string) => void,
  replaceExisting = false,
): Promise<
  | { ok: true; rows: SimpleQuoteRow[]; importedCount: number; warnings: string[]; source: string }
  | { ok: false; message: string }
> {
  const result = await importQuoteFile(file, onProgress);
  if (!result.ok) return result;

  const importedRows = importLinesToQuoteRows(result.lines);
  const merged = replaceExisting
    ? replaceImportedQuoteRows(importedRows)
    : mergeImportedQuoteRows(currentRows, importedRows);

  return {
    ok: true,
    rows: merged,
    importedCount: importedRows.length,
    warnings: result.warnings,
    source: result.source,
  };
}
