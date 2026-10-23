import { mmAreaToSqFt } from "@/lib/calculations/format";
import { feetInchesToMm } from "@/lib/units/conversion";

import { calculateFixedFrame } from "./calculate-fixed-frame";
import { createDefaultFixedFrameSettings } from "./defaults";
import type { FixedFrameSettings } from "./types";

export type FixedFrameAcceptanceSample = {
  label: string;
  widthFeet: number;
  widthInches: number;
  heightFeet: number;
  heightInches: number;
  quantity: number;
  settings: Partial<FixedFrameSettings>;
  expected: {
    moduleCount: number;
    totalGrossAreaSqFt?: number;
    sashHeight?: number;
    firstModuleWidthMm?: number;
    totalModulesAcrossQuantity?: number;
  };
};

function runSample(
  sample: FixedFrameAcceptanceSample,
): { label: string; ok: boolean; messages: string[] } {
  const widthMm = feetInchesToMm(sample.widthFeet, sample.widthInches);
  const heightMm = feetInchesToMm(sample.heightFeet, sample.heightInches);
  const settings = createDefaultFixedFrameSettings(sample.settings);
  const result = calculateFixedFrame({
    openingWidthMm: widthMm,
    openingHeightMm: heightMm,
    quantity: sample.quantity,
    settings,
    profileRatePerKg: 150,
  });

  const messages: string[] = [];
  if ("error" in result) {
    return { label: sample.label, ok: false, messages: [result.error] };
  }

  let ok = true;
  if (result.moduleCount !== sample.expected.moduleCount) {
    ok = false;
    messages.push(
      `moduleCount expected ${sample.expected.moduleCount}, got ${result.moduleCount}`,
    );
  }
  if (sample.expected.totalGrossAreaSqFt != null) {
    const diff = Math.abs(result.totalGrossAreaSqFt - sample.expected.totalGrossAreaSqFt);
    if (diff > 0.5) {
      ok = false;
      messages.push(
        `totalGrossAreaSqFt expected ${sample.expected.totalGrossAreaSqFt}, got ${result.totalGrossAreaSqFt}`,
      );
    }
  }
  if (sample.expected.firstModuleWidthMm != null && result.modules[0]) {
    const diff = Math.abs(result.modules[0].widthMm - sample.expected.firstModuleWidthMm);
    if (diff > 2) {
      ok = false;
      messages.push(
        `first module width expected ${sample.expected.firstModuleWidthMm}, got ${result.modules[0].widthMm}`,
      );
    }
  }
  if (sample.expected.totalModulesAcrossQuantity != null) {
    const total = result.moduleCount * sample.quantity;
    if (total !== sample.expected.totalModulesAcrossQuantity) {
      ok = false;
      messages.push(
        `total modules expected ${sample.expected.totalModulesAcrossQuantity}, got ${total}`,
      );
    }
  }

  if (result.glassPanels.some((g) => g.widthMm <= 0 || g.heightMm <= 0)) {
    ok = false;
    messages.push("glass size zero or negative");
  }

  return { label: sample.label, ok, messages };
}

export function runAllFixedFrameAcceptanceTests(): ReturnType<typeof runSample>[] {
  const samples: FixedFrameAcceptanceSample[] = [
    {
      label: "Single frame 4×4 ft",
      widthFeet: 4,
      widthInches: 0,
      heightFeet: 4,
      heightInches: 0,
      quantity: 1,
      settings: {
        constructionMode: "SINGLE_FRAME",
        divisionMode: "NONE",
        moduleCount: 1,
      },
      expected: { moduleCount: 1 },
    },
    {
      label: "Two equal modules 14×3 ft",
      widthFeet: 14,
      widthInches: 0,
      heightFeet: 3,
      heightInches: 0,
      quantity: 1,
      settings: {
        constructionMode: "SEPARATE_MODULES",
        divisionMode: "EQUAL",
        moduleCount: 2,
      },
      expected: { moduleCount: 2 },
    },
    {
      label: "Three equal modules AUTO",
      widthFeet: 18,
      widthInches: 0,
      heightFeet: 3,
      heightInches: 0,
      quantity: 1,
      settings: {
        constructionMode: "SEPARATE_MODULES",
        divisionMode: "AUTO",
        maximumModuleWidthMm: feetInchesToMm(7, 0),
      },
      expected: { moduleCount: 3 },
    },
    {
      label: "Internal partitions 2 sections",
      widthFeet: 8,
      widthInches: 0,
      heightFeet: 4,
      heightInches: 0,
      quantity: 1,
      settings: {
        constructionMode: "INTERNAL_PARTITIONS",
        sectionCount: 2,
      },
      expected: { moduleCount: 2 },
    },
    {
      label: "Ahilyanagar group 1",
      widthFeet: 14,
      widthInches: 0,
      heightFeet: 3,
      heightInches: 0,
      quantity: 8,
      settings: {
        constructionMode: "SEPARATE_MODULES",
        divisionMode: "EQUAL",
        moduleCount: 2,
        glassThicknessMm: 6,
      },
      expected: {
        moduleCount: 2,
        totalGrossAreaSqFt: 336,
        totalModulesAcrossQuantity: 16,
      },
    },
    {
      label: "Ahilyanagar group 2",
      widthFeet: 14,
      widthInches: 0,
      heightFeet: 3,
      heightInches: 6,
      quantity: 1,
      settings: {
        constructionMode: "SEPARATE_MODULES",
        divisionMode: "EQUAL",
        moduleCount: 2,
        glassThicknessMm: 6,
      },
      expected: {
        moduleCount: 2,
        totalGrossAreaSqFt: 49,
      },
    },
  ];

  return samples.map(runSample);
}

export function runAhilyanagarCombinedTest(): {
  ok: boolean;
  totalOpenings: number;
  totalModules: number;
  totalGrossAreaSqFt: number;
  messages: string[];
} {
  const g1 = calculateFixedFrame({
    openingWidthMm: feetInchesToMm(14, 0),
    openingHeightMm: feetInchesToMm(3, 0),
    quantity: 8,
    settings: createDefaultFixedFrameSettings({
      constructionMode: "SEPARATE_MODULES",
      divisionMode: "EQUAL",
      moduleCount: 2,
      glassThicknessMm: 6,
    }),
    profileRatePerKg: 150,
  });
  const g2 = calculateFixedFrame({
    openingWidthMm: feetInchesToMm(14, 0),
    openingHeightMm: feetInchesToMm(3, 6),
    quantity: 1,
    settings: createDefaultFixedFrameSettings({
      constructionMode: "SEPARATE_MODULES",
      divisionMode: "EQUAL",
      moduleCount: 2,
      glassThicknessMm: 6,
    }),
    profileRatePerKg: 150,
  });

  const messages: string[] = [];
  if ("error" in g1) messages.push(g1.error);
  if ("error" in g2) messages.push(g2.error);
  if ("error" in g1 || "error" in g2) {
    return {
      ok: false,
      totalOpenings: 0,
      totalModules: 0,
      totalGrossAreaSqFt: 0,
      messages,
    };
  }

  const totalOpenings = g1.quantity + g2.quantity;
  const totalModules = g1.moduleCount * g1.quantity + g2.moduleCount * g2.quantity;
  const totalGrossAreaSqFt = g1.totalGrossAreaSqFt + g2.totalGrossAreaSqFt;

  let ok = true;
  if (totalOpenings !== 9) {
    ok = false;
    messages.push(`total openings expected 9, got ${totalOpenings}`);
  }
  if (totalModules !== 18) {
    ok = false;
    messages.push(`total modules expected 18, got ${totalModules}`);
  }
  if (Math.abs(totalGrossAreaSqFt - 385) > 0.5) {
    ok = false;
    messages.push(`total gross area expected 385, got ${totalGrossAreaSqFt}`);
  }

  return { ok, totalOpenings, totalModules, totalGrossAreaSqFt, messages };
}

export function runManualModuleWidthValidationTest(): boolean {
  const widthMm = feetInchesToMm(14, 0);
  const result = calculateFixedFrame({
    openingWidthMm: widthMm,
    openingHeightMm: feetInchesToMm(3, 0),
    quantity: 1,
    settings: createDefaultFixedFrameSettings({
      constructionMode: "SEPARATE_MODULES",
      divisionMode: "MANUAL",
      moduleCount: 2,
      moduleWidthsMm: [1000, 1000],
    }),
    profileRatePerKg: 150,
  });
  return "error" in result;
}

export function runReinforcementRulesTest(): boolean {
  const base = {
    openingWidthMm: feetInchesToMm(4, 0),
    openingHeightMm: feetInchesToMm(4, 0),
    quantity: 1,
    profileRatePerKg: 150,
  };
  const none = calculateFixedFrame({
    ...base,
    settings: createDefaultFixedFrameSettings({
      constructionMode: "SINGLE_FRAME",
      divisionMode: "NONE",
      reinforcementRule: "NONE",
    }),
  });
  const full = calculateFixedFrame({
    ...base,
    settings: createDefaultFixedFrameSettings({
      constructionMode: "SINGLE_FRAME",
      divisionMode: "NONE",
      reinforcementRule: "FULL_PERIMETER",
    }),
  });
  if ("error" in none || "error" in full) return false;
  return (
    none.totalReinforcementLengthMm === 0 && full.totalReinforcementLengthMm > 0
  );
}

export function runWorkshopCostPerSqFtTest(): boolean {
  const result = calculateFixedFrame({
    openingWidthMm: feetInchesToMm(4, 0),
    openingHeightMm: feetInchesToMm(4, 0),
    quantity: 1,
    settings: createDefaultFixedFrameSettings({
      constructionMode: "SINGLE_FRAME",
      divisionMode: "NONE",
      labourRatePerSqFt: 50,
    }),
    profileRatePerKg: 150,
  });
  if ("error" in result) return false;
  const expected = mmAreaToSqFt(feetInchesToMm(4, 0), feetInchesToMm(4, 0));
  const areaOk = Math.abs(result.grossAreaSqFt - expected) < 0.02;
  const perSqFtOk =
    result.totalGrossAreaSqFt > 0 &&
    Math.abs(
      result.workshopCost.workshopCostPerSqFt -
        result.workshopCost.totalWorkshopCost / result.totalGrossAreaSqFt,
    ) < 0.02;
  return areaOk && perSqFtOk && result.workshopCost.totalWorkshopCost > 0;
}

export function runBarOptimizationTest(): boolean {
  const result = calculateFixedFrame({
    openingWidthMm: feetInchesToMm(14, 0),
    openingHeightMm: feetInchesToMm(3, 0),
    quantity: 1,
    settings: createDefaultFixedFrameSettings({
      constructionMode: "SEPARATE_MODULES",
      divisionMode: "EQUAL",
      moduleCount: 2,
    }),
    profileRatePerKg: 150,
  });
  if ("error" in result) return false;
  return result.barPlans.length > 0 && result.barPlans.every((b) => b.cuts.length > 0);
}
