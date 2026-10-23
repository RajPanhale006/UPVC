import { getDefaultPremiumProposal } from "./defaults";
import type { PremiumProposal } from "./types";

const STORAGE_KEY = "upvc-workshop-premium-proposal";

export function loadPremiumProposal(): PremiumProposal {
  if (typeof window === "undefined") {
    return getDefaultPremiumProposal();
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultPremiumProposal();
    const parsed = JSON.parse(raw) as Partial<PremiumProposal>;
    const defaults = getDefaultPremiumProposal();
    return {
      ...defaults,
      ...parsed,
      scopeItems: parsed.scopeItems?.length ? parsed.scopeItems : defaults.scopeItems,
      benefits: parsed.benefits?.length ? parsed.benefits : defaults.benefits,
      paymentSchedule: parsed.paymentSchedule?.length
        ? parsed.paymentSchedule
        : defaults.paymentSchedule,
      timeline: parsed.timeline?.length ? parsed.timeline : defaults.timeline,
      prerequisites: parsed.prerequisites?.length
        ? parsed.prerequisites
        : defaults.prerequisites,
      portfolioProjects: parsed.portfolioProjects?.length
        ? parsed.portfolioProjects
        : defaults.portfolioProjects,
      media: parsed.media ?? [],
      windowDetails: parsed.windowDetails ?? {},
      selectedPortfolioIds: parsed.selectedPortfolioIds ?? [],
    };
  } catch {
    return getDefaultPremiumProposal();
  }
}

export function savePremiumProposal(proposal: PremiumProposal): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ ...proposal, updatedAt: new Date().toISOString() }),
  );
}

export function resetPremiumProposal(): PremiumProposal {
  const defaults = getDefaultPremiumProposal();
  savePremiumProposal(defaults);
  return defaults;
}

export function duplicatePremiumProposal(source: PremiumProposal): PremiumProposal {
  const copy = {
    ...source,
    proposalNumber: getDefaultPremiumProposal().proposalNumber,
    status: "draft" as const,
    updatedAt: new Date().toISOString(),
  };
  savePremiumProposal(copy);
  return copy;
}
