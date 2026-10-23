import { appendActivity } from "@/lib/jobs/activity";
import { generateDocumentRecordId } from "@/lib/jobs/id-generator";
import { getCurrentUserName } from "@/lib/jobs/permissions";
import { saveJob, loadJobRegistry } from "@/lib/jobs/storage";
import type { WorkshopJob } from "@/lib/jobs/types";

import { blobKeyForDocument, getPdfBlob, storePdfBlob } from "./blob-store";
import { buildSourceSnapshot, snapshotsMatch } from "./snapshot";
import {
  DOCUMENT_AUDIENCE,
  isCustomerDocument,
  sanitizeFileName,
  type DocumentType,
  type JobDocument,
  type SourceSnapshot,
} from "./types";

const DOCUMENTS_KEY = "upvc-workshop-documents";

function loadAllDocuments(): Record<string, JobDocument> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(DOCUMENTS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, JobDocument>) : {};
  } catch {
    return {};
  }
}

function saveAllDocuments(docs: Record<string, JobDocument>): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DOCUMENTS_KEY, JSON.stringify(docs));
}

/** Recent documents across all jobs — metadata only, sorted newest first. */
export function listAllDocuments(): JobDocument[] {
  return Object.values(loadAllDocuments()).sort(
    (a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime(),
  );
}

export function getDocumentsForJob(jobId: string): JobDocument[] {
  return Object.values(loadAllDocuments())
    .filter((d) => d.jobId === jobId)
    .sort(
      (a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime(),
    );
}

export function getDocumentById(id: string): JobDocument | null {
  return loadAllDocuments()[id] ?? null;
}

function nextRevision(jobId: string, documentType: DocumentType, productIds: string[]): number {
  const existing = getDocumentsForJob(jobId).filter(
    (d) =>
      d.documentType === documentType &&
      d.relatedProductIds.join(",") === productIds.join(","),
  );
  if (existing.length === 0) return 1;
  return Math.max(...existing.map((d) => d.revision)) + 1;
}

export type RegisterDocumentInput = {
  job: WorkshopJob;
  documentType: DocumentType;
  pdfBlob: Blob;
  fileName: string;
  relatedProductIds?: string[];
  quotationId?: string;
  calculationMethodVersion?: string;
  sourcePayload: Record<string, unknown>;
  sourceSummary: string;
  notes?: string;
};

export type RegisterDocumentResult =
  | { ok: true; document: JobDocument; reused: boolean; job: WorkshopJob }
  | { ok: false; message: string };

export async function registerGeneratedDocument(
  input: RegisterDocumentInput,
): Promise<RegisterDocumentResult> {
  const user = getCurrentUserName();
  const productIds = input.relatedProductIds ?? [];
  const snapshot = buildSourceSnapshot(input.sourceSummary, input.sourcePayload);

  const existing = getDocumentsForJob(input.job.id)
    .filter(
      (d) =>
        d.documentType === input.documentType &&
        d.status !== "archived" &&
        d.relatedProductIds.join(",") === productIds.join(","),
    )
    .sort((a, b) => b.revision - a.revision)[0];

  if (existing && snapshotsMatch(existing.sourceSnapshot, snapshot)) {
    return { ok: true, document: existing, reused: true, job: input.job };
  }

  const revision = nextRevision(input.job.id, input.documentType, productIds);
  const docId = generateDocumentRecordId();
  const blobKey = blobKeyForDocument(docId, revision);
  await storePdfBlob(blobKey, input.pdfBlob);

  const document: JobDocument = {
    id: docId,
    jobId: input.job.id,
    documentType: input.documentType,
    relatedProductIds: productIds,
    quotationId: input.quotationId,
    revision,
    fileName: sanitizeFileName(input.fileName),
    blobKey,
    generatedBy: user,
    generatedAt: new Date().toISOString(),
    calculationMethodVersion: input.calculationMethodVersion,
    companySettingsRef: "current",
    status: "draft",
    audience: DOCUMENT_AUDIENCE[input.documentType],
    notes: input.notes ?? "",
    sourceSnapshot: snapshot,
    fileSizeBytes: input.pdfBlob.size,
  };

  const all = loadAllDocuments();
  all[docId] = document;
  saveAllDocuments(all);

  let job: WorkshopJob = {
    ...input.job,
    documentIds: [...new Set([...input.job.documentIds, docId])],
    updatedAt: document.generatedAt,
  };
  job = appendActivity(
    job,
    "document-generated",
    `Generated ${document.fileName} (R${revision})`,
    user,
    docId,
  );
  saveJob(job);

  return { ok: true, document, reused: false, job };
}

export async function getDocumentBlob(document: JobDocument): Promise<Blob | null> {
  return getPdfBlob(document.blobKey);
}

export function markDocumentFinal(
  job: WorkshopJob,
  documentId: string,
  userName?: string,
): { job: WorkshopJob; document: JobDocument | null } {
  const all = loadAllDocuments();
  const doc = all[documentId];
  if (!doc || doc.jobId !== job.id) return { job, document: null };
  if (doc.status === "final") return { job, document: doc };

  const user = userName ?? getCurrentUserName();
  const ts = new Date().toISOString();
  const finalized: JobDocument = {
    ...doc,
    status: "final",
    finalizedBy: user,
    finalizedAt: ts,
  };
  all[documentId] = finalized;

  if (isCustomerDocument(doc.documentType) && doc.quotationId) {
    for (const [id, other] of Object.entries(all)) {
      if (
        id !== documentId &&
        other.jobId === job.id &&
        other.quotationId === doc.quotationId &&
        other.status === "final" &&
        isCustomerDocument(other.documentType)
      ) {
        all[id] = { ...other, status: "superseded" };
      }
    }
  }

  saveAllDocuments(all);

  const nextJob = appendActivity(
    job,
    "document-finalized",
    `Finalized ${doc.fileName}`,
    user,
    documentId,
  );
  saveJob(nextJob);
  return { job: nextJob, document: finalized };
}

export function archiveDocument(
  job: WorkshopJob,
  documentId: string,
  userName?: string,
): WorkshopJob {
  const all = loadAllDocuments();
  const doc = all[documentId];
  if (!doc) return job;
  all[documentId] = { ...doc, status: "archived" };
  saveAllDocuments(all);
  const next = appendActivity(
    job,
    "document-archived",
    `Archived ${doc.fileName}`,
    userName,
  );
  saveJob(next);
  return next;
}

export function deleteDraftDocument(job: WorkshopJob, documentId: string): WorkshopJob {
  const all = loadAllDocuments();
  const doc = all[documentId];
  if (!doc || doc.status === "final") return job;
  delete all[documentId];
  saveAllDocuments(all);
  const next: WorkshopJob = {
    ...job,
    documentIds: job.documentIds.filter((id) => id !== documentId),
    updatedAt: new Date().toISOString(),
  };
  saveJob(next);
  return next;
}

export function unmarkDocumentFinal(
  job: WorkshopJob,
  documentId: string,
): { job: WorkshopJob; document: JobDocument | null } {
  const all = loadAllDocuments();
  const doc = all[documentId];
  if (!doc || doc.status !== "final") return { job, document: doc ?? null };
  all[documentId] = {
    ...doc,
    status: "draft",
    finalizedBy: undefined,
    finalizedAt: undefined,
  };
  saveAllDocuments(all);
  saveJob(job);
  return { job, document: all[documentId] ?? null };
}

export function getActiveFinalQuotation(jobId: string, quotationId: string): JobDocument | null {
  return (
    getDocumentsForJob(jobId).find(
      (d) =>
        d.documentType === "standard-quotation" &&
        d.quotationId === quotationId &&
        d.status === "final",
    ) ?? null
  );
}

export async function pdfBlobFromJsPdf(doc: import("jspdf").jsPDF): Promise<Blob> {
  return doc.output("blob") as Blob;
}

export function linkJobDocuments(jobId: string): JobDocument[] {
  const registry = loadJobRegistry();
  const job = registry.jobs[jobId];
  if (!job) return [];
  return getDocumentsForJob(jobId);
}

export type { SourceSnapshot };
