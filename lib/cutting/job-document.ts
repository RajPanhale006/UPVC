import type { CuttingOptions, CuttingResult, TrackSystemId } from "./types";
import { migrateCuttingOptions } from "./presets";

export const JOB_DOCUMENT_VERSION = 2 as const;
export const JOB_METADATA_PREFIX = "UPVCJOB:";

export type CuttingJobDocument = {
  version: typeof JOB_DOCUMENT_VERSION;
  exportedAt: string;
  jobName: string;
  jobNotes: string;
  customerName: string;
  location: string;
  windowLocation: string;
  systemId: TrackSystemId;
  systemLabel: string;
  profileCode: string;
  widthMm: number;
  heightMm: number;
  numberOfWindows: number;
  options: CuttingOptions;
};

export type CuttingJobExportInput = CuttingJobDocument & {
  result: CuttingResult;
};

export function createJobDocument(input: {
  jobName: string;
  jobNotes: string;
  customerName?: string;
  location?: string;
  windowLocation?: string;
  systemId: TrackSystemId;
  systemLabel: string;
  profileCode: string;
  widthMm: number;
  heightMm: number;
  numberOfWindows: number;
  options: CuttingOptions;
}): CuttingJobDocument {
  return {
    version: JOB_DOCUMENT_VERSION,
    exportedAt: new Date().toISOString(),
    jobName: input.jobName.trim() || "Cutting Job",
    jobNotes: input.jobNotes.trim(),
    customerName: input.customerName?.trim() ?? "",
    location: input.location?.trim() ?? "",
    windowLocation: input.windowLocation?.trim() ?? "",
    systemId: input.systemId,
    systemLabel: input.systemLabel,
    profileCode: input.profileCode,
    widthMm: input.widthMm,
    heightMm: input.heightMm,
    numberOfWindows: Math.max(1, input.numberOfWindows),
    options: input.options,
  };
}

function encodeUtf8Base64(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function decodeUtf8Base64(value: string): string {
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeJobDocument(job: CuttingJobDocument): string {
  return `${JOB_METADATA_PREFIX}${encodeUtf8Base64(JSON.stringify(job))}`;
}

export function decodeJobDocument(encoded: string): CuttingJobDocument | null {
  if (!encoded.startsWith(JOB_METADATA_PREFIX)) {
    return null;
  }

  const payload = encoded.slice(JOB_METADATA_PREFIX.length);
  let parsed: unknown;

  try {
    parsed = JSON.parse(decodeUtf8Base64(payload));
  } catch {
    try {
      parsed = JSON.parse(atob(payload));
    } catch {
      return null;
    }
  }

  if (
    typeof parsed !== "object" ||
    parsed == null ||
    typeof (parsed as CuttingJobDocument).systemId !== "string" ||
    typeof (parsed as CuttingJobDocument).widthMm !== "number" ||
    typeof (parsed as CuttingJobDocument).heightMm !== "number" ||
    typeof (parsed as CuttingJobDocument).options !== "object"
  ) {
    return null;
  }

  const job = parsed as CuttingJobDocument;
  const options = migrateCuttingOptions(job.options, job.systemId);

  return {
    version: JOB_DOCUMENT_VERSION,
    exportedAt: job.exportedAt ?? new Date().toISOString(),
    jobName: job.jobName ?? "Cutting Job",
    jobNotes: job.jobNotes ?? "",
    customerName: job.customerName ?? "",
    location: job.location ?? "",
    windowLocation: job.windowLocation ?? "",
    systemId: job.systemId,
    systemLabel: job.systemLabel ?? job.systemId,
    profileCode: job.profileCode ?? "",
    widthMm: job.widthMm,
    heightMm: job.heightMm,
    numberOfWindows: job.numberOfWindows ?? 1,
    options,
  };
}

export function formatCutLength(
  lengthMm: number,
  crossSectionMm?: number,
): string {
  if (crossSectionMm != null) {
    return `${lengthMm.toFixed(1)} × ${crossSectionMm.toFixed(1)}`;
  }

  return lengthMm.toFixed(1);
}

export function buildExportFilename(jobName: string): string {
  const slug = jobName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const date = new Date().toISOString().slice(0, 10);

  return `${slug || "cutting-sheet"}-${date}.pdf`;
}
