import type { QuotationWindowRow } from "@/lib/quotation/types";

export type ProposalThemeId =
  | "royal-blue-gold"
  | "navy-orange"
  | "white-corporate"
  | "dark-premium";

export type ProposalStatus =
  | "draft"
  | "sent"
  | "viewed"
  | "accepted"
  | "rejected"
  | "expired";

export type ProposalExportMode = "full" | "compact";

export type ScopeStatus = "included" | "excluded" | "client";

export type PrerequisiteStatus = "applicable" | "not-applicable" | "client-confirmed";

export type PaymentScheduleKind = "percent" | "fixed";

export type ProposalMediaKind =
  | "cover"
  | "site"
  | "design"
  | "inspiration"
  | "opening"
  | "team"
  | "portfolio"
  | "before-after";

export type ProposalMediaItem = {
  id: string;
  kind: ProposalMediaKind;
  dataUrl: string;
  caption: string;
  fileName: string;
};

export type ScopeItem = {
  id: string;
  label: string;
  status: ScopeStatus;
};

export type BenefitItem = {
  id: string;
  label: string;
  description: string;
  selected: boolean;
};

export type PaymentScheduleItem = {
  id: string;
  label: string;
  kind: PaymentScheduleKind;
  value: number;
};

export type TimelineStage = {
  id: string;
  label: string;
  days: number;
  enabled: boolean;
};

export type PrerequisiteItem = {
  id: string;
  label: string;
  status: PrerequisiteStatus;
};

export type PortfolioProject = {
  id: string;
  title: string;
  clientOrSite: string;
  location: string;
  windowCount: string;
  windowType: string;
  completionDate: string;
  description: string;
  photoDataUrl?: string;
};

export type WindowProposalDetail = {
  code: string;
  roomOrLocation: string;
  profileSystem: string;
  profileBrand: string;
  profileColour: string;
  glassType: string;
  glassThickness: string;
  hardware: string;
  handleType: string;
  lockType: string;
  meshDetails: string;
  accessories: string;
  sashConfiguration: string;
  glassSashCount: string;
  netSashCount: string;
  notes: string;
};

export type PremiumProposal = {
  theme: ProposalThemeId;
  status: ProposalStatus;
  exportMode: ProposalExportMode;
  proposalNumber: string;
  proposalDate: string;
  validUntil: string;
  preparedBy: string;
  projectName: string;
  projectLocation: string;
  introduction: string;
  requirementSummary: string;
  understandingText: string;
  windowCategory: string;
  profileBrandSummary: string;
  glassSpecificationSummary: string;
  installationTimeline: string;
  scopeItems: ScopeItem[];
  benefits: BenefitItem[];
  paymentSchedule: PaymentScheduleItem[];
  timeline: TimelineStage[];
  customTerms: string;
  useQuotationTerms: boolean;
  prerequisites: PrerequisiteItem[];
  profileWarranty: string;
  hardwareWarranty: string;
  glassWarranty: string;
  installationWarranty: string;
  serviceSupportPolicy: string;
  warrantyExclusions: string;
  maintenanceInstructions: string;
  portfolioProjects: PortfolioProject[];
  selectedPortfolioIds: string[];
  media: ProposalMediaItem[];
  windowDetails: Record<string, WindowProposalDetail>;
  showItemPrices: boolean;
  showAverageRate: boolean;
  showPortfolio: boolean;
  showWarranty: boolean;
  showBenefits: boolean;
  showScope: boolean;
  showTimeline: boolean;
  showPrerequisites: boolean;
  advanceAmount: number;
  materialAmountLabel: string;
  installationAmount: number;
  acceptancePlace: string;
  updatedAt: string;
};

export type PremiumProposalInput = {
  proposal: PremiumProposal;
  quotationWindows: QuotationWindowRow[];
};
