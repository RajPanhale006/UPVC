import {
  CUTTING_METHOD_LABELS,
  TRACK_SYSTEM_PRESETS,
} from "./presets";
import type {
  CuttingMethod,
  ProfileCuttingSettings,
  TrackProfileCuttingConfig,
  TrackSystemId,
} from "./types";

const STORAGE_KEY = "upvc-profile-cutting-settings";

export function getDefaultProfileCuttingSettings(): ProfileCuttingSettings {
  const tracks = (Object.keys(TRACK_SYSTEM_PRESETS) as TrackSystemId[]).reduce(
    (acc, id) => {
      const preset = TRACK_SYSTEM_PRESETS[id];
      acc[id] = {
        trackSystemId: id,
        label: preset.label,
        profileCode: preset.profileCode,
        defaultCuttingMethod: "sarik",
        fallbackCuttingMethod: "sarik",
      };
      return acc;
    },
    {} as Record<TrackSystemId, TrackProfileCuttingConfig>,
  );

  return { tracks };
}

export function loadProfileCuttingSettings(): ProfileCuttingSettings {
  if (typeof window === "undefined") {
    return getDefaultProfileCuttingSettings();
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return getDefaultProfileCuttingSettings();
    }
    const parsed = JSON.parse(raw) as ProfileCuttingSettings;
    return {
      tracks: {
        ...getDefaultProfileCuttingSettings().tracks,
        ...parsed.tracks,
      },
    };
  } catch {
    return getDefaultProfileCuttingSettings();
  }
}

export function saveProfileCuttingSettings(settings: ProfileCuttingSettings): void {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function getDefaultMethodForTrack(
  settings: ProfileCuttingSettings,
  trackId: TrackSystemId,
): CuttingMethod {
  return settings.tracks[trackId]?.defaultCuttingMethod ?? "sarik";
}

export function getMethodLabel(method: CuttingMethod): string {
  return CUTTING_METHOD_LABELS[method];
}

export function updateTrackCuttingConfig(
  settings: ProfileCuttingSettings,
  trackId: TrackSystemId,
  patch: Partial<TrackProfileCuttingConfig>,
): ProfileCuttingSettings {
  return {
    tracks: {
      ...settings.tracks,
      [trackId]: {
        ...settings.tracks[trackId],
        ...patch,
      },
    },
  };
}
