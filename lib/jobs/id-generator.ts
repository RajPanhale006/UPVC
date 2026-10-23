/** Structured ID generation with localStorage counters — client-side safe generation. */

const COUNTERS_KEY = "upvc-workshop-id-counters";
const LOCK_KEY = "upvc-workshop-id-lock";

type CounterStore = Record<string, number>;

function currentYear(): number {
  return new Date().getFullYear();
}

function loadCounters(): CounterStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(COUNTERS_KEY);
    return raw ? (JSON.parse(raw) as CounterStore) : {};
  } catch {
    return {};
  }
}

function saveCounters(counters: CounterStore): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(COUNTERS_KEY, JSON.stringify(counters));
}

/** Simple spin-lock for read-modify-write counter increments. */
function withCounterLock<T>(fn: () => T): T {
  if (typeof window === "undefined") return fn();

  const maxAttempts = 20;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const now = Date.now();
    const lockRaw = window.localStorage.getItem(LOCK_KEY);
    if (lockRaw) {
      const lockTime = Number.parseInt(lockRaw, 10);
      if (Number.isFinite(lockTime) && now - lockTime < 5000) {
        continue;
      }
    }
    window.localStorage.setItem(LOCK_KEY, String(now));
    try {
      return fn();
    } finally {
      window.localStorage.removeItem(LOCK_KEY);
    }
  }
  return fn();
}

function nextCounter(key: string): number {
  return withCounterLock(() => {
    const counters = loadCounters();
    const next = (counters[key] ?? 0) + 1;
    counters[key] = next;
    saveCounters(counters);
    return next;
  });
}

function pad4(n: number): string {
  return String(n).padStart(4, "0");
}

function pad3(n: number): string {
  return String(n).padStart(3, "0");
}

export function generateJobId(): string {
  const year = currentYear();
  return `JOB-${year}-${pad4(nextCounter(`job-${year}`))}`;
}

export function generateWindowProductId(jobId: string, existingIds: string[]): string {
  const used = new Set(existingIds);
  let n = nextCounter(`window-${jobId}`);
  let id = `W-${pad3(n)}`;
  while (used.has(id)) {
    n += 1;
    id = `W-${pad3(n)}`;
  }
  return id;
}

export function generateDoorProductId(jobId: string, existingIds: string[]): string {
  const used = new Set(existingIds);
  let n = nextCounter(`door-${jobId}`);
  let id = `D-${pad3(n)}`;
  while (used.has(id)) {
    n += 1;
    id = `D-${pad3(n)}`;
  }
  return id;
}

export function generateFixedFrameProductId(jobId: string, existingIds: string[]): string {
  const used = new Set(existingIds);
  let n = nextCounter(`fixed-frame-${jobId}`);
  let id = `F-${pad3(n)}`;
  while (used.has(id)) {
    n += 1;
    id = `F-${pad3(n)}`;
  }
  return id;
}

export function generateQuotationId(): string {
  const year = currentYear();
  return `QTN-${year}-${pad4(nextCounter(`quotation-${year}`))}`;
}

export function formatQuotationIdWithRevision(quotationId: string, revision: number): string {
  if (revision <= 1) return quotationId;
  return `${quotationId}-R${revision}`;
}

export function generateEstimationDocId(jobId: string, revision: number): string {
  const year = currentYear();
  const base = `EST-${year}-${pad4(nextCounter(`estimation-${year}`))}`;
  return revision <= 1 ? base : `${base}-R${revision}`;
}

export function generateCuttingDocId(jobId: string, productId: string, revision: number): string {
  const year = currentYear();
  const base = `CUT-${year}-${pad4(nextCounter(`cutting-${year}`))}`;
  const suffix = revision <= 1 ? "" : `-R${revision}`;
  return `${base}${suffix}`;
}

export function generateProposalDocId(revision: number): string {
  const year = currentYear();
  const base = `PROP-${year}-${pad4(nextCounter(`proposal-${year}`))}`;
  return revision <= 1 ? base : `${base}-R${revision}`;
}

export function generateDocumentRecordId(): string {
  return `DOC-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function generateActivityId(): string {
  return `ACT-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Safe fallback for legacy records missing structured IDs. */
export function ensureJobId(existing?: string): string {
  if (existing?.startsWith("JOB-")) return existing;
  return generateJobId();
}

export function ensureQuotationId(existing?: string): string {
  if (existing?.startsWith("QTN-")) return existing.split("-R")[0] ?? existing;
  return generateQuotationId();
}

export function ensureProductId(
  kind: "window" | "door" | "fixed-frame",
  jobId: string,
  existing?: string,
  allIds: string[] = [],
): string {
  if (
    existing &&
    (existing.startsWith("W-") ||
      existing.startsWith("D-") ||
      existing.startsWith("F-"))
  ) {
    return existing;
  }
  if (kind === "door") return generateDoorProductId(jobId, allIds);
  if (kind === "fixed-frame") return generateFixedFrameProductId(jobId, allIds);
  return generateWindowProductId(jobId, allIds);
}
