import type { ProfileRateSettings } from "@/lib/profiles/types";

import { resolveProfileRateKey } from "../profile-rate-map";

const SKU_ALIASES: Record<string, string> = {
  "T109-600": "3 Track T109-600",
  "T60-431-1": "2 Track T60-431-1",
  "T60-2.5T": "2.5 Track T60",
  "T60-051": "66 Window Sash T60-051",
  "T60-052": "Screen / Net Sash T60-052",
  "T60-413": "Interlock T60-413",
  "T88-044": "GB 25mm T88-044 Beading",
  "P60A-052": "Frame P60A-052",
  "P60A-057": "Door Sash P60A-057",
  "P60A-059": "Beading P60A-059",
  STEEL: "Steel Reinforcement",
};

export function resolveProfileDisplayName(
  profileCode: string,
  profileRates: ProfileRateSettings,
): string {
  if (profileCode in SKU_ALIASES) {
    return SKU_ALIASES[profileCode]!;
  }

  const rateKey = resolveProfileRateKey(profileCode);
  if (rateKey) {
    const profile = profileRates.profiles.find((row) => row.key === rateKey);
    if (profile) {
      return profile.description;
    }
  }

  return profileCode;
}
