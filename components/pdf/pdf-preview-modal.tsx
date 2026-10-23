"use client";

import { useEffect, useState } from "react";
import { Download, FileText, Loader2, Share2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PdfCanvasViewer } from "@/components/pdf/pdf-canvas-viewer";
import { needsCanvasPdfPreview } from "@/lib/pdf/needs-canvas-preview";

type PdfPreviewModalProps = {
  open: boolean;
  title: string;
  blobUrl: string | null;
  onClose: () => void;
  onExport?: () => void;
  isExporting?: boolean;
  exportLabel?: string;
};

export function PdfPreviewModal({
  open,
  title,
  blobUrl,
  onClose,
  onExport,
  isExporting = false,
  exportLabel = "Download PDF",
}: PdfPreviewModalProps) {
  const [useCanvasViewer, setUseCanvasViewer] = useState(false);

  useEffect(() => {
    void needsCanvasPdfPreview().then(setUseCanvasViewer);
  }, []);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isExporting) onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose, isExporting]);

  if (!open || !blobUrl) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-slate-950/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdf-preview-title"
    >
      <div className="flex min-h-0 flex-1 flex-col md:p-4 lg:p-6">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white shadow-2xl md:mx-auto md:max-w-6xl md:rounded-2xl md:border md:border-slate-200">
          {/* Header */}
          <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-3.5 pt-[max(0.875rem,env(safe-area-inset-top))] md:rounded-t-2xl md:px-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
                  <FileText className="size-5" strokeWidth={2} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    PDF Preview
                  </p>
                  <h2
                    id="pdf-preview-title"
                    className="truncate text-base font-semibold text-slate-900 md:text-lg"
                  >
                    {title}
                  </h2>
                  <p className="mt-0.5 hidden text-xs text-slate-500 sm:block">
                    Review the document, then download or share.
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {onExport ? (
                  <Button
                    type="button"
                    size="sm"
                    disabled={isExporting}
                    className="hidden sm:inline-flex"
                    onClick={onExport}
                  >
                    {isExporting ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <Download />
                    )}
                    {isExporting ? "Preparing…" : exportLabel}
                  </Button>
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isExporting}
                  className="border-slate-200 text-slate-700 hover:bg-slate-50"
                  onClick={onClose}
                >
                  <X />
                  <span className="hidden sm:inline">Close</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Preview area */}
          <div className="relative min-h-0 flex-1 bg-slate-100 p-2 sm:p-4">
            {isExporting ? (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 backdrop-blur-[2px]">
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white px-8 py-6 shadow-lg">
                  <Loader2 className="size-8 animate-spin text-indigo-600" />
                  <div className="text-center">
                    <p className="text-sm font-semibold text-slate-900">
                      Preparing your PDF
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Download will start shortly…
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="h-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-inner">
              {useCanvasViewer ? (
                <PdfCanvasViewer blobUrl={blobUrl} title={title} />
              ) : (
                <iframe
                  src={blobUrl}
                  title={title}
                  className="h-full min-h-[50vh] w-full border-0 md:min-h-0"
                />
              )}
            </div>
          </div>

          {/* Footer — mobile download + hint */}
          <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:rounded-b-2xl md:px-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-center gap-2 text-xs text-slate-500">
                <Share2 className="size-3.5 shrink-0 text-slate-400" />
                On mobile, use Share to save the PDF to your device.
              </p>
              {onExport ? (
                <Button
                  type="button"
                  disabled={isExporting}
                  className="w-full sm:hidden"
                  onClick={onExport}
                >
                  {isExporting ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Download />
                  )}
                  {isExporting ? "Preparing…" : exportLabel}
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
