"use client";

import {
  ClipboardList,
  FileText,
  FolderKanban,
  Printer,
  Ruler,
} from "lucide-react";

import { Button } from "@/components/ui/button";

type ProductQuickActionsProps = {
  onViewSummary: () => void;
  onViewCutting: () => void;
  onGenerateLabourPdf: () => void;
  onAddToJob: () => void;
  onAddToQuotation: () => void;
};

export function ProductQuickActions({
  onViewSummary,
  onViewCutting,
  onGenerateLabourPdf,
  onAddToJob,
  onAddToQuotation,
}: ProductQuickActionsProps) {
  return (
    <section
      aria-label="Quick actions after calculation"
      className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-indigo-50 p-4 shadow-sm"
    >
      <h3 className="text-sm font-bold text-slate-900">Quick actions</h3>
      <p className="mt-0.5 text-xs text-slate-600">Continue with this product</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" onClick={onViewSummary} className="gap-1.5">
          <ClipboardList className="size-3.5" />
          View Summary
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onViewCutting} className="gap-1.5">
          <Ruler className="size-3.5" />
          View Cutting
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onGenerateLabourPdf} className="gap-1.5">
          <Printer className="size-3.5" />
          Labour PDF
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onAddToJob} className="gap-1.5">
          <FolderKanban className="size-3.5" />
          Add to Job
        </Button>
        <Button type="button" size="sm" onClick={onAddToQuotation} className="gap-1.5">
          <FileText className="size-3.5" />
          Add to Quotation
        </Button>
      </div>
    </section>
  );
}
