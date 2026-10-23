import { getThreeTrackSashConfiguration, THREE_TRACK_SASH_CONFIGURATION_LABELS } from "@/lib/cutting/sash-configuration";
import type { CuttingOptions } from "@/lib/cutting/types";
import { TRACK_LABELS } from "@/lib/estimation/defaults";
import type { EstimationInputs } from "@/lib/estimation/types";
import type { JobProductKind } from "@/lib/jobs/types";

/** Short label for project builder product rows — track type, door config, etc. */
export function describeProductSystem(
  productKind: JobProductKind,
  estimationInputs: EstimationInputs,
  cuttingOptions: CuttingOptions,
): string {
  if (productKind === "door") {
    const config = estimationInputs.doorSettings?.configuration ?? "single";
    const side = estimationInputs.doorSettings?.openingSide ?? "left";
    const direction = estimationInputs.doorSettings?.openingDirection ?? "inward";
    return `${config === "double" ? "Double" : "Single"} Door · ${side} · ${direction}`;
  }

  if (productKind === "fixed-frame") {
    const modules = estimationInputs.fixedFrameSettings?.moduleCount ?? 1;
    return `Fixed Frame · ${modules} module${modules === 1 ? "" : "s"}`;
  }

  const track = TRACK_LABELS[estimationInputs.trackSystemId] ?? estimationInputs.trackSystemId;
  if (estimationInputs.trackSystemId === "2.5-track-t60") {
    return `${track} · 2 Glass + 1 Net`;
  }
  if (estimationInputs.trackSystemId === "3-track-t109") {
    const sash = THREE_TRACK_SASH_CONFIGURATION_LABELS[
      getThreeTrackSashConfiguration(cuttingOptions)
    ];
    return `${track} · ${sash}`;
  }

  return track;
}
