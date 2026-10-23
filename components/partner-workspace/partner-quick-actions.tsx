"use client";

import {
  FileSpreadsheet,
  FileStack,
  Layers,
  Plus,
  Printer,
  Eye,
  FolderKanban,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { canAccessHomeModule } from "@/lib/dashboard/module-access";

type PartnerQuickActionsProps = {
  canExportPdf: boolean;
  isPdfBusy: boolean;
  isSaving: boolean;
  onSaveToJob: () => void;
  onExportLabourPdf: () => void;
  onPreviewLabourPdf: () => void;
  onAddToEstimate?: () => void;
  onAddToQuotation: () => void;
  onStartNewProduct: () => void;
  onOpenDocuments: () => void;
};

export function PartnerQuickActions({
  canExportPdf,
  isPdfBusy,
  isSaving,
  onSaveToJob,
  onExportLabourPdf,
  onPreviewLabourPdf,
  onAddToEstimate,
  onAddToQuotation,
  onStartNewProduct,
  onOpenDocuments,
}: PartnerQuickActionsProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-base font-bold text-slate-900">Quick Actions</h2>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
        <Button
          type="button"
          size="lg"
          className="col-span-2 h-auto min-h-[52px] flex-col gap-1 py-3 md:col-span-1"
          onClick={onSaveToJob}
          disabled={!canExportPdf || isSaving}
        >
          <FolderKanban className="size-5" />
          Save to Active Job
        </Button>

        {canAccessHomeModule("estimate") && onAddToEstimate ? (
          <Button
            type="button"
            variant="outline"
            className="h-auto min-h-[52px] flex-col gap-1 py-3"
            onClick={onAddToEstimate}
            disabled={!canExportPdf}
          >
            <FileSpreadsheet className="size-4" />
            Project Estimate
          </Button>
        ) : null}

        <Button
          type="button"
          variant="outline"
          className="h-auto min-h-[52px] flex-col gap-1 py-3"
          onClick={onPreviewLabourPdf}
          disabled={!canExportPdf || isPdfBusy}
        >
          <Eye className="size-4" />
          Preview Labour PDF
        </Button>

        <Button
          type="button"
          variant="outline"
          className="h-auto min-h-[52px] flex-col gap-1 py-3"
          onClick={onExportLabourPdf}
          disabled={!canExportPdf || isPdfBusy}
        >
          <Printer className="size-4" />
          Export Labour PDF
        </Button>

        <Button
          type="button"
          variant="outline"
          className="h-auto min-h-[52px] flex-col gap-1 py-3"
          onClick={onAddToQuotation}
          disabled={!canExportPdf}
        >
          <Layers className="size-4" />
          Add to Quotation
        </Button>

        <Button
          type="button"
          variant="outline"
          className="h-auto min-h-[52px] flex-col gap-1 py-3"
          onClick={onStartNewProduct}
        >
          <Plus className="size-4" />
          Start New Product
        </Button>

        <Button
          type="button"
          variant="outline"
          className="h-auto min-h-[52px] flex-col gap-1 py-3 col-span-2 md:col-span-1"
          onClick={onOpenDocuments}
        >
          <FileStack className="size-4" />
          Documents
        </Button>
      </div>
      <p className="mt-3 text-center text-xs text-slate-500">
        Save each product to the active job, then open <strong>Project Estimate</strong> from Home
        to combine all items into one quotation.
      </p>
    </section>
  );
}
