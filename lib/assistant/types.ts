import type { PartnerProductType } from "@/lib/partner-workspace";

export type AssistantIntent =
  | "create-product"
  | "update-measurement"
  | "update-configuration"
  | "calculate-estimation"
  | "get-result"
  | "save-product"
  | "open-module"
  | "generate-document"
  | "add-to-quotation"
  | "unknown";

export type AssistantProductType = PartnerProductType;

export type AssistantCommand = {
  intent: AssistantIntent;
  productType?: AssistantProductType;
  measurements?: {
    width?: number;
    height?: number;
    unit?: "mm" | "feet-inches";
    quantity?: number;
  };
  configuration?: Record<string, unknown>;
  targetModule?: string;
  documentType?: string;
  resultQuery?: string;
  requiresConfirmation: boolean;
  confidence: number;
  rawText?: string;
};

export type AssistantExecutionStatus = "success" | "error" | "pending-confirmation" | "denied";

export type AssistantExecutionResult = {
  status: AssistantExecutionStatus;
  message: string;
  card?: AssistantResultCard;
  command?: AssistantCommand;
};

export type AssistantResultCard = {
  title: string;
  lines: string[];
  actions?: { id: string; label: string }[];
};

export type AssistantMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  command?: AssistantCommand;
  card?: AssistantResultCard;
  timestamp: string;
};

export type VoiceState =
  | "ready"
  | "listening"
  | "processing"
  | "permission-denied"
  | "unavailable"
  | "could-not-understand";

export type AssistantAuditEntry = {
  id: string;
  user: string;
  role: string;
  commandText: string;
  voiceTranscript?: string;
  parsedIntent: AssistantIntent;
  actionExecuted: string;
  jobId?: string;
  productId?: string;
  timestamp: string;
  confirmationStatus: "none" | "confirmed" | "rejected" | "required";
  success: boolean;
  error?: string;
};
