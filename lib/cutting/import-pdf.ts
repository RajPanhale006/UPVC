import { PDFDocument } from "pdf-lib";

import { decodeJobDocument, type CuttingJobDocument } from "./job-document";

function readMetadataField(value: string | undefined): CuttingJobDocument | null {
  if (!value) {
    return null;
  }

  return decodeJobDocument(value.trim());
}

export async function importCuttingPdf(file: File): Promise<CuttingJobDocument> {
  const bytes = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });

  const fromSubject = readMetadataField(pdfDoc.getSubject());
  if (fromSubject) {
    return fromSubject;
  }

  const fromKeywords = readMetadataField(pdfDoc.getKeywords() ?? undefined);
  if (fromKeywords) {
    return fromKeywords;
  }

  throw new Error(
    "This PDF was not exported from Shivshakti Enterprises. Export a cutting sheet from this app first, then import it here.",
  );
}
