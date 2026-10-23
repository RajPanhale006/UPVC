import { getCurrentUserName, getCurrentUserRole } from "@/lib/jobs/permissions";
import { feetAndInchesToMm } from "@/lib/units";

import type { AssistantAuditEntry, AssistantCommand } from "./types";

const AUDIT_KEY = "upvc-assistant-audit-log";
const MAX_ENTRIES = 200;

function createId(): string {
  return `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function loadAssistantAuditLog(): AssistantAuditEntry[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(AUDIT_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as AssistantAuditEntry[];
  } catch {
    return [];
  }
}

export function appendAssistantAuditEntry(
  partial: Omit<AssistantAuditEntry, "id" | "user" | "role" | "timestamp">,
): AssistantAuditEntry {
  const entry: AssistantAuditEntry = {
    id: createId(),
    user: getCurrentUserName(),
    role: getCurrentUserRole(),
    timestamp: new Date().toISOString(),
    ...partial,
  };

  if (typeof window === "undefined") return entry;

  const log = loadAssistantAuditLog();
  log.unshift(entry);
  window.localStorage.setItem(AUDIT_KEY, JSON.stringify(log.slice(0, MAX_ENTRIES)));
  return entry;
}

export function auditFromCommand(
  command: AssistantCommand,
  actionExecuted: string,
  options: {
    success: boolean;
    jobId?: string;
    productId?: string;
    voiceTranscript?: string;
    confirmationStatus?: AssistantAuditEntry["confirmationStatus"];
    error?: string;
  },
): AssistantAuditEntry {
  return appendAssistantAuditEntry({
    commandText: command.rawText ?? "",
    voiceTranscript: options.voiceTranscript,
    parsedIntent: command.intent,
    actionExecuted,
    jobId: options.jobId,
    productId: options.productId,
    confirmationStatus: options.confirmationStatus ?? "none",
    success: options.success,
    error: options.error,
  });
}

/** Parse dimensions like "1600 by 1200", "5 feet by 4 feet", "1600x1200 mm" */
export function parseDimensionsFromText(text: string): AssistantCommand["measurements"] | null {
  const normalized = text.toLowerCase().replace(/×/g, "x").replace(/by/gi, "x");

  const mmMatch = normalized.match(
    /(\d+(?:\.\d+)?)\s*(?:mm|millimetre|millimeter|millimetres|millimeters)?\s*[x×]\s*(\d+(?:\.\d+)?)\s*(?:mm|millimetre|millimeter|millimetres|millimeters)?/,
  );
  if (mmMatch) {
    return {
      width: Number(mmMatch[1]),
      height: Number(mmMatch[2]),
      unit: "mm",
    };
  }

  const feetMatch = normalized.match(
    /(\d+(?:\.\d+)?)\s*(?:feet|foot|ft)\s*[x×]?\s*(?:by\s*)?(\d+(?:\.\d+)?)\s*(?:feet|foot|ft)/,
  );
  if (feetMatch) {
    const widthMm = feetAndInchesToMm(Number(feetMatch[1]), 0);
    const heightMm = feetAndInchesToMm(Number(feetMatch[2]), 0);
    return { width: widthMm, height: heightMm, unit: "feet-inches" };
  }

  const barePair = normalized.match(/\b(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\b/);
  if (barePair) {
    return {
      width: Number(barePair[1]),
      height: Number(barePair[2]),
      unit: "mm",
    };
  }

  const bareMatch = normalized.match(/(\d+(?:\.\d+)?)\s*[x×*]\s*(\d+(?:\.\d+)?)/);
  if (bareMatch) {
    return {
      width: Number(bareMatch[1]),
      height: Number(bareMatch[2]),
      unit: "mm",
    };
  }

  return null;
}

export function parseQuantityFromText(text: string): number | null {
  const match = text.toLowerCase().match(/(?:quantity|qty)\s*(?:is|=|:)?\s*(\d+)/);
  if (match) return Number(match[1]);
  const makeMatch = text.toLowerCase().match(/make\s+(?:it\s+)?(\d+)\s+(?:window|door|product)/);
  if (makeMatch) return Number(makeMatch[1]);
  return null;
}
