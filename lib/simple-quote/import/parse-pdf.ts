import { parseTextToImportLines } from "./parse-text";
import type { ImportQuoteLine } from "./types";

export async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  const base = typeof window !== "undefined" ? window.location.origin : "";
  pdfjs.GlobalWorkerOptions.workerSrc = `${base}/pdf.worker.min.mjs`;

  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data }).promise;
  const chunks: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    chunks.push(pageText);
  }

  return chunks.join("\n");
}

export async function parsePdfToImportLines(file: File): Promise<ImportQuoteLine[]> {
  const text = await extractPdfText(file);
  return parseTextToImportLines(text);
}
