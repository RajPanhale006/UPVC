export type TermGroup =
  | "standard-quotation"
  | "premium-proposal"
  | "installation"
  | "warranty"
  | "payment"
  | "door-specific"
  | "window-specific";

export type TermDocumentType = "standard-quotation" | "premium-proposal" | "internal-estimation";

export type TermProductType = "window" | "door" | "all";

export type TermRecord = {
  id: string;
  group: TermGroup;
  title: string;
  content: string;
  active: boolean;
  sortOrder: number;
  documentTypes: TermDocumentType[];
  productTypes: TermProductType[];
  defaultInclude: boolean;
};
