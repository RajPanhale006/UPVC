import type { TrackSystemId } from "@/lib/cutting/types";
import { mmToFeetInches } from "@/lib/units";

import { parseDimensionsFromText, parseQuantityFromText } from "./audit";
import type { AssistantCommand, AssistantProductType } from "./types";

function normalize(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, " ");
}

function detectProductType(text: string): AssistantProductType | undefined {
  if (/\bdouble\s+door\b/.test(text)) return "double-door";
  if (/\bsingle\s+door\b/.test(text)) return "single-door";
  if (/\bdoor\b/.test(text) && !/\bwindow\b/.test(text)) return "single-door";
  if (/\bwindow\b/.test(text)) return "window";
  return undefined;
}

function detectTrack(text: string): TrackSystemId | null {
  if (/\b2\.5\s*track\b/.test(text) || /\btwo\s+and\s+a\s+half\s+track\b/.test(text)) {
    return "2.5-track-t60";
  }
  if (/\b3\s*track\b/.test(text) || /\bthree\s+track\b/.test(text)) {
    return "3-track-t109";
  }
  if (/\b2\s*track\b/.test(text) || /\btwo\s+track\b/.test(text)) {
    return "2-track-t60";
  }
  return null;
}

function detectGlassCount(text: string): number | null {
  const match = text.match(/(\d+)\s*glass/);
  if (match) return Number(match[1]);
  if (/\bthree\s+glass\b/.test(text)) return 3;
  if (/\btwo\s+glass\b/.test(text)) return 2;
  return null;
}

function detectMesh(text: string): boolean | null {
  if (/\b(no\s+mesh|without\s+mesh)\b/.test(text)) return false;
  if (/\b(mesh|jaali|net\s+panel)\b/.test(text)) return true;
  return null;
}

function detectOpeningSide(text: string): "left" | "right" | null {
  if (/\bright[\s-]?opening\b/.test(text) || /\bopen(?:s|ing)?\s+right\b/.test(text)) {
    return "right";
  }
  if (/\bleft[\s-]?opening\b/.test(text) || /\bopen(?:s|ing)?\s+left\b/.test(text)) {
    return "left";
  }
  return null;
}

function detectOpeningDirection(text: string): "inward" | "outward" | null {
  if (/\boutward\b/.test(text)) return "outward";
  if (/\binward\b/.test(text)) return "inward";
  return null;
}

function detectModule(text: string): string | null {
  const map: [RegExp, string][] = [
    [/\b(documents?|open\s+documents?)\b/, "documents"],
    [/\b(workshop\s+cost|workshop-cost)\b/, "workshop-cost"],
    [/\b(cutting\s+sheet|cutting\s+sizes?|labour\s+cutting)\b/, "cutting-sheet"],
    [/\b(active\s+job|open\s+job|job\s+details?)\b/, "job"],
    [/\b(home|go\s+home|dashboard)\b/, "home"],
    [/\b(quotation|quote)\b/, "quotation"],
    [/\b(smart\s+estimation|estimation\s+center)\b/, "smart-estimation"],
    [/\b(profiles?|rates?)\b/, "profiles"],
  ];
  for (const [pattern, module] of map) {
    if (pattern.test(text)) return module;
  }
  return null;
}

function detectDocumentType(text: string): string | null {
  if (/\b(labour|labor)\s+(cutting\s+)?pdf\b/.test(text) || /\bgenerate\s+labour\b/.test(text)) {
    return "labour-pdf";
  }
  if (/\bworkshop\s+cost\s+pdf\b/.test(text)) return "workshop-pdf";
  if (/\bquotation\s+(pdf|preview)\b/.test(text) || /\bpreview\s+quotation\b/.test(text)) {
    return "quotation-preview";
  }
  return null;
}

function detectResultQuery(text: string): string | null {
  if (/\bworkshop\s+cost\b/.test(text)) return "workshop-cost";
  if (/\bcustomer\s+rate\b/.test(text) || /\brate\s+per\s+square\s+foot\b/.test(text)) {
    return "customer-rate";
  }
  if (/\bsuggested\s+customer\s+base\s+price\b/.test(text)) return "customer-base-price";
  if (/\bprofile\s+weight\b/.test(text)) return "profile-weight";
  if (/\bprofile\s+running\s+feet\b/.test(text)) return "profile-running-feet";
  if (/\bglass\s+size\b/.test(text)) return "glass-size";
  if (/\bcutting\s+sizes?\b/.test(text)) return "cutting-sizes";
  if (/\bhardware\s+cost\b/.test(text)) return "hardware-cost";
  if (/\bmargin\b/.test(text)) return "margin";
  if (/\bmissing\s+hardware\s+rates?\b/.test(text)) return "missing-hardware-rates";
  if (/\bwhich\s+hardware\b/.test(text)) return "hardware-list";
  return null;
}

function buildConfiguration(text: string): Record<string, unknown> {
  const config: Record<string, unknown> = {};
  const track = detectTrack(text);
  if (track) config.trackSystemId = track;
  const glass = detectGlassCount(text);
  if (glass != null) config.glassPanelQty = glass;
  const mesh = detectMesh(text);
  if (mesh != null) config.hasMesh = mesh;
  const side = detectOpeningSide(text);
  if (side) config.openingSide = side;
  const direction = detectOpeningDirection(text);
  if (direction) config.openingDirection = direction;
  if (/\bwhite\s+profile\b/.test(text)) config.profileColour = "white";
  if (/\bclear\s+glass\b/.test(text)) config.glassType = "clear";
  return config;
}

function widthFromText(text: string): number | null {
  const match = text.match(/width\s*(?:is|=|:)?\s*(\d+(?:\.\d+)?)\s*(?:mm|millimetre|millimeter)?/);
  return match ? Number(match[1]) : null;
}

function heightFromText(text: string): number | null {
  const match = text.match(/height\s*(?:is|=|:)?\s*(\d+(?:\.\d+)?)\s*(?:mm|millimetre|millimeter)?/);
  return match ? Number(match[1]) : null;
}

/** Deterministic local parser — works offline for common commands. */
export function parseAssistantCommandLocal(text: string): AssistantCommand {
  const raw = text.trim();
  const t = normalize(raw);

  if (!raw) {
    return { intent: "unknown", requiresConfirmation: false, confidence: 0, rawText: raw };
  }

  const productType = detectProductType(t);

  if (
    /\b(create|add|new|start)\b/.test(t) &&
    (productType || /\bwindow\b|\bdoor\b/.test(t))
  ) {
    const dims = parseDimensionsFromText(t);
    const qty = parseQuantityFromText(t);
    return {
      intent: "create-product",
      productType: productType ?? "window",
      measurements: dims
        ? { ...dims, quantity: qty ?? undefined }
        : qty
          ? { quantity: qty }
          : undefined,
      configuration: buildConfiguration(t),
      requiresConfirmation: false,
      confidence: dims ? 0.92 : 0.75,
      rawText: raw,
    };
  }

  const dims = parseDimensionsFromText(t);
  const widthOnly = widthFromText(t);
  const heightOnly = heightFromText(t);
  const qty = parseQuantityFromText(t);
  const config = buildConfiguration(t);

  if (dims || widthOnly != null || heightOnly != null || qty != null || Object.keys(config).length) {
    const measurements: NonNullable<AssistantCommand["measurements"]> = {};
    if (dims?.width != null) measurements.width = dims.width;
    if (dims?.height != null) measurements.height = dims.height;
    if (dims?.unit) measurements.unit = dims.unit;
    if (widthOnly != null) measurements.width = widthOnly;
    if (heightOnly != null) measurements.height = heightOnly;
    if (qty != null) measurements.quantity = qty;

    const hasConfig = Object.keys(config).length > 0;
    return {
      intent: hasConfig && !dims && widthOnly == null && heightOnly == null
        ? "update-configuration"
        : "update-measurement",
      productType,
      measurements: Object.keys(measurements).length ? measurements : undefined,
      configuration: hasConfig ? config : undefined,
      requiresConfirmation: false,
      confidence: dims ? 0.88 : 0.72,
      rawText: raw,
    };
  }

  if (
    /\b(calculate|recalculate|run\s+calculation|compute)\b/.test(t) ||
    (/\bcutting\s+sizes?\b/.test(t) && /\b(show|calculate|get)\b/.test(t))
  ) {
    return {
      intent: "calculate-estimation",
      requiresConfirmation: false,
      confidence: 0.9,
      rawText: raw,
    };
  }

  const resultQuery = detectResultQuery(t);
  if (resultQuery && /\b(what|show|tell|how much|display|get)\b/.test(t)) {
    return {
      intent: "get-result",
      resultQuery,
      requiresConfirmation: false,
      confidence: 0.85,
      rawText: raw,
    };
  }

  if (/\b(save|add)\b.*\b(job|product)\b/.test(t) || /\bsave\s+this\s+product\b/.test(t)) {
    return {
      intent: "save-product",
      requiresConfirmation: true,
      confidence: 0.88,
      rawText: raw,
    };
  }

  if (/\badd\b.*\bquotation\b/.test(t)) {
    return {
      intent: "add-to-quotation",
      requiresConfirmation: true,
      confidence: 0.88,
      rawText: raw,
    };
  }

  const docType = detectDocumentType(t);
  if (docType || /\b(generate|export|download|preview)\b.*\bpdf\b/.test(t)) {
    return {
      intent: "generate-document",
      documentType: docType ?? "labour-pdf",
      requiresConfirmation: true,
      confidence: 0.85,
      rawText: raw,
    };
  }

  const module = detectModule(t);
  if (module && /\b(open|go\s+to|navigate|show)\b/.test(t)) {
    return {
      intent: "open-module",
      targetModule: module,
      requiresConfirmation: false,
      confidence: 0.82,
      rawText: raw,
    };
  }

  if (/\bstart\s+new\s+product\b/.test(t) || /\bduplicate\b/.test(t)) {
    return {
      intent: "save-product",
      configuration: { action: t.includes("duplicate") ? "duplicate" : "new-product" },
      requiresConfirmation: true,
      confidence: 0.7,
      rawText: raw,
    };
  }

  return {
    intent: "unknown",
    requiresConfirmation: false,
    confidence: 0.2,
    rawText: raw,
  };
}

export function formatDimensionsForSpeech(widthMm: number, heightMm: number): string {
  const w = mmToFeetInches(widthMm);
  const h = mmToFeetInches(heightMm);
  return `${widthMm} millimetres by ${heightMm} millimetres, or ${w.feet} feet ${w.inches} inches by ${h.feet} feet ${h.inches} inches`;
}

export function formatCurrencyForSpeech(amount: number): string {
  return `₹${amount.toFixed(2)}`;
}
