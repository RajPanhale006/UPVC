import type { TrackSystemId } from "@/lib/cutting/types";
import {
  getGlassSashProfileCode,
  getProfileCodeForOptions,
  getScreenSashProfileCode,
} from "@/lib/cutting/presets";
import { DOOR_PROFILE_CODES } from "@/lib/cutting/door/constants";
import type { CuttingOptions } from "@/lib/cutting/types";
import type { ProfileRateKey, ProfileRateSettings } from "@/lib/profiles/types";
import { profileWeightKgPerMetre } from "@/lib/profiles/stock-length";

import {
  SLIDING_BEADING_PROFILE_CODE,
  SLIDING_INTERLOCK_PROFILE_CODE,
  STEEL_PROFILE_CODE,
} from "./extract-pieces";

/** Map workshop profile SKU → Profiles tab rate key. */
const PROFILE_CODE_RATE_KEYS: Record<string, ProfileRateKey> = {
  "T109-600": "frame-3-track",
  "T60-431-1": "frame-2-track",
  "T60-2.5T": "frame-2-5-track",
  [getGlassSashProfileCode()]: "sash",
  "T60-052": "screen-sash",
  [SLIDING_INTERLOCK_PROFILE_CODE]: "interlock",
  [SLIDING_BEADING_PROFILE_CODE]: "beading",
  [DOOR_PROFILE_CODES.frame]: "casement-frame", // frame + mullion share P60A-052
  [DOOR_PROFILE_CODES.sash]: "door-sash",
  [DOOR_PROFILE_CODES.beading]: "gb36-beading",
};

export function resolveProfileRateKey(
  profileCode: string,
  trackSystemId?: TrackSystemId,
  options?: CuttingOptions,
): ProfileRateKey | null {
  if (profileCode === STEEL_PROFILE_CODE) {
    return null;
  }

  const mapped = PROFILE_CODE_RATE_KEYS[profileCode];
  if (mapped) {
    return mapped;
  }

  if (trackSystemId && options) {
    const frameCode = getProfileCodeForOptions(trackSystemId, options);
    if (profileCode === frameCode) {
      switch (trackSystemId) {
        case "2-track-t60":
          return "frame-2-track";
        case "2.5-track-t60":
          return "frame-2-5-track";
        case "3-track-t109":
          return "frame-3-track";
      }
    }

    const screenCode = getScreenSashProfileCode(trackSystemId, options);
    if (profileCode === screenCode) {
      return "screen-sash";
    }
  }

  return null;
}

export function buildProfileWeightAndRateMaps(input: {
  profileRates: ProfileRateSettings;
  profileCodes: string[];
  trackSystemId?: TrackSystemId;
  cuttingOptions?: CuttingOptions;
}): {
  weightKgPerMetreByProfile: Record<string, number>;
  ratePerKgByProfile: Record<string, number>;
} {
  const profileMap = new Map(
    input.profileRates.profiles.map((profile) => [profile.key, profile]),
  );
  const weightKgPerMetreByProfile: Record<string, number> = {};
  const ratePerKgByProfile: Record<string, number> = {};

  for (const profileCode of input.profileCodes) {
    if (profileCode === STEEL_PROFILE_CODE) {
      continue;
    }
    const rateKey = resolveProfileRateKey(
      profileCode,
      input.trackSystemId,
      input.cuttingOptions,
    );
    if (!rateKey) {
      continue;
    }
    const profile = profileMap.get(rateKey);
    if (!profile) {
      continue;
    }
    weightKgPerMetreByProfile[profileCode] = profileWeightKgPerMetre(profile);
    ratePerKgByProfile[profileCode] = profile.ratePerKg;
  }

  return { weightKgPerMetreByProfile, ratePerKgByProfile };
}

export type WindowProfileCategory =
  | "frame"
  | "sash"
  | "screen-sash"
  | "interlock"
  | "beading"
  | "steel";

export function profileCodeToWindowCategory(
  profileCode: string,
  trackSystemId?: TrackSystemId,
  cuttingOptions?: CuttingOptions,
): WindowProfileCategory | null {
  if (profileCode === STEEL_PROFILE_CODE) {
    return "steel";
  }

  const rateKey = resolveProfileRateKey(profileCode, trackSystemId, cuttingOptions);
  switch (rateKey) {
    case "frame-2-track":
    case "frame-2-5-track":
    case "frame-3-track":
    case "casement-frame":
      return "frame";
    case "sash":
    case "door-sash":
      return "sash";
    case "screen-sash":
      return "screen-sash";
    case "interlock":
      return "interlock";
    case "beading":
    case "gb36-beading":
      return "beading";
    default:
      return null;
  }
}

export type DoorProfileCategory = "frame" | "sash" | "beading";

export function profileCodeToDoorCategory(profileCode: string): DoorProfileCategory | null {
  if (profileCode === DOOR_PROFILE_CODES.frame || profileCode === DOOR_PROFILE_CODES.mullion) {
    return "frame";
  }
  if (profileCode === DOOR_PROFILE_CODES.sash) {
    return "sash";
  }
  if (profileCode === DOOR_PROFILE_CODES.beading) {
    return "beading";
  }
  return null;
}
