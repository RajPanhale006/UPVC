import type { LucideIcon } from "lucide-react";

import type { DocumentType } from "@/lib/documents";
import type { JobStatus, UserRole } from "@/lib/jobs";

export type ModuleMenuId =
  | "summary"
  | "cutting"
  | "workshop-cost"
  | "quotation"
  | "jobs"
  | "profiles"
  | "documents"
  | "settings";

export type ModuleNavParams = {
  moduleSection?: string;
  documentFilter?: DocumentType | "all" | "final" | "archived";
  jobStatusFilter?: JobStatus | "all" | "active" | "archived" | "search";
  quotationSubTab?: "quotation" | "premium-proposal";
  productKind?: "window" | "door";
  jobSection?: "overview" | "products" | "documents" | "activity";
};

export type ModuleActionTarget = {
  tab: string;
  params?: ModuleNavParams;
};

export type ModuleMenuAction = {
  id: string;
  title: string;
  helper: string;
  icon: LucideIcon;
  iconRing: string;
  iconColor: string;
  cardBg: string;
  cardBorder: string;
  target: ModuleActionTarget;
  recommended?: boolean;
  recommendedLabel?: string;
  spanFull?: boolean;
  visibleFor?: (role: UserRole) => boolean;
};

export type ModuleMenuDefinition = {
  id: ModuleMenuId;
  title: string;
  subtitle: string;
  actions: ModuleMenuAction[];
};
