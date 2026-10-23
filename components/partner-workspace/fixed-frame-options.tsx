"use client";

import { useMemo } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  calculateModuleDivision,
  divisionInputFromSettings,
  FIXED_FRAME_CONSTRUCTION_LABELS,
  FIXED_FRAME_DIVISION_LABELS,
  FIXED_FRAME_REINFORCEMENT_LABELS,
  type FixedFrameConstructionMode,
  type FixedFrameDivisionMode,
  type FixedFrameReinforcementRule,
  type FixedFrameSettings,
} from "@/lib/cutting/fixed-frame";
import { feetInchesToMm } from "@/lib/estimation";
import type { EstimationInputs } from "@/lib/estimation";
import type { CuttingJobMeta } from "@/lib/summary";

import { FixedFrameModulePreview } from "./fixed-frame-module-preview";

type FixedFrameOptionsProps = {
  estimationInputs: EstimationInputs;
  cuttingJobMeta: CuttingJobMeta;
  onEstimationChange: (inputs: EstimationInputs) => void;
  onCuttingJobMetaChange: (meta: CuttingJobMeta) => void;
};

export function FixedFrameOptions({
  estimationInputs,
  cuttingJobMeta,
  onEstimationChange,
  onCuttingJobMetaChange,
}: FixedFrameOptionsProps) {
  const settings = estimationInputs.fixedFrameSettings!;
  const widthMm = feetInchesToMm(
    estimationInputs.widthFeet,
    estimationInputs.widthInches,
  );
  const heightMm = feetInchesToMm(
    estimationInputs.heightFeet,
    estimationInputs.heightInches,
  );

  function updateSettings(patch: Partial<FixedFrameSettings>) {
    onEstimationChange({
      ...estimationInputs,
      fixedFrameSettings: { ...settings, ...patch },
    });
  }

  function updateConstruction(mode: FixedFrameConstructionMode) {
    const divisionMode: FixedFrameDivisionMode =
      mode === "SINGLE_FRAME"
        ? "NONE"
        : settings.divisionMode === "NONE"
          ? "EQUAL"
          : settings.divisionMode;
    updateSettings({
      constructionMode: mode,
      divisionMode,
      moduleCount: mode === "SINGLE_FRAME" ? 1 : Math.max(2, settings.moduleCount),
      sectionCount: mode === "INTERNAL_PARTITIONS" ? Math.max(2, settings.sectionCount) : settings.sectionCount,
    });
  }

  const divisionPreview = useMemo(() => {
    if (widthMm <= 0 || heightMm <= 0) return null;
    return calculateModuleDivision(
      divisionInputFromSettings(widthMm, heightMm, settings),
    );
  }, [widthMm, heightMm, settings]);

  const validationError =
    divisionPreview && !divisionPreview.ok ? divisionPreview.error : null;

  return (
    <>
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-bold text-slate-900">Fixed Frame Options</h2>
        <p className="mt-1 text-xs text-slate-600">
          Fixed UPVC partition frame with clear glass — no sliding track, sash, or mesh.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Construction Mode</Label>
            <Select
              value={settings.constructionMode}
              onValueChange={(v) => updateConstruction(v as FixedFrameConstructionMode)}
            >
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(
                  Object.entries(FIXED_FRAME_CONSTRUCTION_LABELS) as [
                    FixedFrameConstructionMode,
                    string,
                  ][]
                ).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Division Mode</Label>
            <Select
              value={settings.divisionMode}
              disabled={settings.constructionMode === "SINGLE_FRAME"}
              onValueChange={(v) =>
                updateSettings({ divisionMode: v as FixedFrameDivisionMode })
              }
            >
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(
                  Object.entries(FIXED_FRAME_DIVISION_LABELS) as [
                    FixedFrameDivisionMode,
                    string,
                  ][]
                ).map(([value, label]) => (
                  <SelectItem key={value} value={value} disabled={value === "NONE" && settings.constructionMode !== "SINGLE_FRAME"}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {settings.constructionMode === "SEPARATE_MODULES" ? (
            <>
              <div className="space-y-2">
                <Label>Module Count</Label>
                <Input
                  type="number"
                  min={2}
                  className="h-11"
                  value={settings.moduleCount}
                  disabled={settings.divisionMode === "AUTO"}
                  onChange={(e) =>
                    updateSettings({ moduleCount: Math.max(2, Number(e.target.value) || 2) })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Maximum Module Width (mm)</Label>
                <Input
                  type="number"
                  min={500}
                  className="h-11"
                  value={settings.maximumModuleWidthMm}
                  onChange={(e) =>
                    updateSettings({
                      maximumModuleWidthMm: Math.max(500, Number(e.target.value) || 4267),
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Joint Gap (mm)</Label>
                <Input
                  type="number"
                  min={0}
                  className="h-11"
                  value={settings.jointGapMm}
                  onChange={(e) =>
                    updateSettings({ jointGapMm: Math.max(0, Number(e.target.value) || 0) })
                  }
                />
              </div>
            </>
          ) : null}

          {settings.constructionMode === "INTERNAL_PARTITIONS" ? (
            <div className="space-y-2">
              <Label>Section Count</Label>
              <Input
                type="number"
                min={2}
                className="h-11"
                value={settings.sectionCount}
                onChange={(e) =>
                  updateSettings({ sectionCount: Math.max(2, Number(e.target.value) || 2) })
                }
              />
            </div>
          ) : null}

          <div className="space-y-2">
            <Label>Glass Thickness (mm)</Label>
            <Select
              value={String(settings.glassThicknessMm)}
              onValueChange={(v) =>
                updateSettings({
                  glassThicknessMm: Number(v) as FixedFrameSettings["glassThicknessMm"],
                })
              }
            >
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[4, 5, 6, 8, 10, 12].map((t) => (
                  <SelectItem key={t} value={String(t)}>
                    {t} mm
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Reinforcement Rule</Label>
            <Select
              value={settings.reinforcementRule}
              onValueChange={(v) =>
                updateSettings({ reinforcementRule: v as FixedFrameReinforcementRule })
              }
            >
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(
                  Object.entries(FIXED_FRAME_REINFORCEMENT_LABELS) as [
                    FixedFrameReinforcementRule,
                    string,
                  ][]
                ).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Glass Rate (₹/sq.ft)</Label>
            <Input
              type="number"
              min={0}
              className="h-11"
              value={settings.glassRatePerSqFt}
              onChange={(e) =>
                updateSettings({ glassRatePerSqFt: Math.max(0, Number(e.target.value) || 0) })
              }
            />
          </div>

          <div className="space-y-2">
            <Label>Labour Rate (₹/sq.ft)</Label>
            <Input
              type="number"
              min={0}
              className="h-11"
              value={settings.labourRatePerSqFt}
              onChange={(e) =>
                updateSettings({ labourRatePerSqFt: Math.max(0, Number(e.target.value) || 0) })
              }
            />
          </div>

          <div className="space-y-2">
            <Label>Transportation (₹)</Label>
            <Input
              type="number"
              min={0}
              className="h-11"
              value={settings.transportation}
              onChange={(e) =>
                updateSettings({ transportation: Math.max(0, Number(e.target.value) || 0) })
              }
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label>Location / Reference</Label>
            <Input
              className="h-11"
              value={cuttingJobMeta.windowLocation}
              onChange={(e) =>
                onCuttingJobMetaChange({ ...cuttingJobMeta, windowLocation: e.target.value })
              }
              placeholder="e.g. Ahilyanagar Block A"
            />
          </div>
        </div>

        {validationError ? (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {validationError}
          </p>
        ) : null}

        {divisionPreview?.ok ? (
          <p className="mt-3 text-xs text-slate-600">
            Preview: {divisionPreview.moduleCount} module(s) · usable width{" "}
            {divisionPreview.usableWidthMm} mm · module height {divisionPreview.moduleHeightMm} mm
          </p>
        ) : null}
      </section>

      {divisionPreview?.ok ? (
        <FixedFrameModulePreview
          openingWidthMm={widthMm}
          openingHeightMm={heightMm}
          moduleWidthsMm={divisionPreview.moduleWidthsMm}
          moduleHeightMm={divisionPreview.moduleHeightMm}
          constructionMode={settings.constructionMode}
          jointGapMm={settings.jointGapMm}
        />
      ) : null}
    </>
  );
}
