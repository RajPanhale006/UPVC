import type { ProjectEstimateSettings } from "./types";

const KEY_PREFIX = "upvc-project-estimate-";

export const DEFAULT_PROJECT_ESTIMATE_SETTINGS: ProjectEstimateSettings = {
  installationCharge: 0,
  transportationCharge: 0,
  discountPercent: 0,
};

export function loadProjectEstimateSettings(jobId: string): ProjectEstimateSettings {
  if (typeof window === "undefined") return { ...DEFAULT_PROJECT_ESTIMATE_SETTINGS };
  const raw = window.localStorage.getItem(`${KEY_PREFIX}${jobId}`);
  if (!raw) return { ...DEFAULT_PROJECT_ESTIMATE_SETTINGS };
  try {
    const parsed = JSON.parse(raw) as Partial<ProjectEstimateSettings>;
    return {
      installationCharge: Math.max(0, Number(parsed.installationCharge) || 0),
      transportationCharge: Math.max(0, Number(parsed.transportationCharge) || 0),
      discountPercent: Math.min(100, Math.max(0, Number(parsed.discountPercent) || 0)),
    };
  } catch {
    return { ...DEFAULT_PROJECT_ESTIMATE_SETTINGS };
  }
}

export function saveProjectEstimateSettings(
  jobId: string,
  settings: ProjectEstimateSettings,
): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(`${KEY_PREFIX}${jobId}`, JSON.stringify(settings));
}
