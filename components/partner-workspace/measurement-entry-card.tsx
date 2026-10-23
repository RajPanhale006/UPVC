"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  feetInchesToMm,
  mmToFeetInches,
  normalizeMm,
  type EstimationInputs,
} from "@/lib/estimation";
import type { PartnerUnitMode } from "@/lib/partner-workspace";

function parseNumber(value: string, fallback = 0): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

type MeasurementEntryCardProps = {
  estimationInputs: EstimationInputs;
  unitMode: PartnerUnitMode;
  onUnitModeChange: (mode: PartnerUnitMode) => void;
  onEstimationChange: (inputs: EstimationInputs) => void;
  errors?: string[];
};

export function MeasurementEntryCard({
  estimationInputs,
  unitMode,
  onUnitModeChange,
  onEstimationChange,
  errors = [],
}: MeasurementEntryCardProps) {
  const widthMm = feetInchesToMm(
    estimationInputs.widthFeet,
    estimationInputs.widthInches,
  );
  const heightMm = feetInchesToMm(
    estimationInputs.heightFeet,
    estimationInputs.heightInches,
  );
  const qty = Math.max(1, estimationInputs.numberOfWindows || 1);

  function update(patch: Partial<EstimationInputs>) {
    onEstimationChange({ ...estimationInputs, ...patch });
  }

  function updateFeetInches(
    axis: "width" | "height",
    part: "feet" | "inches",
    raw: string,
  ) {
    const value = parseNumber(raw, 0);
    const key =
      axis === "width"
        ? part === "feet"
          ? "widthFeet"
          : "widthInches"
        : part === "feet"
          ? "heightFeet"
          : "heightInches";
    update({ [key]: value } as Partial<EstimationInputs>);
  }

  function updateMm(axis: "width" | "height", raw: string) {
    const mm = normalizeMm(parseNumber(raw, 0));
    const { feet, inches } = mmToFeetInches(mm);
    if (axis === "width") {
      update({ widthFeet: feet, widthInches: inches });
    } else {
      update({ heightFeet: feet, heightInches: inches });
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-base font-bold text-slate-900">Measurements</h2>
      <p className="mt-0.5 text-sm text-slate-600">Enter width, height and quantity</p>

      <div className="mt-4 flex gap-2">
        {(["mm", "ft-in"] as PartnerUnitMode[]).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => onUnitModeChange(mode)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-semibold transition",
              unitMode === mode
                ? "bg-violet-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200",
            )}
          >
            {mode === "mm" ? "Millimetres" : "Feet & Inches"}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {unitMode === "mm" ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="pw-width-mm">Width (mm)</Label>
              <Input
                id="pw-width-mm"
                inputMode="numeric"
                className="h-12 text-lg"
                value={widthMm > 0 ? String(Math.round(widthMm)) : ""}
                onChange={(e) => updateMm("width", e.target.value)}
                placeholder="e.g. 1187"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pw-height-mm">Height (mm)</Label>
              <Input
                id="pw-height-mm"
                inputMode="numeric"
                className="h-12 text-lg"
                value={heightMm > 0 ? String(Math.round(heightMm)) : ""}
                onChange={(e) => updateMm("height", e.target.value)}
                placeholder="e.g. 1208"
              />
            </div>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <Label>Width</Label>
              <div className="flex gap-2">
                <Input
                  inputMode="decimal"
                  className="h-12 text-lg"
                  aria-label="Width feet"
                  value={String(estimationInputs.widthFeet)}
                  onChange={(e) => updateFeetInches("width", "feet", e.target.value)}
                  placeholder="ft"
                />
                <Input
                  inputMode="decimal"
                  className="h-12 text-lg"
                  aria-label="Width inches"
                  value={String(estimationInputs.widthInches)}
                  onChange={(e) => updateFeetInches("width", "inches", e.target.value)}
                  placeholder="in"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Height</Label>
              <div className="flex gap-2">
                <Input
                  inputMode="decimal"
                  className="h-12 text-lg"
                  aria-label="Height feet"
                  value={String(estimationInputs.heightFeet)}
                  onChange={(e) => updateFeetInches("height", "feet", e.target.value)}
                  placeholder="ft"
                />
                <Input
                  inputMode="decimal"
                  className="h-12 text-lg"
                  aria-label="Height inches"
                  value={String(estimationInputs.heightInches)}
                  onChange={(e) => updateFeetInches("height", "inches", e.target.value)}
                  placeholder="in"
                />
              </div>
            </div>
          </>
        )}

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="pw-qty">Quantity</Label>
          <Input
            id="pw-qty"
            inputMode="numeric"
            className="h-12 max-w-[160px] text-lg"
            value={String(qty)}
            onChange={(e) =>
              update({ numberOfWindows: Math.max(1, Math.floor(parseNumber(e.target.value, 1))) })
            }
          />
        </div>
      </div>

      {errors.length > 0 ? (
        <ul className="mt-3 space-y-1 text-sm text-rose-700">
          {errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
