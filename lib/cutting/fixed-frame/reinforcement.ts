import type {
  FixedFrameModuleResult,
  FixedFrameReinforcementRule,
  FixedFrameReinforcementSides,
} from "./types";

export type ReinforcementCut = {
  moduleId: string;
  moduleLabel: string;
  component: string;
  lengthMm: number;
  quantity: number;
};

export function calculateReinforcementCuts(
  modules: FixedFrameModuleResult[],
  rule: FixedFrameReinforcementRule,
  sides: FixedFrameReinforcementSides,
  constructionMode: "SINGLE_FRAME" | "SEPARATE_MODULES" | "INTERNAL_PARTITIONS",
): ReinforcementCut[] {
  if (rule === "NONE") return [];

  const cuts: ReinforcementCut[] = [];

  for (const mod of modules) {
    const horizontal = mod.widthMm - 80;
    const vertical = mod.heightMm - 80;
    if (horizontal <= 0 || vertical <= 0) continue;

    const addHorizontal =
      rule === "FULL_PERIMETER" ||
      rule === "HORIZONTAL_ONLY" ||
      (rule === "CUSTOM" && (sides.top || sides.bottom));
    const addVertical =
      rule === "FULL_PERIMETER" ||
      rule === "VERTICAL_ONLY" ||
      (rule === "CUSTOM" && (sides.left || sides.right));

    if (addHorizontal) {
      const qty =
        rule === "CUSTOM" && sides.top && sides.bottom
          ? 2
          : rule === "FULL_PERIMETER" || rule === "HORIZONTAL_ONLY"
            ? 2
            : 1;
      cuts.push({
        moduleId: mod.id,
        moduleLabel: mod.label,
        component: "Reinforcement Horizontal",
        lengthMm: horizontal,
        quantity: qty,
      });
    }

    if (addVertical) {
      const qty =
        rule === "CUSTOM" && sides.left && sides.right
          ? 2
          : rule === "FULL_PERIMETER" || rule === "VERTICAL_ONLY"
            ? 2
            : 1;
      cuts.push({
        moduleId: mod.id,
        moduleLabel: mod.label,
        component: "Reinforcement Vertical",
        lengthMm: vertical,
        quantity: qty,
      });
    }

    if (
      constructionMode === "INTERNAL_PARTITIONS" &&
      mod.isPartitionSection &&
      ((rule === "CUSTOM" && sides.internalPartitions) || rule === "FULL_PERIMETER")
    ) {
      cuts.push({
        moduleId: mod.id,
        moduleLabel: mod.label,
        component: "Reinforcement Partition",
        lengthMm: vertical,
        quantity: 1,
      });
    }
  }

  return cuts;
}
