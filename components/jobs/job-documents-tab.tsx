"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  Download,
  Eye,
  FileText,
  ShieldCheck,
  Star,
} from "lucide-react";

import { PdfPreviewModal } from "@/components/pdf/pdf-preview-modal";
import { Button } from "@/components/ui/button";
import {
  AccentCard,
  AccentCardContent,
  AccentCardHeader,
  AccentCardTitle,
  MessageBanner,
  PageHero,
  PageShell,
} from "@/components/workshop/workshop-ui";
import {
  archiveDocument,
  DOCUMENT_TYPE_LABELS,
  getDocumentBlob,
  getDocumentsForJob,
  markDocumentFinal,
  type DocumentType,
  type JobDocument,
} from "@/lib/documents";
import {
  canArchiveDocuments,
  canFinalizeDocuments,
  canShareCustomerDocuments,
  type WorkshopJob,
} from "@/lib/jobs";
import {
  blockInternalDocumentShare,
  buildWhatsAppQuotationMessage,
  buildWhatsAppUrl,
  canShareOnWhatsApp,
} from "@/lib/sharing";
import { calculateQuotation } from "@/lib/quotation";
import { shouldShowDocumentsFilterBar } from "@/lib/module-menu";

type Filter = "all" | DocumentType | "final" | "archived";

type JobDocumentsTabProps = {
  job: WorkshopJob;
  onJobChange: (job: WorkshopJob) => void;
  initialFilter?: Filter;
  activeSection?: string;
};

const FILTER_LABELS: Partial<Record<Filter, string>> & Record<string, string> = {
  all: "All",
  "labour-cutting-sheet": "Labour",
  "internal-estimation": "Estimation",
  "standard-quotation": "Quotation",
  "premium-proposal": "Proposal",
  "workshop-cost-summary": "Summary",
  "profile-weight-summary": "Weight",
  final: "Final",
  archived: "Archived",
};

export function JobDocumentsTab({
  job,
  onJobChange,
  initialFilter = "all",
  activeSection,
}: JobDocumentsTabProps) {
  const [filter, setFilter] = useState<Filter>(initialFilter);
  const [message, setMessage] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState("Document Preview");
  const [previewDoc, setPreviewDoc] = useState<JobDocument | null>(null);

  useEffect(() => {
    setFilter(initialFilter);
  }, [initialFilter]);

  const documents = useMemo(() => getDocumentsForJob(job.id), [job.id, job.documentIds]);

  const filtered = documents.filter((doc) => {
    if (filter === "all") return doc.status !== "archived";
    if (filter === "final") return doc.status === "final";
    if (filter === "archived") return doc.status === "archived";
    return doc.documentType === filter && doc.status !== "archived";
  });

  async function handlePreview(doc: JobDocument) {
    const blob = await getDocumentBlob(doc);
    if (!blob) {
      setMessage("Document file not found. Regenerate the PDF.");
      return;
    }
    const url = URL.createObjectURL(blob);
    setPreviewUrl(url);
    setPreviewTitle(doc.fileName);
    setPreviewDoc(doc);
  }

  async function handleDownload(doc: JobDocument) {
    const blob = await getDocumentBlob(doc);
    if (!blob) {
      setMessage("Document file not found.");
      return;
    }
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = doc.fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function handleFinalize(doc: JobDocument) {
    if (!canFinalizeDocuments()) {
      setMessage("You do not have permission to finalize documents.");
      return;
    }
    const { job: next } = markDocumentFinal(job, doc.id);
    onJobChange(next);
    setMessage(`${doc.fileName} marked as final.`);
  }

  function handleArchive(doc: JobDocument) {
    if (!canArchiveDocuments()) {
      setMessage("You do not have permission to archive documents.");
      return;
    }
    onJobChange(archiveDocument(job, doc.id));
    setMessage(`${doc.fileName} archived.`);
  }

  function handleShare(doc: JobDocument) {
    if (blockInternalDocumentShare(doc.documentType)) {
      setMessage("Internal documents cannot be shared with customers.");
      return;
    }
    if (!canShareCustomerDocuments()) {
      setMessage("You do not have permission to share customer documents.");
      return;
    }
    if (!canShareOnWhatsApp(doc.documentType)) {
      setMessage("Sharing is only available for quotations and proposals.");
      return;
    }
    const totals = calculateQuotation(job.quotation).totals;
    const text = buildWhatsAppQuotationMessage({
      customerName: job.customerName,
      customerPhone: job.customerPhone,
      quotationForm: job.quotation,
      projectName: job.projectName,
      grandTotal: totals.grandTotal,
    });
    window.open(
      buildWhatsAppUrl(text, job.customerPhone),
      "_blank",
      "noopener,noreferrer",
    );
  }

  return (
    <PageShell>
      {!activeSection ? (
      <PageHero
        title="Documents"
        description="Generated PDFs linked to this job — internal and customer documents."
        icon={FileText}
      />
      ) : null}

      {message ? <MessageBanner tone="info">{message}</MessageBanner> : null}

      {shouldShowDocumentsFilterBar(activeSection) ? (
      <div className="flex flex-wrap gap-2">
        {(Object.keys(FILTER_LABELS) as Filter[]).map((key) => (
          <Button
            key={key}
            type="button"
            size="sm"
            variant={filter === key ? "default" : "outline"}
            onClick={() => setFilter(key)}
          >
            {FILTER_LABELS[key]}
          </Button>
        ))}
      </div>
      ) : null}

      <AccentCard>
        <AccentCardHeader>
          <AccentCardTitle>Document history</AccentCardTitle>
        </AccentCardHeader>
        <AccentCardContent className="space-y-3">
          {filtered.length === 0 ? (
            <p className="text-sm text-slate-500">
              No documents yet. Generate a cutting sheet, estimation or quotation PDF to add it here.
            </p>
          ) : (
            filtered.map((doc) => (
              <div
                key={doc.id}
                className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 md:flex-row md:items-center md:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">{doc.fileName}</p>
                  <p className="text-sm text-slate-500">
                    {DOCUMENT_TYPE_LABELS[doc.documentType]} · R{doc.revision} ·{" "}
                    {doc.audience === "internal" ? "Internal" : "Customer"} ·{" "}
                    {doc.status}
                  </p>
                  <p className="text-xs text-slate-400">
                    {new Date(doc.generatedAt).toLocaleString()} · {doc.generatedBy}
                    {doc.relatedProductIds.length
                      ? ` · ${doc.relatedProductIds.join(", ")}`
                      : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {doc.status === "final" ? (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                      <Star className="size-3" />
                      Final
                    </span>
                  ) : null}
                  <Button type="button" size="sm" variant="outline" onClick={() => handlePreview(doc)}>
                    <Eye />
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => handleDownload(doc)}>
                    <Download />
                  </Button>
                  {doc.audience === "customer" ? (
                    <Button type="button" size="sm" variant="outline" onClick={() => handleShare(doc)}>
                      Share
                    </Button>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                      <ShieldCheck className="size-3" />
                      Internal
                    </span>
                  )}
                  {doc.status === "draft" && canFinalizeDocuments() ? (
                    <Button type="button" size="sm" onClick={() => handleFinalize(doc)}>
                      Mark Final
                    </Button>
                  ) : null}
                  {doc.status !== "archived" && canArchiveDocuments() ? (
                    <Button type="button" size="sm" variant="outline" onClick={() => handleArchive(doc)}>
                      <Archive />
                    </Button>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </AccentCardContent>
      </AccentCard>

      {previewUrl ? (
        <PdfPreviewModal
          open
          title={previewTitle}
          blobUrl={previewUrl}
          onClose={() => {
            URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
            setPreviewDoc(null);
          }}
          onExport={
            previewDoc
              ? async () => {
                  await handleDownload(previewDoc);
                }
              : undefined
          }
        />
      ) : null}
    </PageShell>
  );
}
