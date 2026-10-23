import type { CuttingOptions, ThreeTrackSashConfiguration, TrackSystemId } from "./types";
import { TRACK_SYSTEM_PRESETS } from "./presets";

export type { ThreeTrackSashConfiguration };

export const THREE_TRACK_SASH_CONFIGURATION_LABELS: Record<
  ThreeTrackSashConfiguration,
  string
> = {
  "two-glass-one-net": "2 Glass + 1 Net",
  "three-glass-no-net": "3 Glass + No Net",
};

export const DEFAULT_THREE_TRACK_SASH_CONFIGURATION: ThreeTrackSashConfiguration =
  "two-glass-one-net";

export function getThreeTrackSashConfiguration(
  options: CuttingOptions,
): ThreeTrackSashConfiguration {
  return options.threeTrackSashConfiguration ?? DEFAULT_THREE_TRACK_SASH_CONFIGURATION;
}

export function isSarikThreeGlassNoNet(
  options: CuttingOptions,
  systemId: TrackSystemId,
): boolean {
  return (
    systemId === "3-track-t109" &&
    options.cuttingMethod === "sarik" &&
    getThreeTrackSashConfiguration(options) === "three-glass-no-net"
  );
}

export function isSarikTwoGlassOneNet(
  options: CuttingOptions,
  systemId: TrackSystemId,
): boolean {
  if (options.cuttingMethod !== "sarik") {
    return false;
  }
  if (systemId === "2.5-track-t60") {
    return true;
  }
  return (
    systemId === "3-track-t109" &&
    getThreeTrackSashConfiguration(options) === "two-glass-one-net"
  );
}

/** Apply 2 Glass + 1 Net sash quantities (2.5 Track always; 3 Track when selected). */
export function applyTwoGlassOneNetSashConfiguration(
  options: CuttingOptions,
  systemId: TrackSystemId,
): CuttingOptions {
  if (systemId === "2.5-track-t60") {
    const track = TRACK_SYSTEM_PRESETS[systemId].defaults;
    return {
      ...options,
      shutterQty: 3,
      interlockQty: track.interlockQty,
      glassPanelQty: 2,
    };
  }
  if (systemId === "3-track-t109") {
    return applyThreeTrackSashConfiguration(options, systemId, "two-glass-one-net");
  }
  return options;
}

/** Apply profile quantities when the 3-track sash configuration changes. */
export function applyThreeTrackSashConfiguration(
  options: CuttingOptions,
  systemId: TrackSystemId,
  configuration: ThreeTrackSashConfiguration,
): CuttingOptions {
  if (systemId !== "3-track-t109") {
    return options;
  }

  if (configuration === "three-glass-no-net") {
    return {
      ...options,
      threeTrackSashConfiguration: configuration,
      divider: 3,
      shutterQty: 6,
      interlockQty: 4,
      glassPanelQty: 3,
    };
  }

  const track = TRACK_SYSTEM_PRESETS[systemId].defaults;
  return {
    ...options,
    threeTrackSashConfiguration: configuration,
    divider: 3,
    shutterQty: 3,
    interlockQty: track.interlockQty,
    glassPanelQty: 2,
  };
}
