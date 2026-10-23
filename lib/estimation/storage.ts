import { getDefaultEstimationInputs, normalizeEstimationDimensions } from "./defaults";
import type { EstimationInputs } from "./types";

const STORAGE_KEY = "upvc-workshop-estimation-inputs";

export function loadEstimationInputs(): EstimationInputs {
  if (typeof window === "undefined") {
    return getDefaultEstimationInputs();
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return getDefaultEstimationInputs();
    }

    const parsed = JSON.parse(raw) as Partial<EstimationInputs>;
    const defaults = getDefaultEstimationInputs();

    return normalizeEstimationDimensions({
      ...defaults,
      ...parsed,
      bearingSteelTrackRatePerFt:
        parsed.bearingSteelTrackRatePerFt ??
        (parsed.bearingSteelTrackRatePer10Ft != null
          ? parsed.bearingSteelTrackRatePer10Ft / 10
          : defaults.bearingSteelTrackRatePerFt),
      productKind: parsed.productKind ?? defaults.productKind,
      doorSettings: {
        ...defaults.doorSettings!,
        ...(parsed.doorSettings ?? {}),
        hardware: {
          ...defaults.doorSettings!.hardware,
          ...(parsed.doorSettings?.hardware ?? {}),
        },
      },
      overheads: {
        ...defaults.overheads,
        ...(parsed.overheads ?? {}),
      },
      glassRates: {
        ...defaults.glassRates,
        ...(parsed.glassRates ?? {}),
      },
      lockRates: {
        ...defaults.lockRates,
        ...(parsed.lockRates ?? {}),
      },
    });
  } catch {
    return getDefaultEstimationInputs();
  }
}

export function saveEstimationInputs(inputs: EstimationInputs): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(inputs));
}

export function resetEstimationInputs(): EstimationInputs {
  const defaults = getDefaultEstimationInputs();
  saveEstimationInputs(defaults);
  return defaults;
}
