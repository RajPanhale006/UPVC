import type { jsPDF } from "jspdf";

function normalizeFilename(filename: string): string {
  const trimmed = filename.trim() || "document.pdf";
  return trimmed.toLowerCase().endsWith(".pdf") ? trimmed : `${trimmed}.pdf`;
}

function downloadPdfInBrowser(doc: jsPDF, filename: string): void {
  const safeName = normalizeFilename(filename);

  try {
    const blob = doc.output("blob");
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = safeName;
    anchor.rel = "noopener";
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return;
  } catch {
    // Fallback for environments where blob download is blocked.
  }

  doc.save(safeName);
}

async function sharePdfOnNative(doc: jsPDF, filename: string): Promise<void> {
  const { Filesystem, Directory } = await import("@capacitor/filesystem");
  const { Share } = await import("@capacitor/share");

  const safeName = filename.replace(/[^\w.-]+/g, "_");
  const base64 = doc.output("datauristring").split(",")[1] ?? "";

  await Filesystem.writeFile({
    path: safeName,
    data: base64,
    directory: Directory.Cache,
  });

  const { uri } = await Filesystem.getUri({
    path: safeName,
    directory: Directory.Cache,
  });

  await Share.share({
    title: safeName,
    text: safeName,
    files: [uri],
    dialogTitle: "Save PDF",
  });
}

/** Save or share a PDF — browser download on web, share sheet on Android APK. */
export async function savePdfDocument(
  doc: jsPDF,
  filename: string,
): Promise<void> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new Error("PDF download is only available in the browser.");
  }

  let isNative = false;
  try {
    const { Capacitor } = await import("@capacitor/core");
    isNative = Capacitor.isNativePlatform();
  } catch {
    isNative = false;
  }

  if (!isNative) {
    downloadPdfInBrowser(doc, filename);
    return;
  }

  try {
    await sharePdfOnNative(doc, filename);
  } catch {
    downloadPdfInBrowser(doc, filename);
  }
}
