"use client";

import { createRoot } from "react-dom/client";

import { ProductPreview } from "@/components/product-preview";
import type { PreviewMode, ProductPreviewData } from "@/components/product-preview/preview-types";

import { buildPreviewCaption } from "./pdf-caption";
import type { PdfPreviewRenderResult } from "./pdf-embed";

async function svgElementToPngDataUrl(
  svg: SVGElement,
  widthPx: number,
): Promise<{ dataUrl: string; aspectRatio: number }> {
  const clone = svg.cloneNode(true) as SVGElement;
  const viewBox = clone.getAttribute("viewBox");
  let aspect = 0.75;
  if (viewBox) {
    const parts = viewBox.split(/\s+/).map(Number);
    if (parts[2] && parts[3]) {
      aspect = parts[3] / parts[2];
    }
  }
  const heightPx = Math.max(1, Math.round(widthPx * aspect));
  clone.setAttribute("width", String(widthPx));
  clone.setAttribute("height", String(heightPx));
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");

  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(clone);
  const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  try {
    return await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const scale = 2;
        const canvas = document.createElement("canvas");
        canvas.width = widthPx * scale;
        canvas.height = heightPx * scale;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas unavailable"));
          return;
        }
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0, widthPx, heightPx);
        resolve({
          dataUrl: canvas.toDataURL("image/png"),
          aspectRatio: heightPx / widthPx,
        });
      };
      img.onerror = () => reject(new Error("Preview image failed to load"));
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export type RenderPreviewOptions = {
  mode?: PreviewMode;
  pixelWidth?: number;
  showDimensions?: boolean;
  showLabels?: boolean;
};

/** Render the live ProductPreview component to a PNG data URL for PDF embedding. */
export async function renderProductPreviewForPdf(
  data: ProductPreviewData,
  options: RenderPreviewOptions = {},
): Promise<PdfPreviewRenderResult | null> {
  if (typeof document === "undefined") return null;

  const {
    mode = "pdf",
    pixelWidth = 420,
    showDimensions = false,
    showLabels = true,
  } = options;

  const previewData: ProductPreviewData = {
    ...data,
    showDimensions,
    showLabels,
    showLegend: false,
    viewFrom: data.viewFrom ?? "inside",
  };

  const container = document.createElement("div");
  container.setAttribute("aria-hidden", "true");
  Object.assign(container.style, {
    position: "fixed",
    left: "-10000px",
    top: "0",
    width: `${pixelWidth}px`,
    pointerEvents: "none",
    opacity: "0",
  });
  document.body.appendChild(container);

  try {
    const root = createRoot(container);
    await new Promise<void>((resolve) => {
      root.render(
        <ProductPreview data={previewData} mode={mode} svgOnly variant="bare" />,
      );
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });

    const svg = container.querySelector("svg");
    if (!svg) return null;

    const { dataUrl, aspectRatio } = await svgElementToPngDataUrl(svg, pixelWidth);
    root.unmount();

    return {
      dataUrl,
      aspectRatio,
      caption: buildPreviewCaption(previewData),
    };
  } catch {
    return null;
  } finally {
    container.remove();
  }
}

export async function renderProductPreviewsForPdf(
  items: Array<{
    key: string;
    data: ProductPreviewData;
    options?: RenderPreviewOptions;
  }>,
): Promise<Map<string, PdfPreviewRenderResult>> {
  const map = new Map<string, PdfPreviewRenderResult>();
  for (const item of items) {
    const rendered = await renderProductPreviewForPdf(item.data, item.options);
    if (rendered) {
      map.set(item.key, rendered);
    }
  }
  return map;
}
