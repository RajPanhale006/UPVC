import type { TermDocumentType, TermGroup, TermProductType, TermRecord } from "./types";

const STORAGE_KEY = "upvc-workshop-terms";

export const DEFAULT_TERMS: TermRecord[] = [
  {
    id: "std-validity",
    group: "standard-quotation",
    title: "Quotation Validity",
    content: "Quotation valid for 15 days from the date of issue.",
    active: true,
    sortOrder: 1,
    documentTypes: ["standard-quotation"],
    productTypes: ["window", "door", "all"],
    defaultInclude: true,
  },
  {
    id: "std-payment",
    group: "payment",
    title: "Payment Terms",
    content: "Payment: 50% advance, balance on completion.",
    active: true,
    sortOrder: 2,
    documentTypes: ["standard-quotation", "premium-proposal"],
    productTypes: ["all"],
    defaultInclude: true,
  },
  {
    id: "std-gst",
    group: "standard-quotation",
    title: "GST",
    content: "GST as applicable shall be charged extra as per prevailing tax laws.",
    active: true,
    sortOrder: 3,
    documentTypes: ["standard-quotation"],
    productTypes: ["all"],
    defaultInclude: true,
  },
  {
    id: "install-scope",
    group: "installation",
    title: "Installation Scope",
    content: "Installation includes fixing of supplied windows/doors only.",
    active: true,
    sortOrder: 1,
    documentTypes: ["standard-quotation", "premium-proposal"],
    productTypes: ["all"],
    defaultInclude: false,
  },
  {
    id: "warranty-profile",
    group: "warranty",
    title: "Profile Warranty",
    content: "UPVC profile warranty as per manufacturer terms.",
    active: true,
    sortOrder: 1,
    documentTypes: ["premium-proposal"],
    productTypes: ["window", "door"],
    defaultInclude: true,
  },
  {
    id: "civil-exclusion",
    group: "standard-quotation",
    title: "Civil Work Exclusion",
    content: "Civil work, plastering, and masonry are excluded unless specified.",
    active: true,
    sortOrder: 10,
    documentTypes: ["standard-quotation", "premium-proposal"],
    productTypes: ["all"],
    defaultInclude: false,
  },
  {
    id: "electrical-exclusion",
    group: "standard-quotation",
    title: "Electrical Work Exclusion",
    content: "Electrical work and wiring are excluded from this quotation.",
    active: true,
    sortOrder: 11,
    documentTypes: ["standard-quotation", "premium-proposal"],
    productTypes: ["all"],
    defaultInclude: false,
  },
  {
    id: "colour-variation",
    group: "standard-quotation",
    title: "Colour Variation",
    content: "Minor colour variation may occur between batch and sample.",
    active: true,
    sortOrder: 12,
    documentTypes: ["standard-quotation", "premium-proposal"],
    productTypes: ["all"],
    defaultInclude: false,
  },
  {
    id: "door-specific",
    group: "door-specific",
    title: "Door Hardware",
    content: "Door hardware as specified; additional locks/ch handles charged extra.",
    active: true,
    sortOrder: 1,
    documentTypes: ["standard-quotation"],
    productTypes: ["door"],
    defaultInclude: false,
  },
  {
    id: "window-specific",
    group: "window-specific",
    title: "Window Mesh",
    content: "Mesh/net as specified; removable mesh charged separately if not included.",
    active: true,
    sortOrder: 1,
    documentTypes: ["standard-quotation"],
    productTypes: ["window"],
    defaultInclude: false,
  },
];

export const TERM_GROUP_LABELS: Record<TermGroup, string> = {
  "standard-quotation": "Standard Quotation Terms",
  "premium-proposal": "Premium Proposal Terms",
  installation: "Installation Terms",
  warranty: "Warranty Terms",
  payment: "Payment Terms",
  "door-specific": "Door-Specific Terms",
  "window-specific": "Window-Specific Terms",
};

export function loadTerms(): TermRecord[] {
  if (typeof window === "undefined") return DEFAULT_TERMS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_TERMS;
    const parsed = JSON.parse(raw) as TermRecord[];
    return parsed.length > 0 ? parsed : DEFAULT_TERMS;
  } catch {
    return DEFAULT_TERMS;
  }
}

export function saveTerms(terms: TermRecord[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(terms));
}

export function getActiveTermsForDocument(
  documentType: TermDocumentType,
  productType: TermProductType = "all",
  overrides?: string[],
): string[] {
  const terms = loadTerms()
    .filter(
      (t) =>
        t.active &&
        t.documentTypes.includes(documentType) &&
        (t.productTypes.includes("all") || t.productTypes.includes(productType)) &&
        t.defaultInclude,
    )
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const lines = terms.map((t) => t.content);
  if (overrides && overrides.length > 0) {
    return overrides;
  }
  return lines;
}

export function resetTermsToDefaults(): TermRecord[] {
  saveTerms(DEFAULT_TERMS);
  return DEFAULT_TERMS;
}
