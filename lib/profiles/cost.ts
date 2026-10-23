import { getDefaultProfileRateSettings } from "./catalog";
import {
  mergeProfileRateSettings,
  type ProfileRateSettings,
} from "./storage";

export {
  getDefaultProfileRateSettings,
} from "./catalog";

export {
  loadProfileRateSettings,
  mergeProfileRateSettings,
  resetProfileRateSettings,
  saveProfileRateSettings,
  updateMarketRatePerKg,
  updateProfileWeightPerFt,
} from "./storage";

export function formatInr(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function syncMarketRate(
  settings: ProfileRateSettings,
  marketRatePerKg: number,
): ProfileRateSettings {
  return mergeProfileRateSettings({
    ...settings,
    marketRatePerKg,
  });
}

export function getProfileRateSettingsOrDefault(
  settings?: ProfileRateSettings,
): ProfileRateSettings {
  return settings ?? getDefaultProfileRateSettings();
}
