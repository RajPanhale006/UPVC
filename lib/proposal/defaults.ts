import type {
  BenefitItem,
  PaymentScheduleItem,
  PortfolioProject,
  PremiumProposal,
  PrerequisiteItem,
  ProposalThemeId,
  ScopeItem,
  TimelineStage,
  WindowProposalDetail,
} from "./types";

export const PROPOSAL_THEME_LABELS: Record<ProposalThemeId, string> = {
  "royal-blue-gold": "Royal Blue & Gold",
  "navy-orange": "Navy Blue & Orange",
  "white-corporate": "White & Corporate Blue",
  "dark-premium": "Dark Premium Black & Gold",
};

export const DEFAULT_INTRODUCTION =
  "Thank you for considering Shivshakti Enterprises for your window requirements. We are pleased to present a customised proposal designed to support excellent aesthetics, durability, comfort and long-term performance depending on the selected profile, glass and site conditions.";

export const DEFAULT_UNDERSTANDING =
  "Based on our discussion and the sizes shared, we propose UPVC sliding windows suitable for the stated openings. Final sizes will be confirmed after site measurement.";

export const DEFAULT_CUSTOM_TERMS = `1. Quotation validity as mentioned on the cover page.
2. Payment terms as per the payment schedule in this proposal.
3. Sizes are based on information provided. Variation beyond agreed tolerance may affect rates on a pro-rata basis after final measurement.
4. Material unloading and safe storage at site shall be arranged as per agreed scope.
5. Installation access, water and electricity (if required) shall be available as per prerequisites.
6. Civil, electrical and scaffolding work outside agreed scope shall be on client responsibility unless marked included.
7. Cleaning of surrounding civil work after installation may be chargeable if not included in scope.
8. Service visits after handover may be chargeable unless covered under agreed warranty/support terms.
9. All disputes shall be subject to local jurisdiction only.`;

export const DEFAULT_SCOPE_ITEMS: Omit<ScopeItem, "status">[] = [
  { id: "site-measurement", label: "Site measurement" },
  { id: "manufacturing", label: "Window manufacturing" },
  { id: "profile-cutting", label: "Profile cutting" },
  { id: "welding", label: "Welding and fabrication" },
  { id: "glass-fitting", label: "Glass fitting" },
  { id: "hardware", label: "Hardware installation" },
  { id: "transportation", label: "Transportation" },
  { id: "loading", label: "Loading" },
  { id: "unloading", label: "Unloading" },
  { id: "frame-installation", label: "Frame installation" },
  { id: "alignment", label: "Alignment and levelling" },
  { id: "sealant", label: "Sealant application" },
  { id: "finishing", label: "Finishing" },
  { id: "testing", label: "Operational testing" },
  { id: "cleanup", label: "Site cleanup" },
  { id: "removal", label: "Existing window removal" },
  { id: "scaffolding", label: "Scaffolding" },
  { id: "civil", label: "Civil work" },
  { id: "electrical", label: "Electrical work" },
];

export const DEFAULT_BENEFITS: Omit<BenefitItem, "selected">[] = [
  {
    id: "weather",
    label: "Weather resistance",
    description:
      "Designed to support improved protection from rain and weather exposure depending on profile and installation quality.",
  },
  {
    id: "sound",
    label: "Sound reduction",
    description:
      "Selected glazing and profile combinations can help reduce external noise based on site conditions.",
  },
  {
    id: "dust",
    label: "Dust resistance",
    description:
      "Proper sealing and mesh options can help limit dust ingress when specified and installed correctly.",
  },
  {
    id: "maintenance",
    label: "Low maintenance",
    description:
      "UPVC surfaces generally require simple periodic cleaning under normal use.",
  },
  {
    id: "thermal",
    label: "Thermal comfort",
    description:
      "Profile and glass selection can support better indoor comfort depending on orientation and specification.",
  },
  {
    id: "ventilation",
    label: "Ventilation options",
    description:
      "Sliding configurations allow flexible ventilation with mesh options where applicable.",
  },
  {
    id: "durability",
    label: "Durable construction",
    description:
      "Factory-fabricated profiles and hardware are selected for reliable daily operation.",
  },
  {
    id: "sliding",
    label: "Smooth sliding",
    description:
      "Quality rollers and tracks support smooth operation when maintained as recommended.",
  },
  {
    id: "corrosion",
    label: "Corrosion resistance",
    description:
      "UPVC and specified hardware resist routine corrosion better than many traditional materials.",
  },
  {
    id: "appearance",
    label: "Elegant appearance",
    description:
      "Clean sight lines and modern profiles enhance the building facade and interior finish.",
  },
  {
    id: "service-life",
    label: "Long service life",
    description:
      "Designed for extended service life with appropriate use, cleaning and periodic adjustment.",
  },
  {
    id: "custom",
    label: "Customised design",
    description:
      "Sizes, track type and glazing can be tailored to project requirements within manufacturing limits.",
  },
  {
    id: "installation",
    label: "Professional installation",
    description:
      "Installation by experienced fabricators following agreed scope and site prerequisites.",
  },
  {
    id: "support",
    label: "After-sales support",
    description:
      "Support visits and service terms as stated in warranty and support sections of this proposal.",
  },
];

export const DEFAULT_TIMELINE: Omit<TimelineStage, "enabled">[] = [
  { id: "order", label: "Order confirmation", days: 1 },
  { id: "advance", label: "Advance payment", days: 2 },
  { id: "measurement", label: "Final site measurement", days: 3 },
  { id: "procurement", label: "Material procurement", days: 7 },
  { id: "production", label: "Production", days: 14 },
  { id: "qc", label: "Quality inspection", days: 2 },
  { id: "dispatch", label: "Dispatch", days: 2 },
  { id: "installation", label: "Installation", days: 5 },
  { id: "handover", label: "Handover", days: 1 },
];

export const DEFAULT_PREREQUISITES: Omit<PrerequisiteItem, "status">[] = [
  { id: "openings-ready", label: "Openings must be ready" },
  { id: "plastering", label: "Plastering must be completed" },
  { id: "sill-jamb", label: "Sill and jamb surfaces must be smooth" },
  { id: "dimensions", label: "Opening dimensions must be confirmed" },
  { id: "level-base", label: "Window base must be level" },
  { id: "vertical-sides", label: "Side surfaces must be vertically aligned" },
  { id: "flooring", label: "Flooring level must be finalised where applicable" },
  { id: "grills", label: "Grills must be coordinated before installation" },
  { id: "electrical", label: "Electrical wiring must not block the opening" },
  { id: "scaffolding", label: "Scaffolding must not obstruct the window area" },
  { id: "access", label: "Safe installation access must be available" },
  { id: "storage", label: "Material storage space must be provided" },
  { id: "utilities", label: "Water and electricity must be available, if required" },
  {
    id: "paint",
    label: "Installation should preferably happen before the final paint coat",
  },
];

export const DEFAULT_PAYMENT_SCHEDULE: Omit<PaymentScheduleItem, "id">[] = [
  { label: "Booking advance", kind: "percent", value: 50 },
  { label: "Before production", kind: "percent", value: 30 },
  { label: "Before dispatch", kind: "percent", value: 15 },
  { label: "After installation / final balance", kind: "percent", value: 5 },
];

export const DEFAULT_PORTFOLIO: PortfolioProject[] = [
  {
    id: "sample-jindal",
    title: "UPVC Window Installation – Industrial Project",
    clientOrSite: "Industrial Client, MIDC",
    location: "Nashik",
    windowCount: "Multiple openings",
    windowType: "3 Track UPVC",
    completionDate: "",
    description:
      "Supply and installation of UPVC sliding windows for industrial premises with coordinated site measurement and phased installation.",
  },
];

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDaysIso(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function buildProposalNumber(): string {
  const now = new Date();
  const ymd =
    String(now.getFullYear()) +
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0");
  const suffix = String(Math.floor(Math.random() * 900) + 100);
  return `${ymd}-P-${suffix}`;
}

export function getDefaultWindowDetail(): WindowProposalDetail {
  return {
    code: "",
    roomOrLocation: "",
    profileSystem: "UPVC Sliding System",
    profileBrand: "As per quotation specification",
    profileColour: "White",
    glassType: "Clear float glass",
    glassThickness: "5 mm",
    hardware: "Standard sliding hardware",
    handleType: "Touch lock handle",
    lockType: "Sliding lock",
    meshDetails: "As applicable for track type",
    accessories: "Track, interlock and standard accessories",
    sashConfiguration: "",
    glassSashCount: "",
    netSashCount: "",
    notes: "",
  };
}

export function getDefaultPremiumProposal(): PremiumProposal {
  return {
    theme: "navy-orange",
    status: "draft",
    exportMode: "full",
    proposalNumber: buildProposalNumber(),
    proposalDate: todayIsoDate(),
    validUntil: addDaysIso(30),
    preparedBy: "",
    projectName: "",
    projectLocation: "",
    introduction: DEFAULT_INTRODUCTION,
    requirementSummary: "",
    understandingText: DEFAULT_UNDERSTANDING,
    windowCategory: "UPVC Sliding Windows",
    profileBrandSummary: "As per agreed specification",
    glassSpecificationSummary: "Clear glass unless otherwise noted per window",
    installationTimeline: "As per project timeline section",
    scopeItems: DEFAULT_SCOPE_ITEMS.map((item) => ({
      ...item,
      status: item.id === "transportation" || item.id === "unloading" ? "client" : "included",
    })),
    benefits: DEFAULT_BENEFITS.map((item, index) => ({
      ...item,
      selected: index < 8,
    })),
    paymentSchedule: DEFAULT_PAYMENT_SCHEDULE.map((item) => ({
      ...item,
      id: createId("pay"),
    })),
    timeline: DEFAULT_TIMELINE.map((item) => ({ ...item, enabled: true })),
    customTerms: DEFAULT_CUSTOM_TERMS,
    useQuotationTerms: true,
    prerequisites: DEFAULT_PREREQUISITES.map((item) => ({
      ...item,
      status: "applicable",
    })),
    profileWarranty: "",
    hardwareWarranty: "",
    glassWarranty: "",
    installationWarranty: "",
    serviceSupportPolicy:
      "Service support as per agreed warranty terms. Chargeable visits may apply after warranty period.",
    warrantyExclusions:
      "Misuse, improper cleaning, unauthorised modification, civil defects and normal wear are excluded.",
    maintenanceInstructions:
      "Clean tracks periodically, avoid forced operation, and schedule adjustment if sliding becomes stiff.",
    portfolioProjects: DEFAULT_PORTFOLIO,
    selectedPortfolioIds: [],
    media: [],
    windowDetails: {},
    showItemPrices: true,
    showAverageRate: true,
    showPortfolio: false,
    showWarranty: true,
    showBenefits: true,
    showScope: true,
    showTimeline: true,
    showPrerequisites: true,
    advanceAmount: 0,
    materialAmountLabel: "Material amount (from quotation)",
    installationAmount: 0,
    acceptancePlace: "",
    updatedAt: new Date().toISOString(),
  };
}

export const PROPOSAL_STEP_LABELS = [
  "Cover",
  "Overview",
  "Windows",
  "Pricing",
  "Terms",
  "Approval",
  "Preview",
] as const;

export type ProposalStepId = (typeof PROPOSAL_STEP_LABELS)[number];

export const WHATSAPP_MESSAGE_TEMPLATE = `Dear [Customer Name],

Thank you for giving Shivshakti Enterprises the opportunity to submit our proposal.

Please find attached our premium proposal for [Project Name].

The proposal includes the recommended window designs, specifications, scope of work, commercial value and installation terms.

We look forward to working with you.

Regards,
Shivshakti Enterprises`;
