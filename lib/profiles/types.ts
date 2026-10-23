export type ProfileRateKey =
  | "frame-2-track"
  | "frame-2-5-track"
  | "frame-3-track"
  | "sash"
  | "beading"
  | "interlock"
  | "casement-frame"
  | "casement-sash"
  | "door-sash"
  | "gb36-beading"
  | "screen-sash";

export type WorkshopProfileRate = {
  key: ProfileRateKey;
  serialNo: number;
  description: string;
  /** Physical supplier bar length used for purchase weight (mm). Tonish default 5800. */
  standardBarLengthMm: number;
  weightKgPerBar: number;
  barLengthFt: number;
  weightPerFt: number;
  ratePerKg: number;
  ratePerFt: number;
  notes: string;
};

export type ProfileRateSettings = {
  marketRatePerKg: number;
  profiles: WorkshopProfileRate[];
};

export type CostLineItem = {
  cutName: string;
  profileName: string;
  profileCode: string;
  lengthMm: number;
  qty: number;
  totalLengthM: number;
  weightKg: number;
  ratePerKg: number;
  amount: number;
};

export type CostSummary = {
  lines: CostLineItem[];
  subtotal: number;
  gstAmount: number;
  total: number;
};

export function recalculateProfileRates(
  settings: ProfileRateSettings,
): ProfileRateSettings {
  return {
    ...settings,
    profiles: settings.profiles.map((profile) => {
      const standardBarLengthMm =
        profile.standardBarLengthMm > 0 ? profile.standardBarLengthMm : 5800;
      const barLengthFt = round2(standardBarLengthMm / 304.8);
      const weightKgPerBar = round2(profile.weightPerFt * barLengthFt);
      return {
        ...profile,
        standardBarLengthMm,
        barLengthFt,
        weightKgPerBar,
        ratePerKg: settings.marketRatePerKg,
        ratePerFt: round2(profile.weightPerFt * settings.marketRatePerKg),
      };
    }),
  };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
