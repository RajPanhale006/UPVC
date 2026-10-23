import { DEFAULT_STANDARD_BAR_LENGTH_MM } from "@/lib/cutting/bar-optimization/constants";
import { MM_PER_FOOT } from "@/lib/units/conversion";

import type { ProfileRateSettings, WorkshopProfileRate } from "./types";

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Running-foot weight → kg per metre (supplier / workshop standard). */
export function profileWeightKgPerMetre(profile: WorkshopProfileRate): number {
  return round2((profile.weightPerFt * 1000) / MM_PER_FOOT);
}

export function profileStockLengthMm(
  profile: Pick<WorkshopProfileRate, "standardBarLengthMm">,
): number {
  return profile.standardBarLengthMm > 0
    ? profile.standardBarLengthMm
    : DEFAULT_STANDARD_BAR_LENGTH_MM;
}

export function profileStockLengthFt(
  profile: Pick<WorkshopProfileRate, "standardBarLengthMm" | "barLengthFt">,
): number {
  if (profile.barLengthFt > 0) {
    return profile.barLengthFt;
  }
  return round2(profileStockLengthMm(profile) / MM_PER_FOOT);
}

/** Profile rate key → stock length (mm) from profile master. */
export function buildProfileKeyStockLengthMmMap(
  settings: ProfileRateSettings,
): Record<string, number> {
  const map: Record<string, number> = {};
  for (const profile of settings.profiles) {
    map[profile.key] = profileStockLengthMm(profile);
  }
  return map;
}

export { DEFAULT_STANDARD_BAR_LENGTH_MM };
