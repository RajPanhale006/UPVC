"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

type PdfCanvasViewerProps = {
  blobUrl: string;
  title: string;
};

export function PdfCanvasViewer({ blobUrl, title }: PdfCanvasViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;

    async function renderPreview() {
      const host = containerRef.current;
      if (!host) return;

      setStatus("loading");
      setError(null);
      host.replaceChildren();

      try {
        const pdfjs = await import("pdfjs-dist");
        const base = window.location.origin.replace(/\/$/, "");
        pdfjs.GlobalWorkerOptions.workerSrc = `${base}/pdf.worker.min.mjs`;

        const response = await fetch(blobUrl);
        if (!response.ok) {
          throw new Error("Could not read the PDF file.");
        }

        const data = await response.arrayBuffer();
        if (cancelled) return;

        const pdf = await pdfjs.getDocument({ data }).promise;
        if (cancelled) return;

        const pad = 8;
        const maxWidth = Math.max(host.clientWidth - pad * 2, 280);

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          if (cancelled) return;

          const page = await pdf.getPage(pageNum);
          const baseViewport = page.getViewport({ scale: 1 });
          const scale = maxWidth / baseViewport.width;
          const viewport = page.getViewport({ scale });

          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.className = "mx-auto block max-w-full shadow-sm";
          canvas.setAttribute("role", "img");
          canvas.setAttribute(
            "aria-label",
            `${title} — page ${pageNum} of ${pdf.numPages}`,
          );

          const context = canvas.getContext("2d");
          if (!context) {
            throw new Error("Canvas is not available on this device.");
          }

          const wrapper = document.createElement("div");
          wrapper.className = "mb-3 flex flex-col items-center last:mb-0";

          const label = document.createElement("p");
          label.className =
            "mb-1.5 text-[10px] font-medium uppercase tracking-wider text-slate-400";
          label.textContent = `Page ${pageNum} / ${pdf.numPages}`;

          wrapper.appendChild(label);
          wrapper.appendChild(canvas);
          host.appendChild(wrapper);

          await page.render({ canvas, canvasContext: context, viewport }).promise;
        }

        if (!cancelled) setStatus("ready");
      } catch (err) {
        if (!cancelled) {
          setStatus("error");
          setError(
            err instanceof Error ? err.message : "Could not render PDF preview.",
          );
        }
      }
    }

    void renderPreview();

    return () => {
      cancelled = true;
      containerRef.current?.replaceChildren();
    };
  }, [blobUrl, title]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {status === "loading" ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16">
          <Loader2 className="size-8 animate-spin text-indigo-600" />
          <p className="text-sm font-medium text-slate-700">Loading preview…</p>
        </div>
      ) : null}

      {status === "error" ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-16 text-center">
          <p className="text-sm font-semibold text-slate-900">Preview unavailable</p>
          <p className="text-xs text-slate-500">{error}</p>
          <p className="mt-2 text-xs text-slate-500">
            Use Download / Share to open the PDF on your device.
          </p>
        </div>
      ) : null}

      <div
        ref={containerRef}
        className={`h-full overflow-y-auto overscroll-contain p-2 sm:p-3 ${
          status === "ready" ? "" : "sr-only"
        }`}
        aria-live="polite"
      />
    </div>
  );
}
