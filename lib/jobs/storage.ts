import { loadEstimationInputs } from "@/lib/estimation/storage";
import { loadQuotationForm } from "@/lib/quotation/storage";

import { createEmptyJob } from "./products";
import {
  ensureJobId,
  ensureProductId,
  ensureQuotationId,
  generateWindowProductId,
} from "./id-generator";
import type { JobRegistry, WorkshopJob } from "./types";
import { getCurrentUserName } from "./permissions";
import { appendActivity } from "./activity";

const REGISTRY_KEY = "upvc-workshop-job-registry";

export function loadJobRegistry(): JobRegistry {
  if (typeof window === "undefined") {
    return { activeJobId: null, jobs: {} };
  }

  try {
    const raw = window.localStorage.getItem(REGISTRY_KEY);
    if (!raw) {
      return { activeJobId: null, jobs: {} };
    }
    return JSON.parse(raw) as JobRegistry;
  } catch {
    return { activeJobId: null, jobs: {} };
  }
}

export function saveJobRegistry(registry: JobRegistry): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(REGISTRY_KEY, JSON.stringify(registry));
}

export function saveJob(job: WorkshopJob): void {
  const registry = loadJobRegistry();
  registry.jobs[job.id] = job;
  registry.activeJobId = job.id;
  saveJobRegistry(registry);
}

export function getActiveJob(): WorkshopJob | null {
  const registry = loadJobRegistry();
  if (!registry.activeJobId) return null;
  return registry.jobs[registry.activeJobId] ?? null;
}

export function setActiveJobId(jobId: string): void {
  const registry = loadJobRegistry();
  if (registry.jobs[jobId]) {
    registry.activeJobId = jobId;
    saveJobRegistry(registry);
  }
}

/** Migrate legacy localStorage data into a normalized job on first load. */
export function migrateLegacyToJob(): WorkshopJob {
  const userName = getCurrentUserName();
  let job = createEmptyJob(userName);

  const estimation = loadEstimationInputs();
  const quotation = loadQuotationForm();
  const kind = estimation.productKind === "door" ? "door" : "window";
  const productIds = job.products.map((p) => p.id);
  const productId = ensureProductId(kind, job.id, undefined, productIds);

  const legacyProduct = {
    ...job.products[0]!,
    id: productId,
    productKind: kind as "window" | "door",
    label: kind === "door" ? "Door Job" : "Window Job",
    location: estimation.location,
    estimationInputs: estimation,
    updatedAt: new Date().toISOString(),
  };

  job = {
    ...job,
    id: ensureJobId(),
    customerName: estimation.customerName || quotation.customerName,
    billingAddress: quotation.customerAddress,
    siteAddress: estimation.location,
    projectName: quotation.subject || "Window Job",
    products: [legacyProduct],
    activeProductId: productId,
    quotation: {
      ...quotation,
      quotationId: ensureQuotationId(quotation.quotationId),
      revision: quotation.revision ?? 1,
      status: quotation.status ?? "draft",
    },
    cuttingJobMeta: {
      jobName: legacyProduct.label,
      jobNotes: "",
      windowLocation: estimation.location,
    },
  };

  job = appendActivity(job, "job-created", `Migrated legacy project to ${job.id}`, userName, job.id);

  saveJob(job);
  return job;
}

export function loadOrCreateActiveJob(): WorkshopJob {
  const existing = getActiveJob();
  if (existing) return normalizeJob(existing);

  const registry = loadJobRegistry();
  const firstId = Object.keys(registry.jobs)[0];
  if (firstId && registry.jobs[firstId]) {
    const job = normalizeJob(registry.jobs[firstId]!);
    saveJob(job);
    return job;
  }

  return migrateLegacyToJob();
}

export function normalizeJob(job: WorkshopJob): WorkshopJob {
  const productIds = job.products.map((p) => p.id);
  const products = job.products.map((p, index) => ({
    ...p,
    id: ensureProductId(p.productKind, job.id, p.id, productIds),
    sortOrder: p.sortOrder ?? index,
    createdAt: p.createdAt ?? job.createdAt,
    updatedAt: p.updatedAt ?? job.updatedAt,
  }));

  if (products.length === 0) {
    const fallback = generateWindowProductId(job.id, []);
    products.push({
      ...createEmptyJob(getCurrentUserName()).products[0]!,
      id: fallback,
    });
  }

  return {
    ...job,
    id: ensureJobId(job.id),
    products,
    activeProductId: job.activeProductId ?? products[0]?.id ?? null,
    quotation: {
      ...job.quotation,
      quotationId: ensureQuotationId(job.quotation?.quotationId),
      revision: job.quotation?.revision ?? 1,
      status: job.quotation?.status ?? "draft",
    },
    quotationRevisions: job.quotationRevisions ?? [],
    documentIds: job.documentIds ?? [],
    activity: job.activity ?? [],
    cuttingJobMeta: job.cuttingJobMeta ?? {
      jobName: products[0]?.label ?? "Window Job",
      jobNotes: job.notes ?? "",
      windowLocation: products[0]?.location ?? "",
    },
  };
}

export function listJobs(): WorkshopJob[] {
  const registry = loadJobRegistry();
  return Object.values(registry.jobs).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export function updateJobFields(
  job: WorkshopJob,
  patch: Partial<
    Pick<
      WorkshopJob,
      | "customerName"
      | "customerPhone"
      | "billingAddress"
      | "siteAddress"
      | "projectName"
      | "status"
      | "notes"
    >
  >,
  userName?: string,
): WorkshopJob {
  const next = {
    ...job,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  return appendActivity(next, "job-updated", "Job details updated", userName);
}
