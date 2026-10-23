import type { CuttingOptions } from "@/lib/cutting/types";
import type { DoorCuttingOptions } from "@/lib/cutting/door";
import { syncCuttingOptionsForTrack } from "@/lib/cutting";
import { applyTwoGlassOneNetSashConfiguration } from "@/lib/cutting/sash-configuration";
import { applyDoorConfigurationDefaults, createDefaultDoorCuttingOptions } from "@/lib/cutting/door";
import type { EstimationInputs } from "@/lib/estimation";
import { mmToFeetInches } from "@/lib/units";
import {
  applyPartnerProductType,
  type PartnerProductType,
} from "@/lib/partner-workspace";

import { auditFromCommand } from "./audit";
import { parseAssistantCommandLocal } from "./parse-local";
import {
  intentRequiresConfirmation,
  validateCommandPermission,
} from "./permissions";
import type {
  AssistantCommand,
  AssistantExecutionResult,
  AssistantResultCard,
} from "./types";

export type AssistantExecutionContext = {
  jobId?: string;
  productId?: string;
  productType: PartnerProductType;
  estimationInputs: EstimationInputs;
  cuttingOptions: CuttingOptions;
  hasValidResults: boolean;
  isOnline: boolean;
  /** Values from existing calculation engine — never invented by AI. */
  calculated?: {
    workshopTotal?: number;
    suggestedCustomerBasePrice?: number;
    suggestedCustomerRatePerSqFt?: number;
    customerBaseMarginPercent?: number;
    customerBaseMarginAmount?: number;
    totalProfileWeightKg?: number;
    hasMissingHardwareRates?: boolean;
    missingHardwareItems?: string[];
    hardwareItemLabels?: string[];
    widthMm?: number;
    heightMm?: number;
    areaSqft?: number;
  };
  voiceTranscript?: string;
};

export type AssistantExecutionCallbacks = {
  onProductTypeChange: (type: PartnerProductType) => void;
  onEstimationChange: (inputs: EstimationInputs) => void;
  onCuttingOptionsChange: (options: CuttingOptions) => void;
  onCalculate: () => void;
  onSaveProduct: () => Promise<{ ok: boolean; message: string }>;
  onAddToQuotation: () => Promise<{ ok: boolean; message: string }>;
  onGenerateLabourPdf: () => Promise<{ ok: boolean; message: string }>;
  onPreviewLabourPdf: () => Promise<{ ok: boolean; message: string }>;
  onStartNewProduct: () => void;
  onNavigate: (module: string) => void;
};

function applyMeasurements(
  inputs: EstimationInputs,
  measurements: NonNullable<AssistantCommand["measurements"]>,
): EstimationInputs {
  let next = { ...inputs };
  if (measurements.width != null) {
    const { feet, inches } = mmToFeetInches(measurements.width);
    next = { ...next, widthFeet: feet, widthInches: inches };
  }
  if (measurements.height != null) {
    const { feet, inches } = mmToFeetInches(measurements.height);
    next = { ...next, heightFeet: feet, heightInches: inches };
  }
  if (measurements.quantity != null) {
    next = { ...next, numberOfWindows: Math.max(1, measurements.quantity) };
  }
  return next;
}

function applyConfiguration(
  inputs: EstimationInputs,
  cuttingOptions: CuttingOptions,
  productType: PartnerProductType,
  config: Record<string, unknown>,
): { inputs: EstimationInputs; cuttingOptions: CuttingOptions } {
  let nextInputs = { ...inputs };
  let nextCutting = { ...cuttingOptions };

  if (typeof config.trackSystemId === "string") {
    nextInputs = {
      ...nextInputs,
      trackSystemId: config.trackSystemId as EstimationInputs["trackSystemId"],
    };
    nextCutting = syncCuttingOptionsForTrack(nextCutting, nextInputs.trackSystemId);
    if (
      nextInputs.trackSystemId === "2.5-track-t60" &&
      nextCutting.cuttingMethod === "sarik"
    ) {
      nextCutting = applyTwoGlassOneNetSashConfiguration(
        nextCutting,
        nextInputs.trackSystemId,
      );
    }
  }

  if (typeof config.glassPanelQty === "number") {
    nextCutting = {
      ...nextCutting,
      glassPanelQty: config.glassPanelQty,
    };
  }

  if (config.hasMesh === false) {
    nextCutting = {
      ...nextCutting,
      threeTrackSashConfiguration: "three-glass-no-net",
    };
  } else if (config.hasMesh === true) {
    nextCutting = {
      ...nextCutting,
      threeTrackSashConfiguration: "two-glass-one-net",
    };
    if (
      nextInputs.trackSystemId === "2.5-track-t60" &&
      nextCutting.cuttingMethod === "sarik"
    ) {
      nextCutting = applyTwoGlassOneNetSashConfiguration(
        nextCutting,
        nextInputs.trackSystemId,
      );
    }
  }

  if (productType !== "window") {
    const door =
      nextInputs.doorSettings ?? createDefaultDoorCuttingOptions("single");
    let nextDoor: DoorCuttingOptions = { ...door };
    if (config.openingSide === "left" || config.openingSide === "right") {
      nextDoor = { ...nextDoor, openingSide: config.openingSide };
    }
    if (config.openingDirection === "inward" || config.openingDirection === "outward") {
      nextDoor = { ...nextDoor, openingDirection: config.openingDirection };
    }
    nextInputs = { ...nextInputs, doorSettings: nextDoor };
  }

  return { inputs: nextInputs, cuttingOptions: nextCutting };
}

function buildConfirmationPreview(command: AssistantCommand, ctx: AssistantExecutionContext): string {
  const lines: string[] = [];
  if (command.productType) {
    lines.push(
      command.productType === "window"
        ? "Window"
        : command.productType === "single-door"
          ? "Single Door"
          : "Double Door",
    );
  }
  const m = command.measurements;
  if (m?.width != null && m?.height != null) {
    lines.push(`${m.width} × ${m.height} mm`);
  }
  const c = command.configuration ?? {};
  if (c.trackSystemId) lines.push(String(c.trackSystemId).replace(/-/g, " "));
  if (c.glassPanelQty) lines.push(`${c.glassPanelQty} Glass`);
  if (c.hasMesh === true) lines.push("Mesh: Yes");
  if (c.hasMesh === false) lines.push("Mesh: No");
  if (m?.quantity) lines.push(`Quantity ${m.quantity}`);
  if (command.intent === "calculate-estimation") lines.push("Run calculation");
  if (command.intent === "save-product") lines.push("Save to active job");
  if (command.intent === "add-to-quotation") lines.push("Add to quotation");
  if (command.intent === "generate-document") {
    lines.push(`Generate ${command.documentType ?? "document"}`);
  }
  if (!lines.length && ctx.productType) {
    lines.push(ctx.productType.replace("-", " "));
  }
  return lines.join("\n");
}

function buildResultCard(
  title: string,
  lines: string[],
  actions?: AssistantResultCard["actions"],
): AssistantResultCard {
  return { title, lines, actions };
}

export async function parseAssistantCommand(
  text: string,
  isOnline: boolean,
): Promise<AssistantCommand> {
  const local = parseAssistantCommandLocal(text);
  if (local.confidence >= 0.8 || !isOnline) {
    return local;
  }

  try {
    const base =
      typeof window !== "undefined" && process.env.NEXT_PUBLIC_ASSISTANT_API_URL
        ? process.env.NEXT_PUBLIC_ASSISTANT_API_URL
        : "/api/assistant/parse";

    const res = await fetch(base, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    if (!res.ok) return local;

    const data = (await res.json()) as { command?: AssistantCommand };
    if (data.command && data.command.intent !== "unknown") {
      return { ...data.command, rawText: text };
    }
  } catch {
    // Fall back to local parser.
  }

  return local;
}

export async function executeAssistantCommand(
  command: AssistantCommand,
  ctx: AssistantExecutionContext,
  callbacks: AssistantExecutionCallbacks,
  options?: { confirmed?: boolean },
): Promise<AssistantExecutionResult> {
  const permission = validateCommandPermission(command);
  if (!permission.allowed) {
    auditFromCommand(command, "denied", {
      success: false,
      jobId: ctx.jobId,
      productId: ctx.productId,
      voiceTranscript: ctx.voiceTranscript,
      error: permission.reason,
    });
    return { status: "denied", message: permission.reason ?? "Action not permitted." };
  }

  const needsConfirm =
    command.requiresConfirmation ||
    intentRequiresConfirmation(command.intent);

  if (needsConfirm && !options?.confirmed) {
    const preview = buildConfirmationPreview(command, ctx);
    return {
      status: "pending-confirmation",
      message: `I understood:\n\n${preview}\n\nProceed?`,
      command,
      card: buildResultCard("Confirm action", preview.split("\n"), [
        { id: "confirm", label: "Proceed" },
        { id: "cancel", label: "Cancel" },
      ]),
    };
  }

  try {
    switch (command.intent) {
      case "create-product": {
        const type = command.productType ?? "window";
        callbacks.onProductTypeChange(type);
        let inputs = applyPartnerProductType(type, ctx.estimationInputs);
        if (type !== "window") {
          const config = type === "double-door" ? "double" : "single";
          inputs = {
            ...inputs,
            doorSettings: applyDoorConfigurationDefaults(
              inputs.doorSettings ?? createDefaultDoorCuttingOptions(config),
              config,
            ),
          };
        }
        if (command.measurements) inputs = applyMeasurements(inputs, command.measurements);
        let cutting = ctx.cuttingOptions;
        if (command.configuration) {
          const applied = applyConfiguration(inputs, cutting, type, command.configuration);
          inputs = applied.inputs;
          cutting = applied.cuttingOptions;
        }
        callbacks.onEstimationChange(inputs);
        callbacks.onCuttingOptionsChange(cutting);

        const lines = [
          type === "window" ? "Window" : type === "single-door" ? "Single Door" : "Double Door",
        ];
        if (command.measurements?.width && command.measurements?.height) {
          lines.push(`Size: ${command.measurements.width} × ${command.measurements.height} mm`);
        }

        auditFromCommand(command, "create-product", {
          success: true,
          jobId: ctx.jobId,
          productId: ctx.productId,
          voiceTranscript: ctx.voiceTranscript,
          confirmationStatus: needsConfirm ? "confirmed" : "none",
        });

        return {
          status: "success",
          message: "Product configured.",
          card: buildResultCard("Product configured", lines, [
            { id: "calculate", label: "Calculate" },
            { id: "edit", label: "Edit" },
          ]),
        };
      }

      case "update-measurement":
      case "update-configuration": {
        let inputs = ctx.estimationInputs;
        let cutting = ctx.cuttingOptions;
        if (command.productType) {
          callbacks.onProductTypeChange(command.productType);
          inputs = applyPartnerProductType(command.productType, inputs);
        }
        if (command.measurements) inputs = applyMeasurements(inputs, command.measurements);
        if (command.configuration) {
          const applied = applyConfiguration(
            inputs,
            cutting,
            command.productType ?? ctx.productType,
            command.configuration,
          );
          inputs = applied.inputs;
          cutting = applied.cuttingOptions;
        }
        callbacks.onEstimationChange(inputs);
        callbacks.onCuttingOptionsChange(cutting);

        auditFromCommand(command, command.intent, {
          success: true,
          jobId: ctx.jobId,
          productId: ctx.productId,
          voiceTranscript: ctx.voiceTranscript,
        });

        return {
          status: "success",
          message: "Fields updated.",
          card: buildResultCard("Updated", ["Configuration saved to the form."], [
            { id: "calculate", label: "Calculate" },
          ]),
        };
      }

      case "calculate-estimation": {
        callbacks.onCalculate();
        auditFromCommand(command, "calculate-estimation", {
          success: true,
          jobId: ctx.jobId,
          productId: ctx.productId,
          voiceTranscript: ctx.voiceTranscript,
        });
        return {
          status: "success",
          message: "Calculation started using the existing estimation engine.",
        };
      }

      case "get-result": {
        if (!ctx.hasValidResults || !ctx.calculated) {
          return {
            status: "error",
            message: "Please calculate valid results first.",
          };
        }
        const q = command.resultQuery ?? "";
        const c = ctx.calculated;
        let card: AssistantResultCard | undefined;

        if (q.includes("workshop")) {
          card = buildResultCard("Workshop Cost", [
            `₹${(c.workshopTotal ?? 0).toFixed(2)}`,
            c.suggestedCustomerBasePrice != null
              ? `Suggested Customer Base Price: ₹${c.suggestedCustomerBasePrice.toFixed(2)}`
              : "",
            c.suggestedCustomerRatePerSqFt != null
              ? `Suggested Rate: ₹${c.suggestedCustomerRatePerSqFt.toFixed(2)}/sq.ft`
              : "",
          ].filter(Boolean), [{ id: "view-breakdown", label: "View Breakdown" }]);
        } else if (q.includes("customer-rate")) {
          card = buildResultCard("Customer Rate", [
            `Suggested Rate: ₹${(c.suggestedCustomerRatePerSqFt ?? 0).toFixed(2)}/sq.ft`,
            `Suggested Base Price: ₹${(c.suggestedCustomerBasePrice ?? 0).toFixed(2)}`,
          ]);
        } else if (q.includes("margin")) {
          card = buildResultCard("Margin", [
            `${c.customerBaseMarginPercent ?? 0}% margin`,
            `Amount: ₹${(c.customerBaseMarginAmount ?? 0).toFixed(2)}`,
          ]);
        } else if (q.includes("profile-weight")) {
          card = buildResultCard("Profile Weight", [
            `Total: ${(c.totalProfileWeightKg ?? 0).toFixed(2)} kg`,
          ]);
        } else if (q.includes("missing-hardware")) {
          card = buildResultCard(
            "Hardware Rates",
            c.hasMissingHardwareRates
              ? [`Missing: ${(c.missingHardwareItems ?? []).join(", ")}`]
              : ["All hardware rates are configured."],
          );
        } else if (q.includes("hardware")) {
          card = buildResultCard("Door Hardware", c.hardwareItemLabels ?? ["No hardware data."]);
        } else if (q.includes("glass")) {
          card = buildResultCard("Glass Size", [
            c.widthMm && c.heightMm
              ? `${c.widthMm} × ${c.heightMm} mm (${(c.areaSqft ?? 0).toFixed(2)} sq.ft)`
              : "Calculate first to see glass size.",
          ]);
        } else {
          card = buildResultCard("Results", [
            `Workshop: ₹${(c.workshopTotal ?? 0).toFixed(2)}`,
            `Rate: ₹${(c.suggestedCustomerRatePerSqFt ?? 0).toFixed(2)}/sq.ft`,
          ]);
        }

        auditFromCommand(command, "get-result", {
          success: true,
          jobId: ctx.jobId,
          productId: ctx.productId,
          voiceTranscript: ctx.voiceTranscript,
        });

        return { status: "success", message: card.title, card };
      }

      case "save-product": {
        if (command.configuration?.action === "new-product") {
          callbacks.onStartNewProduct();
          return { status: "success", message: "New product started." };
        }
        const result = await callbacks.onSaveProduct();
        auditFromCommand(command, "save-product", {
          success: result.ok,
          jobId: ctx.jobId,
          productId: ctx.productId,
          voiceTranscript: ctx.voiceTranscript,
          confirmationStatus: "confirmed",
          error: result.ok ? undefined : result.message,
        });
        return {
          status: result.ok ? "success" : "error",
          message: result.message,
        };
      }

      case "add-to-quotation": {
        const result = await callbacks.onAddToQuotation();
        auditFromCommand(command, "add-to-quotation", {
          success: result.ok,
          jobId: ctx.jobId,
          productId: ctx.productId,
          voiceTranscript: ctx.voiceTranscript,
          confirmationStatus: "confirmed",
          error: result.ok ? undefined : result.message,
        });
        return {
          status: result.ok ? "success" : "error",
          message: result.message,
        };
      }

      case "generate-document": {
        const doc = command.documentType ?? "labour-pdf";
        const result =
          doc.includes("preview") || doc.includes("quotation")
            ? await callbacks.onPreviewLabourPdf()
            : await callbacks.onGenerateLabourPdf();
        auditFromCommand(command, "generate-document", {
          success: result.ok,
          jobId: ctx.jobId,
          productId: ctx.productId,
          voiceTranscript: ctx.voiceTranscript,
          confirmationStatus: "confirmed",
          error: result.ok ? undefined : result.message,
        });
        return {
          status: result.ok ? "success" : "error",
          message: result.message,
        };
      }

      case "open-module": {
        callbacks.onNavigate(command.targetModule ?? "home");
        auditFromCommand(command, "open-module", {
          success: true,
          jobId: ctx.jobId,
          voiceTranscript: ctx.voiceTranscript,
        });
        return {
          status: "success",
          message: `Opening ${command.targetModule ?? "module"}.`,
        };
      }

      default:
        return {
          status: "error",
          message:
            command.confidence < 0.5
              ? "I understood part of your request. Please confirm the width, height and product type."
              : "I could not understand that command. Try: Create a window 1600 by 1200 mm.",
        };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Command failed.";
    auditFromCommand(command, command.intent, {
      success: false,
      jobId: ctx.jobId,
      voiceTranscript: ctx.voiceTranscript,
      error: message,
    });
    return { status: "error", message };
  }
}
