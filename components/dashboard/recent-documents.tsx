"use client";

import { Download, Eye, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DOCUMENT_TYPE_LABELS,
  getDocumentBlob,
  listAllDocuments,
  type JobDocument,
} from "@/lib/documents";
import { cn } from "@/lib/utils";

import { formatShortDate } from "./dashboard-utils";

type RecentDocumentsProps = {
  onOpenDocuments: () => void;
  onSelectJob?: (jobId: string) => void;
};

export function RecentDocuments({ onOpenDocuments, onSelectJob }: RecentDocumentsProps) {
  const documents = listAllDocuments().slice(0, 10);

  async function handlePreview(doc: JobDocument) {
    onSelectJob?.(doc.jobId);
    onOpenDocuments();
  }

  async function handleDownload(doc: JobDocument) {
    const blob = await getDocumentBlob(doc);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = doc.fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  if (documents.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center shadow-sm">
        <h3 className="text-base font-bold text-slate-900">No documents generated yet.</h3>
        <p className="mt-1 text-sm text-slate-600">
          Generate a cutting sheet or quotation to see it here.
        </p>
        <Button type="button" variant="outline" className="mt-4" onClick={onOpenDocuments}>
          Open Documents
        </Button>
      </section>
    );
  }

  return (
    <section aria-labelledby="recent-documents-heading">
      <h3 id="recent-documents-heading" className="mb-3 text-sm font-bold text-slate-900">
        Recent Documents
      </h3>
      <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {documents.map((doc) => (
          <li key={doc.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-100">
                <FileText className="size-4 text-slate-600" strokeWidth={2} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-900">{doc.fileName}</p>
                <p className="text-xs text-slate-600">
                  {DOCUMENT_TYPE_LABELS[doc.documentType]} · Rev {doc.revision} ·{" "}
                  {formatShortDate(doc.generatedAt)}
                </p>
                <span
                  className={cn(
                    "mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                    doc.status === "final"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-800",
                  )}
                >
                  {doc.status === "final" ? "Final" : "Draft"}
                </span>
              </div>
            </div>
            <div className="flex shrink-0 gap-1 pl-12 sm:pl-0">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-1"
                onClick={() => handlePreview(doc)}
                aria-label={`Preview ${doc.fileName}`}
              >
                <Eye className="size-3.5" />
                Preview
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-1"
                onClick={() => handleDownload(doc)}
                aria-label={`Download ${doc.fileName}`}
              >
                <Download className="size-3.5" />
                Save
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
