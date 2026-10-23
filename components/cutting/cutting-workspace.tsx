"use client";

import type { Dispatch, SetStateAction } from "react";

import { CuttingCalculator } from "@/components/cutting/cutting-calculator";
import { DoorCuttingCalculator } from "@/components/cutting/door-cutting-calculator";
import {
  buildPreviewDataFromEstimation,
  ProductPreview,
} from "@/components/product-preview";
import type { CuttingOptions, ProfileCuttingSettings } from "@/lib/cutting";
import { getProfileCodeForOptions } from "@/lib/cutting";
import type { DoorCuttingOptions } from "@/lib/cutting/door";
import {
  isDoorProduct,
  PRODUCT_KIND_LABELS,
  type EstimationInputs,
  type ProductKind,
} from "@/lib/estimation";
import {
  resolveCuttingContentMode,
  resolveCuttingProductKind,
} from "@/lib/module-menu";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AccentCard, AccentCardContent, PageShell } from "@/components/workshop/workshop-ui";
import type { CuttingJobMeta } from "@/lib/summary";

type CuttingWorkspaceProps = {
  estimationInputs: EstimationInputs;
  onEstimationInputsChange: (inputs: EstimationInputs) => void;
  profileCuttingSettings: ProfileCuttingSettings;
  cuttingOptions: CuttingOptions;
  onCuttingOptionsChange: Dispatch<SetStateAction<CuttingOptions>>;
  doorOptions: DoorCuttingOptions;
  onDoorOptionsChange: Dispatch<SetStateAction<DoorCuttingOptions>>;
  cuttingJobMeta: CuttingJobMeta;
  onCuttingJobMetaChange: Dispatch<SetStateAction<CuttingJobMeta>>;
  activeSection?: string;
  footer?: React.ReactNode;
};

export function CuttingWorkspace(props: CuttingWorkspaceProps) {
  const contentMode = resolveCuttingContentMode(props.activeSection);
  const productKind = resolveCuttingProductKind(
    props.activeSection,
    props.estimationInputs.productKind ?? "window",
  );
  const isDoor = productKind === "door";
  const isFixedFrame = productKind === "fixed-frame";
  const sectionMode = Boolean(props.activeSection);
  const showProductPicker =
    !sectionMode ||
    (props.activeSection !== "window-cutting" && props.activeSection !== "door-cutting");

  function handleProductKindChange(kind: ProductKind) {
    props.onEstimationInputsChange({
      ...props.estimationInputs,
      productKind: kind,
    });
  }

  if (contentMode === "preview") {
    const systemId = props.estimationInputs.trackSystemId ?? "2-track-t60";
    return (
      <PageShell className="flex flex-col gap-4">
        {isDoor ? (
          <DoorCuttingCalculator
            estimationInputs={{ ...props.estimationInputs, productKind: "door" }}
            onEstimationInputsChange={props.onEstimationInputsChange}
            doorOptions={props.doorOptions}
            onDoorOptionsChange={props.onDoorOptionsChange}
            cuttingJobMeta={props.cuttingJobMeta}
            onCuttingJobMetaChange={props.onCuttingJobMetaChange}
            contentMode="preview"
          />
        ) : (
          <ProductPreview
            data={buildPreviewDataFromEstimation(
              props.estimationInputs,
              props.cuttingOptions,
              getProfileCodeForOptions(systemId, props.cuttingOptions),
            )}
          />
        )}
        {props.footer}
      </PageShell>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {showProductPicker ? (
        <AccentCard accent="indigo">
          <AccentCardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <Label>Product type</Label>
              <Select
                value={productKind}
                onValueChange={(v) => handleProductKindChange(v as ProductKind)}
              >
                <SelectTrigger className="w-full sm:w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(PRODUCT_KIND_LABELS) as ProductKind[]).map((kind) => (
                    <SelectItem key={kind} value={kind}>
                      {PRODUCT_KIND_LABELS[kind]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-slate-500">
              {isFixedFrame
                ? "Fixed UPVC partition frames — use Smart Estimation Center for module division and costing."
                : isDoor
                  ? "Sarik Door Method — casement frame & door sash profiles."
                  : "Sliding window cutting — Sarik / workshop methods unchanged."}
            </p>
          </AccentCardContent>
        </AccentCard>
      ) : null}

      {isFixedFrame ? (
        <AccentCard accent="emerald">
          <AccentCardContent className="py-6 text-sm text-slate-700">
            Fixed UPVC Partition Frame cutting, glass sheets, and bar optimization are
            available in the Smart Estimation Center. Select product type &quot;Fixed
            Frame&quot; on the Home screen.
          </AccentCardContent>
        </AccentCard>
      ) : isDoor ? (
        <DoorCuttingCalculator
          estimationInputs={{ ...props.estimationInputs, productKind: "door" }}
          onEstimationInputsChange={props.onEstimationInputsChange}
          doorOptions={props.doorOptions}
          onDoorOptionsChange={props.onDoorOptionsChange}
          cuttingJobMeta={props.cuttingJobMeta}
          onCuttingJobMetaChange={props.onCuttingJobMetaChange}
          contentMode={contentMode}
        />
      ) : (
        <CuttingCalculator
          estimationInputs={{ ...props.estimationInputs, productKind: "window" }}
          onEstimationInputsChange={props.onEstimationInputsChange}
          profileCuttingSettings={props.profileCuttingSettings}
          cuttingOptions={props.cuttingOptions}
          onCuttingOptionsChange={props.onCuttingOptionsChange}
          cuttingJobMeta={props.cuttingJobMeta}
          onCuttingJobMetaChange={props.onCuttingJobMetaChange}
          contentMode={contentMode}
        />
      )}

      {props.footer}
    </div>
  );
}
