import { DEFAULT_PROFILE_RATE_SETTINGS } from "./catalog";
import {
  recalculateProfileRates,
  type ProfileRateKey,
  type ProfileRateSettings,
  type WorkshopProfileRate,
} from "./types";

const STORAGE_KEY = "upvc-workshop-profile-rates";

export function mergeProfileRateSettings(
  settings: ProfileRateSettings,
): ProfileRateSettings {
  const defaults = structuredClone(DEFAULT_PROFILE_RATE_SETTINGS);
  const defaultByKey = new Map(
    defaults.profiles.map((profile) => [profile.key, profile]),
  );

  const profiles = defaults.profiles.map((defaultProfile) => {
    const saved = settings.profiles.find((p) => p.key === defaultProfile.key);
    if (!saved) {
      return defaultProfile;
    }

    return {
      ...defaultProfile,
      weightPerFt: saved.weightPerFt ?? defaultProfile.weightPerFt,
      ratePerKg: saved.ratePerKg ?? defaultProfile.ratePerKg,
      notes: saved.notes ?? defaultProfile.notes,
    };
  });

  return recalculateProfileRates({
    marketRatePerKg: settings.marketRatePerKg ?? defaults.marketRatePerKg,
    profiles,
  });
}

export function loadProfileRateSettings(): ProfileRateSettings {
  if (typeof window === "undefined") {
    return structuredClone(DEFAULT_PROFILE_RATE_SETTINGS);
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return structuredClone(DEFAULT_PROFILE_RATE_SETTINGS);
    }

    return mergeProfileRateSettings(JSON.parse(raw) as ProfileRateSettings);
  } catch {
    return structuredClone(DEFAULT_PROFILE_RATE_SETTINGS);
  }
}

export function saveProfileRateSettings(settings: ProfileRateSettings): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function resetProfileRateSettings(): ProfileRateSettings {
  const defaults = structuredClone(DEFAULT_PROFILE_RATE_SETTINGS);
  saveProfileRateSettings(defaults);
  return defaults;
}

export function updateProfileWeightPerFt(
  settings: ProfileRateSettings,
  key: ProfileRateKey,
  weightPerFt: number,
): ProfileRateSettings {
  return mergeProfileRateSettings({
    ...settings,
    profiles: settings.profiles.map((profile) =>
      profile.key === key ? { ...profile, weightPerFt } : profile,
    ),
  });
}

export function updateMarketRatePerKg(
  settings: ProfileRateSettings,
  marketRatePerKg: number,
): ProfileRateSettings {
  return mergeProfileRateSettings({
    ...settings,
    marketRatePerKg,
  });
}

export type { WorkshopProfileRate, ProfileRateSettings, ProfileRateKey };
