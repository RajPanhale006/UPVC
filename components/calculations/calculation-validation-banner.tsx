"use client";

import { AlertTriangle } from "lucide-react";

import { MessageBanner } from "@/components/workshop/workshop-ui";
import type { CalculationValidation } from "@/lib/calculations";

type CalculationValidationBannerProps = {
  validation: CalculationValidation;
  title?: string;
};

export function CalculationValidationBanner({
  validation,
  title = "Calculation blocked",
}: CalculationValidationBannerProps) {
  if (validation.isValid) return null;

  return (
    <MessageBanner tone="warning">
      <div className="space-y-2">
        <p className="flex items-center gap-2 font-semibold text-amber-950">
          <AlertTriangle className="size-4 shrink-0" />
          {title}
        </p>
        {validation.blockingMessage ? (
          <p className="text-sm text-amber-900/90">{validation.blockingMessage}</p>
        ) : null}
        {validation.issues.length > 0 ? (
          <ul className="list-inside list-disc text-sm text-amber-900/85">
            {validation.issues.map((issue) => (
              <li key={`${issue.field}-${issue.message}`}>
                <span className="font-medium">{issue.field}:</span> {issue.message}
                {issue.requiredMinimum ? (
                  <span className="text-amber-800/80"> ({issue.requiredMinimum})</span>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
        <p className="text-xs text-amber-800/75">
          PDF export, quotation totals and final save are disabled until dimensions are valid.
        </p>
      </div>
    </MessageBanner>
  );
}
