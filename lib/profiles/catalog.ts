import { DEFAULT_STANDARD_BAR_LENGTH_MM } from "@/lib/cutting/bar-optimization/constants";
import { MM_PER_FOOT } from "@/lib/units/conversion";

import {
  recalculateProfileRates,
  type ProfileRateKey,
  type ProfileRateSettings,
  type WorkshopProfileRate,
} from "./types";

export const DEFAULT_MARKET_RATE_PER_KG = 150;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function profile(
  key: ProfileRateKey,
  serialNo: number,
  description: string,
  weightPerFt: number,
  notes: string,
  standardBarLengthMm: number = DEFAULT_STANDARD_BAR_LENGTH_MM,
): WorkshopProfileRate {
  const barLengthFt = round2(standardBarLengthMm / MM_PER_FOOT);
  const weightKgPerBar = round2(weightPerFt * barLengthFt);
  return {
    key,
    serialNo,
    description,
    standardBarLengthMm,
    weightKgPerBar,
    barLengthFt,
    weightPerFt,
    ratePerKg: DEFAULT_MARKET_RATE_PER_KG,
    ratePerFt: round2(weightPerFt * DEFAULT_MARKET_RATE_PER_KG),
    notes,
  };
}

/** Profile Rates sheet from UPVC Cutting Size.xlsx — stock length 5800 mm (Tonish). */
export const DEFAULT_PROFILE_RATE_SETTINGS: ProfileRateSettings =
  recalculateProfileRates({
    marketRatePerKg: DEFAULT_MARKET_RATE_PER_KG,
    profiles: [
      profile(
        "frame-2-track",
        1,
        "2 Track T60-431-1 New",
        0.3305,
        "2 Track outer frame",
      ),
      profile(
        "frame-2-5-track",
        2,
        "2.5 Track T60-431-1 New",
        0.375,
        "2.5 Track outer frame",
      ),
      profile(
        "frame-3-track",
        3,
        "3 Track T109-600",
        0.499,
        "3 Track outer frame",
      ),
      profile(
        "sash",
        4,
        "66 Window Sash T60-051 With Gasket",
        0.268,
        "Sliding sash",
      ),
      profile(
        "beading",
        5,
        "GB 25mm T88-044 with Gasket",
        0.071,
        "Glass beading",
      ),
      profile(
        "interlock",
        6,
        "66 and 73 Window Sash Interlock T60-413",
        0.084,
        "Interlock",
      ),
      profile(
        "casement-frame",
        7,
        "Frame P60A-052 with Gasket",
        0.3,
        "Casement frame reference",
      ),
      profile(
        "casement-sash",
        8,
        "Outward Window Sash P60A-056 with Gasket",
        0.353,
        "Casement sash reference",
      ),
      profile(
        "door-sash",
        9,
        "Outward Door Sash P60A-057 with Gasket",
        0.463,
        "Door sash reference",
      ),
      profile(
        "gb36-beading",
        10,
        "GB36mm P60A-059 with Gasket",
        0.091,
        "Beading reference",
      ),
      profile(
        "screen-sash",
        11,
        "Screen / Net Sash T60-052 with Gasket",
        0.25,
        "Third-track mesh / net sliding sash",
      ),
    ],
  });

export function getDefaultProfileRateSettings(): ProfileRateSettings {
  return structuredClone(DEFAULT_PROFILE_RATE_SETTINGS);
}
