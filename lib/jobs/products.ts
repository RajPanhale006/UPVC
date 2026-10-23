import {
  createDefaultCuttingOptions,
  ensureCuttingPresetApplied,
  syncCuttingOptionsForTrack,
} from "@/lib/cutting";
import { createDefaultDoorCuttingOptions } from "@/lib/cutting/door";
import { createDefaultFixedFrameSettings } from "@/lib/cutting/fixed-frame";
import {
  getDefaultEstimationInputs,
  isDoorProduct,
  isFixedFrameProduct,
} from "@/lib/estimation";
import type { EstimationInputs } from "@/lib/estimation/types";
import { getDefaultQuotationForm } from "@/lib/quotation";
import type { CuttingJobMeta } from "@/lib/summary/types";

import { appendActivity } from "./activity";
import {
  ensureProductId,
  generateDoorProductId,
  generateFixedFrameProductId,
  generateJobId,
  generateQuotationId,
  generateWindowProductId,
} from "./id-generator";
import type { JobProduct, JobProductKind, WorkshopJob } from "./types";

function nowIso(): string {
  return new Date().toISOString();
}

export function createDefaultCuttingJobMeta(kind: JobProductKind): CuttingJobMeta {
  return {
    jobName:
      kind === "door"
        ? "Door Job"
        : kind === "fixed-frame"
          ? "Fixed Frame Job"
          : "Window Job",
    jobNotes: "",
    windowLocation: "",
  };
}

export function createProductFromEstimation(
  jobId: string,
  kind: JobProductKind,
  estimationInputs: EstimationInputs,
  existingIds: string[],
  label?: string,
): JobProduct {
  const id =
    kind === "door"
      ? generateDoorProductId(jobId, existingIds)
      : kind === "fixed-frame"
        ? generateFixedFrameProductId(jobId, existingIds)
        : generateWindowProductId(jobId, existingIds);
  const ts = nowIso();
  const trackId = estimationInputs.trackSystemId;
  const cuttingOptions = ensureCuttingPresetApplied(
    createDefaultCuttingOptions(trackId, "sarik"),
    trackId,
  );

  return {
    id,
    productKind: kind,
    label:
      label ??
      (kind === "door"
        ? `Door ${id}`
        : kind === "fixed-frame"
          ? `Fixed Frame ${id}`
          : `Window ${id}`),
    location: estimationInputs.location,
    notes: "",
    sortOrder: existingIds.length,
    estimationInputs: {
      ...estimationInputs,
      productKind: kind,
      doorSettings:
        kind === "door"
          ? (estimationInputs.doorSettings ?? createDefaultDoorCuttingOptions("single"))
          : estimationInputs.doorSettings,
      fixedFrameSettings:
        kind === "fixed-frame"
          ? (estimationInputs.fixedFrameSettings ?? createDefaultFixedFrameSettings())
          : estimationInputs.fixedFrameSettings,
    },
    cuttingOptions,
    createdAt: ts,
    updatedAt: ts,
  };
}

export function createEmptyJob(userName: string): WorkshopJob {
  const ts = nowIso();
  const jobId = generateJobId();
  const defaultEstimation = getDefaultEstimationInputs();
  const firstProduct = createProductFromEstimation(jobId, "window", defaultEstimation, []);

  return {
    id: jobId,
    customerName: "",
    customerPhone: "",
    billingAddress: "",
    siteAddress: "",
    projectName: "New Project",
    createdAt: ts,
    updatedAt: ts,
    createdBy: userName,
    status: "draft",
    products: [firstProduct],
    activeProductId: firstProduct.id,
    notes: "",
    cuttingJobMeta: createDefaultCuttingJobMeta("window"),
    quotation: {
      ...getDefaultQuotationForm(),
      quotationId: generateQuotationId(),
      revision: 1,
      status: "draft",
    },
    quotationRevisions: [],
    documentIds: [],
    activity: [],
  };
}

export function getActiveProduct(job: WorkshopJob): JobProduct | null {
  if (!job.activeProductId) return job.products[0] ?? null;
  return job.products.find((p) => p.id === job.activeProductId) ?? job.products[0] ?? null;
}

export function syncActiveProductToJob(
  job: WorkshopJob,
  estimationInputs: EstimationInputs,
  cuttingOptions: import("@/lib/cutting/types").CuttingOptions,
  cuttingJobMeta: CuttingJobMeta,
): WorkshopJob {
  const active = getActiveProduct(job);
  if (!active) return job;

  const kind: JobProductKind = isFixedFrameProduct(estimationInputs)
    ? "fixed-frame"
    : isDoorProduct(estimationInputs)
      ? "door"
      : "window";
  const updatedProduct: JobProduct = {
    ...active,
    productKind: kind,
    label: cuttingJobMeta.jobName || active.label,
    location: cuttingJobMeta.windowLocation || estimationInputs.location,
    estimationInputs,
    cuttingOptions,
    updatedAt: nowIso(),
  };

  return {
    ...job,
    products: job.products.map((p) => (p.id === active.id ? updatedProduct : p)),
    cuttingJobMeta,
    customerName: job.customerName || estimationInputs.customerName,
    siteAddress: job.siteAddress || estimationInputs.location,
    updatedAt: nowIso(),
  };
}

export function applyActiveProductToState(job: WorkshopJob): {
  estimationInputs: EstimationInputs;
  cuttingOptions: import("@/lib/cutting/types").CuttingOptions;
  cuttingJobMeta: CuttingJobMeta;
} {
  const active = getActiveProduct(job);
  if (!active) {
    const defaults = getDefaultEstimationInputs();
    return {
      estimationInputs: defaults,
      cuttingOptions: createDefaultCuttingOptions(defaults.trackSystemId, "sarik"),
      cuttingJobMeta: job.cuttingJobMeta,
    };
  }

  return {
    estimationInputs: active.estimationInputs,
    cuttingOptions: active.cuttingOptions,
    cuttingJobMeta: {
      jobName: active.label,
      jobNotes: job.notes,
      windowLocation: active.location,
    },
  };
}

export function addProductToJob(
  job: WorkshopJob,
  kind: JobProductKind,
  userName: string,
): WorkshopJob {
  const defaults = getDefaultEstimationInputs();
  defaults.productKind = kind;
  if (kind === "door") {
    defaults.doorSettings = createDefaultDoorCuttingOptions("single");
  }
  if (kind === "fixed-frame") {
    defaults.fixedFrameSettings = createDefaultFixedFrameSettings();
  }
  const existingIds = job.products.map((p) => p.id);
  const product = createProductFromEstimation(job.id, kind, defaults, existingIds);
  const next = appendActivity(
    {
      ...job,
      products: [...job.products, product],
      activeProductId: product.id,
      cuttingJobMeta: createDefaultCuttingJobMeta(kind),
      updatedAt: nowIso(),
    },
    "product-added",
    `Added ${kind} ${product.id}`,
    userName,
    product.id,
  );
  return next;
}

export function duplicateProduct(job: WorkshopJob, productId: string, userName: string): WorkshopJob {
  const source = job.products.find((p) => p.id === productId);
  if (!source) return job;

  const existingIds = job.products.map((p) => p.id);
  const newId = ensureProductId(source.productKind, job.id, undefined, existingIds);
  const ts = nowIso();
  const copy: JobProduct = {
    ...source,
    id: newId,
    label: `${source.label} (copy)`,
    sortOrder: job.products.length,
    createdAt: ts,
    updatedAt: ts,
  };

  return appendActivity(
    {
      ...job,
      products: [...job.products, copy],
      activeProductId: copy.id,
      updatedAt: ts,
    },
    "product-duplicated",
    `Duplicated ${source.id} as ${copy.id}`,
    userName,
    copy.id,
  );
}

export function removeProduct(job: WorkshopJob, productId: string, userName: string): WorkshopJob {
  if (job.products.length <= 1) return job;
  const removed = job.products.find((p) => p.id === productId);
  const remaining = job.products.filter((p) => p.id !== productId);
  const reordered = remaining.map((p, i) => ({ ...p, sortOrder: i }));
  const nextActive =
    job.activeProductId === productId ? reordered[0]?.id ?? null : job.activeProductId;

  return appendActivity(
    {
      ...job,
      products: reordered,
      activeProductId: nextActive,
      updatedAt: nowIso(),
    },
    "product-removed",
    `Removed product ${removed?.id ?? productId}`,
    userName,
    productId,
  );
}

export function reorderProducts(job: WorkshopJob, orderedIds: string[]): WorkshopJob {
  const map = new Map(job.products.map((p) => [p.id, p]));
  const reordered = orderedIds
    .map((id, i) => {
      const p = map.get(id);
      return p ? { ...p, sortOrder: i } : null;
    })
    .filter((p): p is JobProduct => p !== null);

  const missing = job.products.filter((p) => !orderedIds.includes(p.id));
  const all = [...reordered, ...missing.map((p, i) => ({ ...p, sortOrder: reordered.length + i }))];

  return appendActivity(
    { ...job, products: all, updatedAt: nowIso() },
    "product-reordered",
    "Reordered products",
  );
}

export function setActiveProduct(job: WorkshopJob, productId: string): WorkshopJob {
  const product = job.products.find((p) => p.id === productId);
  if (!product) return job;

  return {
    ...job,
    activeProductId: productId,
    cuttingJobMeta: {
      jobName: product.label,
      jobNotes: job.notes,
      windowLocation: product.location,
    },
    updatedAt: nowIso(),
  };
}

export function updateProductQuantity(job: WorkshopJob, productId: string, quantity: number): WorkshopJob {
  const qty = Math.max(1, Math.floor(quantity));
  return {
    ...job,
    products: job.products.map((p) =>
      p.id === productId
        ? {
            ...p,
            estimationInputs: { ...p.estimationInputs, numberOfWindows: qty },
            updatedAt: nowIso(),
          }
        : p,
    ),
    updatedAt: nowIso(),
  };
}

export function switchProductTrack(
  job: WorkshopJob,
  productId: string,
  trackSystemId: import("@/lib/cutting/types").TrackSystemId,
): WorkshopJob {
  return {
    ...job,
    products: job.products.map((p) => {
      if (p.id !== productId) return p;
      const nextInputs = { ...p.estimationInputs, trackSystemId };
      const nextCutting = syncCuttingOptionsForTrack(p.cuttingOptions, trackSystemId);
      return {
        ...p,
        estimationInputs: nextInputs,
        cuttingOptions: nextCutting,
        updatedAt: nowIso(),
      };
    }),
    updatedAt: nowIso(),
  };
}
