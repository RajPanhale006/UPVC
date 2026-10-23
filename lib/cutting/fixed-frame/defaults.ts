import { DOOR_PROFILE_CODES } from "@/lib/cutting/door/constants";

import {
  DEFAULT_JOINT_GAP_MM,
  DEFAULT_KERF_MM,
  DEFAULT_MANUAL_WIDTH_TOLERANCE_MM,
  DEFAULT_MAXIMUM_MODULE_WIDTH_MM,
  DEFAULT_MINIMUM_REUSABLE_LENGTH_MM,
  DEFAULT_STANDARD_BAR_LENGTH_MM,
} from "./constants";
import type { FixedFrameReinforcementSides, FixedFrameSettings } from "./types";

export function createDefaultFixedFrameSettings(
  overrides?: Partial<FixedFrameSettings>,
): FixedFrameSettings {
  const constructionMode = overrides?.constructionMode ?? "SEPARATE_MODULES";
  const divisionMode =
    overrides?.divisionMode ??
    (constructionMode === "SINGLE_FRAME" ? "NONE" : "EQUAL");

  return {
    constructionMode,
    divisionMode,
    maximumModuleWidthMm:
      overrides?.maximumModuleWidthMm ?? DEFAULT_MAXIMUM_MODULE_WIDTH_MM,
    moduleCount: overrides?.moduleCount ?? 2,
    sectionCount: overrides?.sectionCount ?? 2,
    moduleWidthsMm: overrides?.moduleWidthsMm ?? [],
    leftClearanceMm: overrides?.leftClearanceMm ?? 0,
    rightClearanceMm: overrides?.rightClearanceMm ?? 0,
    topClearanceMm: overrides?.topClearanceMm ?? 0,
    bottomClearanceMm: overrides?.bottomClearanceMm ?? 0,
    jointGapMm: overrides?.jointGapMm ?? DEFAULT_JOINT_GAP_MM,
    manualWidthToleranceMm:
      overrides?.manualWidthToleranceMm ?? DEFAULT_MANUAL_WIDTH_TOLERANCE_MM,
    profiles: {
      frameProfileKey: "casement-frame",
      frameProfileCode: DOOR_PROFILE_CODES.frame,
      beadProfileKey: "gb36-beading",
      beadProfileCode: DOOR_PROFILE_CODES.beading,
      mullionProfileKey: "casement-frame",
      mullionProfileCode: DOOR_PROFILE_CODES.frame,
      reinforcementProfileKey: "casement-frame",
      reinforcementProfileCode: "Steel",
      ...(overrides?.profiles ?? {}),
    },
    reinforcementRule: overrides?.reinforcementRule ?? "FULL_PERIMETER",
    reinforcementSides: {
      top: true,
      bottom: true,
      left: true,
      right: true,
      internalPartitions: true,
      ...(overrides?.reinforcementSides ?? {}),
    },
    glassType: overrides?.glassType ?? "Clear Glass",
    glassThicknessMm: overrides?.glassThicknessMm ?? 6,
    glassRatePerSqFt: overrides?.glassRatePerSqFt ?? 85,
    reinforcementRatePerKg: overrides?.reinforcementRatePerKg ?? 65,
    labourRatePerSqFt: overrides?.labourRatePerSqFt ?? 45,
    transportation: overrides?.transportation ?? 0,
    standardBarLengthMm:
      overrides?.standardBarLengthMm ?? DEFAULT_STANDARD_BAR_LENGTH_MM,
    kerfMm: overrides?.kerfMm ?? DEFAULT_KERF_MM,
    minimumReusableLengthMm:
      overrides?.minimumReusableLengthMm ?? DEFAULT_MINIMUM_REUSABLE_LENGTH_MM,
    savedLeftoverInventoryMm: overrides?.savedLeftoverInventoryMm ?? [],
  };
}

export const FIXED_FRAME_CONSTRUCTION_LABELS: Record<
  FixedFrameSettings["constructionMode"],
  string
> = {
  SINGLE_FRAME: "Single Frame",
  SEPARATE_MODULES: "Separate Modules",
  INTERNAL_PARTITIONS: "Internal Partitions",
};

export const FIXED_FRAME_DIVISION_LABELS: Record<
  FixedFrameSettings["divisionMode"],
  string
> = {
  NONE: "None",
  AUTO: "Auto",
  EQUAL: "Equal",
  MANUAL: "Manual",
};

export const FIXED_FRAME_REINFORCEMENT_LABELS: Record<
  FixedFrameSettings["reinforcementRule"],
  string
> = {
  NONE: "None",
  FULL_PERIMETER: "Full Perimeter",
  HORIZONTAL_ONLY: "Horizontal Only",
  VERTICAL_ONLY: "Vertical Only",
  CUSTOM: "Custom",
};

export function defaultReinforcementSides(): FixedFrameReinforcementSides {
  return {
    top: true,
    bottom: true,
    left: true,
    right: true,
    internalPartitions: true,
  };
}
