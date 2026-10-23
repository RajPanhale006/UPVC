"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

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
  CUTTING_METHOD_LABELS,
  syncCuttingOptionsForTrack,
  TRACK_SYSTEM_PRESETS,
  applyThreeTrackSashConfiguration,
  applyTwoGlassOneNetSashConfiguration,
  THREE_TRACK_SASH_CONFIGURATION_LABELS,
  type CuttingMethod,
  type CuttingOptions,
  type ThreeTrackSashConfiguration,
  type TrackSystemId,
} from "@/lib/cutting";
import { TRACK_LABELS, type EstimationInputs } from "@/lib/estimation";
import type { CuttingJobMeta } from "@/lib/summary";

type WindowOptionsProps = {
  estimationInputs: EstimationInputs;
  cuttingOptions: CuttingOptions;
  cuttingJobMeta: CuttingJobMeta;
  onEstimationChange: (inputs: EstimationInputs) => void;
  onCuttingOptionsChange: (options: CuttingOptions) => void;
  onCuttingJobMetaChange: (meta: CuttingJobMeta) => void;
};

export function WindowOptions({
  estimationInputs,
  cuttingOptions,
  cuttingJobMeta,
  onEstimationChange,
  onCuttingOptionsChange,
  onCuttingJobMetaChange,
}: WindowOptionsProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const trackId = estimationInputs.trackSystemId;

  function handleTrackChange(nextTrack: TrackSystemId) {
    onEstimationChange({ ...estimationInputs, trackSystemId: nextTrack });
    let next = syncCuttingOptionsForTrack(cuttingOptions, nextTrack);
    if (nextTrack === "2.5-track-t60" && next.cuttingMethod === "sarik") {
      next = applyTwoGlassOneNetSashConfiguration(next, nextTrack);
    }
    onCuttingOptionsChange(next);
  }

  function handleMethodChange(method: CuttingMethod) {
    onCuttingOptionsChange(
      syncCuttingOptionsForTrack({ ...cuttingOptions, cuttingMethod: method }, trackId),
    );
  }

  function handleSashConfig(config: ThreeTrackSashConfiguration) {
    onCuttingOptionsChange(
      applyThreeTrackSashConfiguration(cuttingOptions, trackId, config),
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-base font-bold text-slate-900">Window Options</h2>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Track Type</Label>
          <Select value={trackId} onValueChange={(v) => handleTrackChange(v as TrackSystemId)}>
            <SelectTrigger className="h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(TRACK_SYSTEM_PRESETS) as TrackSystemId[]).map((id) => (
                <SelectItem key={id} value={id}>
                  {TRACK_LABELS[id]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Profile</Label>
          <Input
            readOnly
            className="h-11 bg-slate-50"
            value={TRACK_SYSTEM_PRESETS[trackId].profileCode}
          />
        </div>

        <div className="space-y-2">
          <Label>Cutting Method</Label>
          <Select
            value={cuttingOptions.cuttingMethod}
            onValueChange={(v) => handleMethodChange(v as CuttingMethod)}
          >
            <SelectTrigger className="h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(CUTTING_METHOD_LABELS) as CuttingMethod[]).map((method) => (
                <SelectItem key={method} value={method}>
                  {CUTTING_METHOD_LABELS[method]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {trackId === "3-track-t109" ? (
          <div className="space-y-2 sm:col-span-2">
            <Label>Sash Configuration</Label>
            <Select
              value={cuttingOptions.threeTrackSashConfiguration ?? "two-glass-one-net"}
              onValueChange={(v) => handleSashConfig(v as ThreeTrackSashConfiguration)}
            >
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(THREE_TRACK_SASH_CONFIGURATION_LABELS) as [
                  ThreeTrackSashConfiguration,
                  string,
                ][]).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="pw-location">Location or Room (optional)</Label>
          <Input
            id="pw-location"
            className="h-11"
            value={cuttingJobMeta.windowLocation}
            onChange={(e) =>
              onCuttingJobMetaChange({ ...cuttingJobMeta, windowLocation: e.target.value })
            }
            placeholder="e.g. Master bedroom"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() => setAdvancedOpen((v) => !v)}
        className="mt-4 flex items-center gap-1 text-sm font-semibold text-violet-700"
      >
        {advancedOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        Advanced Options
      </button>

      {advancedOpen ? (
        <div className="mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
          Advanced cutting deductions and workshop presets are available in the Cutting module.
          Smart Estimation Center uses saved profile settings and Sarik defaults.
        </div>
      ) : null}
    </section>
  );
}
