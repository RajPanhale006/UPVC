import { STEEL_PROFILE_CODE } from "@/lib/cutting/bar-optimization/extract-pieces";
import { resolveProfileRateKey } from "@/lib/cutting/bar-optimization/profile-rate-map";

export type ProfileMasterEntry = {
  profileCode: string;
  aliases: string[];
  name: string;
  category: string;
  /** Published Tonish kg/m when known — otherwise derived from Profiles tab. */
  kgPerMetre?: number;
};

/** Known Tonish / supplier catalogue entries — do not invent missing profiles. */
export const TONISH_PROFILE_CATALOG: ProfileMasterEntry[] = [
  {
    profileCode: "T109-600",
    aliases: [],
    name: "3 Track Frame T109-600",
    category: "Frame",
    kgPerMetre: 1.72,
  },
  {
    profileCode: "T88H-460-1",
    aliases: [],
    name: "2+1 Track Frame T88H-460-1",
    category: "Frame",
    kgPerMetre: 1.27,
  },
  {
    profileCode: "T60-431-1",
    aliases: [],
    name: "2 Track Frame T60-431-1",
    category: "Frame",
    kgPerMetre: 1.14,
  },
  {
    profileCode: "T60-051",
    aliases: [],
    name: "66 Window Sash T60-051",
    category: "Glass Sash",
    kgPerMetre: 0.924,
  },
  {
    profileCode: "T88-617",
    aliases: ["T60-052"],
    name: "Screen / Net Sash T88-617",
    category: "Net Sash",
    kgPerMetre: 0.645,
  },
  {
    profileCode: "T88-044",
    aliases: ["T88-0444"],
    name: "GB25 Beading T88-044",
    category: "Beading",
    kgPerMetre: 0.244,
  },
  {
    profileCode: "T60-413",
    aliases: [],
    name: "Interlock T60-413",
    category: "Interlock",
    kgPerMetre: 0.32,
  },
  {
    profileCode: "T60-601",
    aliases: ["P60A-057"],
    name: "Door Sash T60-601",
    category: "Door Sash",
    kgPerMetre: 1.434,
  },
  {
    profileCode: "T60-480",
    aliases: [],
    name: "Door Sash Interlock T60-480",
    category: "Interlock",
    kgPerMetre: 0.32,
  },
  {
    profileCode: "P60A-052",
    aliases: [],
    name: "Casement Frame P60A-052",
    category: "Frame",
    kgPerMetre: 1.034,
  },
  {
    profileCode: "P60I-178",
    aliases: [],
    name: "T Mullion P60I-178",
    category: "Mullion",
    kgPerMetre: 1.067,
  },
  {
    profileCode: STEEL_PROFILE_CODE,
    aliases: [],
    name: "Steel Reinforcement",
    category: "Reinforcement",
  },
];

const catalogByCode = new Map<string, ProfileMasterEntry>();
for (const entry of TONISH_PROFILE_CATALOG) {
  catalogByCode.set(entry.profileCode, entry);
  for (const alias of entry.aliases) {
    catalogByCode.set(alias, entry);
  }
}

export function resolveProfileMasterEntry(profileCode: string): ProfileMasterEntry | null {
  return catalogByCode.get(profileCode) ?? null;
}

export function resolveProfileCategory(profileCode: string): string {
  const entry = resolveProfileMasterEntry(profileCode);
  if (entry) {
    return entry.category;
  }
  const rateKey = resolveProfileRateKey(profileCode);
  switch (rateKey) {
    case "frame-2-track":
    case "frame-2-5-track":
    case "frame-3-track":
    case "casement-frame":
      return "Frame";
    case "sash":
    case "door-sash":
      return "Sash";
    case "screen-sash":
      return "Net Sash";
    case "interlock":
      return "Interlock";
    case "beading":
    case "gb36-beading":
      return "Beading";
    default:
      return profileCode === STEEL_PROFILE_CODE ? "Reinforcement" : "Profile";
  }
}

export function resolveCatalogKgPerMetre(profileCode: string): number | null {
  const entry = resolveProfileMasterEntry(profileCode);
  return entry?.kgPerMetre ?? null;
}

export function resolveProfileDisplayName(profileCode: string, fallback: string): string {
  return resolveProfileMasterEntry(profileCode)?.name ?? fallback;
}
