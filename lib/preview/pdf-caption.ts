import type { ProductPreviewData } from "@/components/product-preview/preview-types";

/** Short caption shown below PDF preview images. */
export function buildPreviewCaption(data: ProductPreviewData): string {
  const view =
    data.viewFrom === "outside" ? "View from Outside" : "View from Inside";

  if (data.productType === "door" && data.door) {
    const side = data.door.openingSide === "left" ? "Left" : "Right";
    const dir = data.door.openingDirection === "inward" ? "Inward" : "Outward";
    const config =
      data.door.configuration === "double" ? "Double Door" : "Single Door";
    return `${view} · ${config} · ${side} Opening / ${dir}`;
  }

  if (data.window) {
    const track = data.window.trackLabel ?? "Window";
    if (data.window.sashConfigurationLabel) {
      return `${view} · ${track} · ${data.window.sashConfigurationLabel}`;
    }
    const panels = data.window.panels;
    if (panels?.length) {
      const panelText = panels
        .map((kind) => (kind === "glass" ? "Glass" : kind === "net" ? "Net" : kind))
        .join(" + ");
      return `${view} · ${track} · ${panelText}`;
    }
    return `${view} · ${track}`;
  }

  return view;
}
