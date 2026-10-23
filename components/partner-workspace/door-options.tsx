"use client";

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
  DOOR_OPENING_DIRECTION_LABELS,
  DOOR_OPENING_SIDE_LABELS,
  DOOR_PROFILE_CODES,
  type DoorCuttingOptions,
  type DoorOpeningDirection,
  type DoorOpeningSide,
} from "@/lib/cutting/door";
import type { EstimationInputs } from "@/lib/estimation";
import type { CuttingJobMeta } from "@/lib/summary";
import type { PartnerProductType } from "@/lib/partner-workspace";

type DoorOptionsProps = {
  productType: PartnerProductType;
  estimationInputs: EstimationInputs;
  doorOptions: DoorCuttingOptions;
  cuttingJobMeta: CuttingJobMeta;
  onEstimationChange: (inputs: EstimationInputs) => void;
  onDoorOptionsChange: (options: DoorCuttingOptions) => void;
  onCuttingJobMetaChange: (meta: CuttingJobMeta) => void;
};

export function DoorOptions({
  productType,
  estimationInputs,
  doorOptions,
  cuttingJobMeta,
  onEstimationChange,
  onDoorOptionsChange,
  onCuttingJobMetaChange,
}: DoorOptionsProps) {
  const isDouble = productType === "double-door";
  const title = isDouble ? "Double Door Options" : "Single Door Options";

  function updateDoor(patch: Partial<DoorCuttingOptions>) {
    onDoorOptionsChange({ ...doorOptions, ...patch });
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-base font-bold text-slate-900">{title}</h2>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Door Profile</Label>
          <Input readOnly className="h-11 bg-slate-50" value={DOOR_PROFILE_CODES.frame} />
        </div>
        <div className="space-y-2">
          <Label>Sash Profile</Label>
          <Input readOnly className="h-11 bg-slate-50" value={DOOR_PROFILE_CODES.sash} />
        </div>

        {!isDouble ? (
          <div className="space-y-2">
            <Label>Opening Side</Label>
            <Select
              value={doorOptions.openingSide}
              onValueChange={(v) => updateDoor({ openingSide: v as DoorOpeningSide })}
            >
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(DOOR_OPENING_SIDE_LABELS) as [DoorOpeningSide, string][]).map(
                  ([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div className="space-y-2">
            <Label>Active Leaf</Label>
            <Select
              value={doorOptions.openingSide}
              onValueChange={(v) => updateDoor({ openingSide: v as DoorOpeningSide })}
            >
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(DOOR_OPENING_SIDE_LABELS) as [DoorOpeningSide, string][]).map(
                  ([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <Label>Opening Direction</Label>
          <Select
            value={doorOptions.openingDirection}
            onValueChange={(v) => updateDoor({ openingDirection: v as DoorOpeningDirection })}
          >
            <SelectTrigger className="h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.entries(DOOR_OPENING_DIRECTION_LABELS) as [
                DoorOpeningDirection,
                string,
              ][]).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label>Glass or Panel</Label>
          <Input
            readOnly
            className="h-11 bg-slate-50"
            value="Standard glass (from Sarik method)"
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="pw-door-location">Location or Room</Label>
          <Input
            id="pw-door-location"
            className="h-11"
            value={cuttingJobMeta.windowLocation}
            onChange={(e) =>
              onCuttingJobMetaChange({ ...cuttingJobMeta, windowLocation: e.target.value })
            }
            placeholder="e.g. Main entrance"
          />
        </div>
      </div>

      <input type="hidden" value={estimationInputs.productKind} readOnly />
    </section>
  );
}
