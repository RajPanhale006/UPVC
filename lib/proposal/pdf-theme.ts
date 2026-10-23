import type { ProposalThemeId } from "./types";

export type ProposalPdfTheme = {
  id: ProposalThemeId;
  name: string;
  primary: [number, number, number];
  secondary: [number, number, number];
  accent: [number, number, number];
  gold: [number, number, number];
  background: [number, number, number];
  card: [number, number, number];
  text: [number, number, number];
  muted: [number, number, number];
  white: [number, number, number];
  included: [number, number, number];
  excluded: [number, number, number];
  clientScope: [number, number, number];
};

export const PROPOSAL_PDF_THEMES: Record<ProposalThemeId, ProposalPdfTheme> = {
  "royal-blue-gold": {
    id: "royal-blue-gold",
    name: "Royal Blue & Gold",
    primary: [30, 58, 138],
    secondary: [37, 99, 235],
    accent: [245, 158, 11],
    gold: [217, 169, 56],
    background: [248, 250, 252],
    card: [255, 255, 255],
    text: [15, 23, 42],
    muted: [100, 116, 139],
    white: [255, 255, 255],
    included: [22, 163, 74],
    excluded: [220, 38, 38],
    clientScope: [234, 88, 12],
  },
  "navy-orange": {
    id: "navy-orange",
    name: "Navy Blue & Orange",
    primary: [17, 24, 39],
    secondary: [30, 64, 175],
    accent: [249, 115, 22],
    gold: [251, 191, 36],
    background: [244, 247, 252],
    card: [255, 255, 255],
    text: [15, 23, 42],
    muted: [100, 116, 139],
    white: [255, 255, 255],
    included: [22, 163, 74],
    excluded: [220, 38, 38],
    clientScope: [234, 88, 12],
  },
  "white-corporate": {
    id: "white-corporate",
    name: "White & Corporate Blue",
    primary: [29, 78, 216],
    secondary: [59, 130, 246],
    accent: [14, 165, 233],
    gold: [100, 116, 139],
    background: [255, 255, 255],
    card: [248, 250, 252],
    text: [15, 23, 42],
    muted: [100, 116, 139],
    white: [255, 255, 255],
    included: [22, 163, 74],
    excluded: [220, 38, 38],
    clientScope: [234, 88, 12],
  },
  "dark-premium": {
    id: "dark-premium",
    name: "Dark Premium Black & Gold",
    primary: [15, 15, 20],
    secondary: [38, 38, 45],
    accent: [212, 175, 55],
    gold: [234, 196, 84],
    background: [24, 24, 27],
    card: [39, 39, 42],
    text: [250, 250, 250],
    muted: [161, 161, 170],
    white: [255, 255, 255],
    included: [34, 197, 94],
    excluded: [248, 113, 113],
    clientScope: [251, 146, 60],
  },
};

export const PROPOSAL_PDF_MARGINS = { left: 14, right: 14, top: 14, bottom: 18 };
export const PROPOSAL_PAGE_WIDTH = 210;
export const PROPOSAL_PAGE_HEIGHT = 297;
export const PROPOSAL_CONTENT_WIDTH =
  PROPOSAL_PAGE_WIDTH - PROPOSAL_PDF_MARGINS.left - PROPOSAL_PDF_MARGINS.right;

export function getProposalTheme(themeId: ProposalThemeId): ProposalPdfTheme {
  return PROPOSAL_PDF_THEMES[themeId] ?? PROPOSAL_PDF_THEMES["navy-orange"];
}
