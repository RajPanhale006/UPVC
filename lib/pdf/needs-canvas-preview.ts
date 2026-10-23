/** Android/iOS WebViews cannot render PDF blobs inside iframes. */
export async function needsCanvasPdfPreview(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  try {
    const { Capacitor } = await import("@capacitor/core");
    if (Capacitor.isNativePlatform()) return true;
  } catch {
    // Web build without Capacitor.
  }

  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}
