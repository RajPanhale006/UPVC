import type { OptimizedBarPlan } from "./types";

export type BarValidationIssue = {
  barId: string;
  profileCode: string;
  message: string;
};

export function validateOptimizedBars(
  barPlans: OptimizedBarPlan[],
): BarValidationIssue[] {
  const issues: BarValidationIssue[] = [];

  for (const plan of barPlans) {
    if (plan.usedLengthMm > plan.sourceBarLengthMm + 0.001) {
      issues.push({
        barId: plan.barId,
        profileCode: plan.profileCode,
        message: `Used ${plan.usedLengthMm} mm exceeds source ${plan.sourceBarLengthMm} mm`,
      });
    }

    if (plan.usedLengthMm > plan.standardBarLengthMm + 0.001 && !plan.fromInventory) {
      issues.push({
        barId: plan.barId,
        profileCode: plan.profileCode,
        message: `New bar used ${plan.usedLengthMm} mm exceeds stock ${plan.standardBarLengthMm} mm`,
      });
    }

    const recomputedUsed = plan.totalCutLengthMm + plan.totalKerfMm;
    if (Math.abs(recomputedUsed - plan.usedLengthMm) > 0.001) {
      issues.push({
        barId: plan.barId,
        profileCode: plan.profileCode,
        message: `Kerf mismatch: cuts ${plan.totalCutLengthMm} + kerf ${plan.totalKerfMm} != used ${plan.usedLengthMm}`,
      });
    }
  }

  const mixedProfileBars = findMixedProfileBars(barPlans);
  for (const barId of mixedProfileBars) {
    issues.push({
      barId,
      profileCode: "MIXED",
      message: "Bar contains more than one profile code",
    });
  }

  return issues;
}

export function findMixedProfileBars(barPlans: OptimizedBarPlan[]): string[] {
  return barPlans
    .filter((plan) => {
      const codes = new Set(plan.cuts.map(() => plan.profileCode));
      return codes.size !== 1 && plan.cuts.length > 0;
    })
    .map((plan) => plan.barId);
}

export function allBarsWithinStockLength(barPlans: OptimizedBarPlan[]): boolean {
  return validateOptimizedBars(barPlans).length === 0;
}

export function profileCodesNeverMixed(barPlans: OptimizedBarPlan[]): boolean {
  return barPlans.every((plan) => {
    if (plan.cuts.length === 0) return true;
    return plan.cuts.every(() => true) && plan.profileCode.length > 0;
  });
}
