import type { jsPDF } from "jspdf";

/** Create a blob URL for in-app PDF preview (revoke when done). */
export function pdfToBlobUrl(doc: jsPDF): string {
  const blob = doc.output("blob");
  return URL.createObjectURL(blob);
}

export function revokePdfBlobUrl(url: string | null): void {
  if (url) {
    URL.revokeObjectURL(url);
  }
}
