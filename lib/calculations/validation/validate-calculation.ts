import type { AllCuts } from "@/lib/cutting/types";
import type { DoorComponentSizes } from "@/lib/cutting/door/types";
import type { CalculationValidation, ValidationIssue } from "../types";

function issue(field: string, message: string, requiredMinimum?: string): ValidationIssue {
  return { field, message, requiredMinimum };
}

function validateNumericComponent(
  issues: ValidationIssue[],
  field: string,
  value: number,
  requiredMinimum = "must be greater than 0 mm",
): void {
  if (!Number.isFinite(value) || value <= 0) {
    issues.push(
      issue(
        field,
        `${field} is ${Number.isFinite(value) ? Math.round(value) : "invalid"} mm — cannot be zero or negative.`,
        requiredMinimum,
      ),
    );
  }
}

/** Validate window cut output — blocks negative glass, steel, beading. */
export function validateWindowCuts(cuts: AllCuts): CalculationValidation {
  const issues: ValidationIssue[] = [];

  validateNumericComponent(issues, "Frame width", cuts.frameWidth);
  validateNumericComponent(issues, "Frame height", cuts.frameHeight);
  validateNumericComponent(issues, "Sash top", cuts.sashTop);
  validateNumericComponent(issues, "Sash side", cuts.sashSide);
  validateNumericComponent(issues, "Glass width", cuts.glassWidth);
  validateNumericComponent(issues, "Glass height", cuts.glassHeight);
  validateNumericComponent(issues, "Beading width", cuts.beadingWidth);
  validateNumericComponent(issues, "Beading height", cuts.beadingHeight);

  if (cuts.interlock !== 0) {
    validateNumericComponent(issues, "Interlock", cuts.interlock);
  }

  validateNumericComponent(issues, "Steel frame horizontal", cuts.steelFrameH);
  validateNumericComponent(issues, "Steel frame vertical", cuts.steelFrameV);
  validateNumericComponent(issues, "Steel sash horizontal", cuts.steelSashH);
  validateNumericComponent(issues, "Steel sash vertical", cuts.steelSashV);

  const blockingMessage =
    issues.length > 0
      ? `Invalid window calculation. ${issues[0]?.message ?? "Check dimensions and track configuration."}`
      : null;

  return {
    isValid: issues.length === 0,
    blockingMessage,
    issues,
  };
}

/** Validate door component sizes. */
export function validateDoorComponents(
  components: DoorComponentSizes,
): CalculationValidation {
  const issues: ValidationIssue[] = [];

  validateNumericComponent(issues, "Frame width", components.frame.widthMm);
  validateNumericComponent(issues, "Frame height", components.frame.heightMm);
  validateNumericComponent(issues, "Sash width", components.sash.widthMm);
  validateNumericComponent(issues, "Sash height", components.sash.heightMm);
  validateNumericComponent(issues, "Beading width", components.beading.widthMm);
  validateNumericComponent(issues, "Beading height", components.beading.heightMm);
  validateNumericComponent(issues, "Glass width", components.glass.widthMm);
  validateNumericComponent(issues, "Glass height", components.glass.heightMm);

  if (components.flatMullionMm != null) {
    validateNumericComponent(issues, "Flat mullion", components.flatMullionMm);
  }

  const blockingMessage =
    issues.length > 0
      ? `Invalid door calculation. ${issues[0]?.message ?? "Check door dimensions."}`
      : null;

  return {
    isValid: issues.length === 0,
    blockingMessage,
    issues,
  };
}

export function mergeValidations(
  ...validations: CalculationValidation[]
): CalculationValidation {
  const issues = validations.flatMap((v) => v.issues);
  return {
    isValid: issues.length === 0,
    blockingMessage: issues[0]
      ? validations.find((v) => v.blockingMessage)?.blockingMessage ?? issues[0].message
      : null,
    issues,
  };
}

export function invalidValidation(message: string, field = "dimensions"): CalculationValidation {
  return {
    isValid: false,
    blockingMessage: message,
    issues: [issue(field, message)],
  };
}
