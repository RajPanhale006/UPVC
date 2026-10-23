import {
  DEFAULT_KERF_MM,
  DEFAULT_MINIMUM_REUSABLE_LENGTH_MM,
  DEFAULT_STANDARD_BAR_LENGTH_MM,
} from "./constants";
import {
  buildFixedFrameOptimizationConfig,
  optimizeFixedFrameBarCuts,
} from "./adapters";
import { optimizeJobBarCuts } from "./optimize-job";
import type { BarOptimizationConfig, CutPiece } from "./types";
import {
  allBarsWithinStockLength,
  profileCodesNeverMixed,
  validateOptimizedBars,
} from "./validate";

export type BarOptimizationTestResult = {
  label: string;
  ok: boolean;
  messages: string[];
};

function assertBarLimits(
  barPlans: ReturnType<typeof optimizeJobBarCuts>["barPlans"],
  stockLengthMm: number,
): string[] {
  const messages: string[] = [];
  for (const plan of barPlans) {
    if (plan.usedLengthMm > plan.sourceBarLengthMm + 0.001) {
      messages.push(
        `${plan.barId}: used ${plan.usedLengthMm} mm > source ${plan.sourceBarLengthMm} mm`,
      );
    }
    if (!plan.fromInventory && plan.usedLengthMm > stockLengthMm + 0.001) {
      messages.push(
        `${plan.barId}: new bar used ${plan.usedLengthMm} mm > stock ${stockLengthMm} mm`,
      );
    }
  }
  return messages;
}

export function runStockLengthValidationTest(): BarOptimizationTestResult {
  const pieces: CutPiece[] = [
    {
      id: "w1-f-h",
      windowRef: "W01",
      componentType: "FRAME",
      profileCode: "T109-600",
      lengthMm: 2147,
      quantity: 1,
    },
    {
      id: "w1-f-v",
      windowRef: "W01",
      componentType: "FRAME",
      profileCode: "T109-600",
      lengthMm: 1790,
      quantity: 1,
    },
    {
      id: "w2-f-v",
      windowRef: "W02",
      componentType: "FRAME",
      profileCode: "T109-600",
      lengthMm: 1782,
      quantity: 1,
    },
  ];

  const config: BarOptimizationConfig = {
    standardBarLengthMm: DEFAULT_STANDARD_BAR_LENGTH_MM,
    kerfMm: DEFAULT_KERF_MM,
    minimumReusableLengthMm: DEFAULT_MINIMUM_REUSABLE_LENGTH_MM,
  };

  const result = optimizeJobBarCuts({ cutPieces: pieces, config });
  const issues = validateOptimizedBars(result.barPlans);
  const limitIssues = assertBarLimits(result.barPlans, DEFAULT_STANDARD_BAR_LENGTH_MM);

  return {
    label: "No optimized bar exceeds stock length including kerf",
    ok:
      issues.length === 0 &&
      limitIssues.length === 0 &&
      allBarsWithinStockLength(result.barPlans),
    messages: [...issues.map((i) => i.message), ...limitIssues],
  };
}

export function runProfileIsolationTest(): BarOptimizationTestResult {
  const pieces: CutPiece[] = [
    {
      id: "a",
      componentType: "FRAME",
      profileCode: "T109-600",
      lengthMm: 2000,
      quantity: 2,
    },
    {
      id: "b",
      componentType: "SASH",
      profileCode: "T60-051",
      lengthMm: 1500,
      quantity: 2,
    },
  ];

  const result = optimizeJobBarCuts({
    cutPieces: pieces,
    config: {
      standardBarLengthMm: DEFAULT_STANDARD_BAR_LENGTH_MM,
      kerfMm: DEFAULT_KERF_MM,
      minimumReusableLengthMm: DEFAULT_MINIMUM_REUSABLE_LENGTH_MM,
    },
  });

  const messages: string[] = [];
  for (const plan of result.barPlans) {
    const uniqueCodes = new Set(
      plan.cuts.map(() => plan.profileCode),
    );
    if (uniqueCodes.size !== 1) {
      messages.push(`${plan.barId} mixes profile codes`);
    }
  }

  const profileCodes = new Set(result.barPlans.map((p) => p.profileCode));
  const summaries = new Set(result.profileSummaries.map((s) => s.profileCode));

  return {
    label: "Different profile codes are never mixed on one bar",
    ok:
      messages.length === 0 &&
      profileCodesNeverMixed(result.barPlans) &&
      profileCodes.size === 2 &&
      summaries.size === 2,
    messages,
  };
}

export function runPracticalVsTheoreticalBarsTest(): BarOptimizationTestResult {
  const pieces: CutPiece[] = [
    {
      id: "long",
      componentType: "FRAME",
      profileCode: "T109-600",
      lengthMm: 3000,
      quantity: 3,
    },
  ];

  const netMm = 3000 * 3;
  const theoreticalBars = Math.ceil(netMm / DEFAULT_STANDARD_BAR_LENGTH_MM);

  const result = optimizeJobBarCuts({
    cutPieces: pieces,
    config: {
      standardBarLengthMm: DEFAULT_STANDARD_BAR_LENGTH_MM,
      kerfMm: DEFAULT_KERF_MM,
      minimumReusableLengthMm: DEFAULT_MINIMUM_REUSABLE_LENGTH_MM,
    },
  });

  const summary = result.profileSummaries[0]!;
  const messages: string[] = [];

  if (theoreticalBars !== 2) {
    messages.push(`Test fixture expects theoretical 2 bars, got ${theoreticalBars}`);
  }

  if (summary.newBarsRequired <= theoreticalBars) {
    messages.push(
      `Practical bars (${summary.newBarsRequired}) must exceed naive theoretical (${theoreticalBars})`,
    );
  }

  return {
    label: "Practical bar count differs from totalLength / 5800",
    ok: messages.length === 0 && summary.newBarsRequired === 3,
    messages,
  };
}

export function runLeftoverClassificationTest(): BarOptimizationTestResult {
  const pieces: CutPiece[] = [
    {
      id: "single",
      componentType: "FRAME",
      profileCode: "T109-600",
      lengthMm: 5400,
      quantity: 1,
    },
  ];

  const result = optimizeJobBarCuts({
    cutPieces: pieces,
    config: {
      standardBarLengthMm: DEFAULT_STANDARD_BAR_LENGTH_MM,
      kerfMm: DEFAULT_KERF_MM,
      minimumReusableLengthMm: 300,
    },
  });

  const plan = result.barPlans[0]!;
  const messages: string[] = [];

  if (plan.reusableLeftoverMm < 300 && plan.scrapMm <= 0) {
    messages.push("Expected scrap or reusable leftover classification");
  }
  if (plan.reusableLeftoverMm > 0 && plan.leftoverStatus !== "REUSABLE_LEFTOVER") {
    messages.push("Reusable leftover status incorrect");
  }
  if (plan.scrapMm > 0 && plan.reusableLeftoverMm > 0 && plan.remainingLengthMm !== plan.reusableLeftoverMm + plan.scrapMm) {
    messages.push("Scrap + reusable must equal remaining length");
  }

  return {
    label: "Reusable leftover classified separately from scrap",
    ok: messages.length === 0 && plan.remainingLengthMm === 400,
    messages,
  };
}

export function runInventoryFirstTest(): BarOptimizationTestResult {
  const pieces: CutPiece[] = [
    {
      id: "cut",
      componentType: "FRAME",
      profileCode: "T109-600",
      lengthMm: 1200,
      quantity: 1,
    },
  ];

  const withoutInventory = optimizeJobBarCuts({
    cutPieces: pieces,
    config: {
      standardBarLengthMm: DEFAULT_STANDARD_BAR_LENGTH_MM,
      kerfMm: DEFAULT_KERF_MM,
      minimumReusableLengthMm: 300,
    },
  });

  const withInventory = optimizeJobBarCuts({
    cutPieces: pieces,
    config: {
      standardBarLengthMm: DEFAULT_STANDARD_BAR_LENGTH_MM,
      kerfMm: DEFAULT_KERF_MM,
      minimumReusableLengthMm: 300,
      savedLeftoverInventoryByProfile: {
        "T109-600": [2000],
      },
    },
  });

  const messages: string[] = [];
  const newWithout = withoutInventory.profileSummaries[0]?.newBarsRequired ?? 0;
  const newWith = withInventory.profileSummaries[0]?.newBarsRequired ?? 0;
  const inventoryUsed = withInventory.profileSummaries[0]?.inventoryBarsConsumed ?? 0;

  if (newWith !== 0) {
    messages.push(`Expected 0 new bars when leftover fits cut, got ${newWith}`);
  }
  if (newWithout !== 1) {
    messages.push(`Expected 1 new bar without inventory, got ${newWithout}`);
  }
  if (inventoryUsed !== 1) {
    messages.push(`Expected 1 inventory bar consumed, got ${inventoryUsed}`);
  }

  return {
    label: "Compatible leftover inventory used before opening new bars",
    ok: messages.length === 0,
    messages,
  };
}

export function runPurchaseCostTest(): BarOptimizationTestResult {
  const pieces: CutPiece[] = [
    {
      id: "cut",
      componentType: "FRAME",
      profileCode: "T109-600",
      lengthMm: 5000,
      quantity: 1,
    },
  ];

  const weightKgPerMetre = 0.5;
  const ratePerKg = 134;

  const result = optimizeJobBarCuts({
    cutPieces: pieces,
    config: {
      standardBarLengthMm: DEFAULT_STANDARD_BAR_LENGTH_MM,
      kerfMm: DEFAULT_KERF_MM,
      minimumReusableLengthMm: 300,
    },
    defaultWeightKgPerMetre: weightKgPerMetre,
    defaultRatePerKg: ratePerKg,
  });

  const summary = result.profileSummaries[0]!;
  const expectedPurchaseKg = (5800 / 1000) * weightKgPerMetre;
  const expectedCost = Math.round(expectedPurchaseKg * ratePerKg * 100) / 100;
  const consumedCost =
    Math.round(((5000 / 1000) * weightKgPerMetre * ratePerKg) * 100) / 100;

  const messages: string[] = [];
  if (summary.purchaseWeightKg !== expectedPurchaseKg) {
    messages.push(
      `Purchase weight expected ${expectedPurchaseKg}, got ${summary.purchaseWeightKg}`,
    );
  }
  if (summary.profileCost !== expectedCost) {
    messages.push(`Profile cost expected ${expectedCost}, got ${summary.profileCost}`);
  }
  if (summary.profileCost === consumedCost) {
    messages.push("Cost must not be based on consumed net length alone");
  }

  return {
    label: "Profile cost based on new full bars purchased",
    ok: messages.length === 0,
    messages,
  };
}

export function runJobLevelPackingExample(): BarOptimizationTestResult & {
  newBarsRequired: number;
  totalKerfMm: number;
  reusableLeftoverMm: number;
  scrapMm: number;
} {
  const pieces: CutPiece[] = [
    {
      id: "w1-h",
      windowRef: "Window 01",
      componentType: "FRAME",
      profileCode: "T109-600",
      lengthMm: 2147,
      quantity: 1,
      sourceSystem: "window",
    },
    {
      id: "w1-v",
      windowRef: "Window 01",
      componentType: "FRAME",
      profileCode: "T109-600",
      lengthMm: 1790,
      quantity: 1,
      sourceSystem: "window",
    },
    {
      id: "w2-h",
      windowRef: "Window 02",
      componentType: "FRAME",
      profileCode: "T109-600",
      lengthMm: 1782,
      quantity: 1,
      sourceSystem: "window",
    },
    {
      id: "w3-sash",
      windowRef: "Window 03",
      componentType: "GLASS_SASH",
      profileCode: "T60-051",
      lengthMm: 1131,
      quantity: 4,
      sourceSystem: "window",
    },
  ];

  const result = optimizeJobBarCuts({
    cutPieces: pieces,
    config: {
      standardBarLengthMm: DEFAULT_STANDARD_BAR_LENGTH_MM,
      kerfMm: DEFAULT_KERF_MM,
      minimumReusableLengthMm: DEFAULT_MINIMUM_REUSABLE_LENGTH_MM,
    },
  });

  const frameSummary = result.profileSummaries.find((s) => s.profileCode === "T109-600");
  const sashSummary = result.profileSummaries.find((s) => s.profileCode === "T60-051");
  const messages: string[] = [];

  if (!frameSummary || frameSummary.newBarsRequired < 1) {
    messages.push("Expected frame profile to require at least one new bar");
  }
  if (!sashSummary || sashSummary.newBarsRequired < 1) {
    messages.push("Expected sash profile to require at least one new bar");
  }

  const frameBars = result.barPlans.filter((b) => b.profileCode === "T109-600");
  const packedAcrossWindows =
    frameBars.some((bar) => bar.cuts.some((c) => c.windowRef === "Window 01")) &&
    frameBars.some((bar) => bar.cuts.some((c) => c.windowRef === "Window 02"));

  if (!packedAcrossWindows) {
    messages.push("Job-level packing should combine cuts from multiple windows on one bar when possible");
  }

  return {
    label: "Job-level packing combines windows per profile code",
    ok: messages.length === 0 && allBarsWithinStockLength(result.barPlans),
    messages,
    newBarsRequired:
      (frameSummary?.newBarsRequired ?? 0) + (sashSummary?.newBarsRequired ?? 0),
    totalKerfMm: result.profileSummaries.reduce((s, r) => s + r.totalKerfMm, 0),
    reusableLeftoverMm: result.profileSummaries.reduce(
      (s, r) => s + r.reusableLeftoverMm,
      0,
    ),
    scrapMm: result.profileSummaries.reduce((s, r) => s + r.scrapMm, 0),
  };
}

export function runFixedFrameSharedOptimizerParityTest(): BarOptimizationTestResult & {
  newBarsRequired: number;
  totalBarsUsed: number;
} {
  const framePieces = [
    {
      id: "ff-1",
      moduleId: "m1",
      moduleLabel: "Module 1",
      profileCode: "P60A-052",
      profileKey: "casement-frame" as const,
      component: "Frame Top",
      lengthMm: 3500,
      quantity: 2,
      angle: "45°",
    },
    {
      id: "ff-2",
      moduleId: "m1",
      moduleLabel: "Module 1",
      profileCode: "P60A-059",
      profileKey: "gb36-beading" as const,
      component: "Bead Vertical",
      lengthMm: 900,
      quantity: 4,
      angle: "90°",
    },
  ];

  const config = buildFixedFrameOptimizationConfig({
    standardBarLengthMm: DEFAULT_STANDARD_BAR_LENGTH_MM,
    kerfMm: DEFAULT_KERF_MM,
    minimumReusableLengthMm: DEFAULT_MINIMUM_REUSABLE_LENGTH_MM,
    savedLeftoverInventoryMm: [],
    frameProfileCode: "P60A-052",
  });

  const result = optimizeFixedFrameBarCuts(framePieces, config);
  const messages = assertBarLimits(result.barPlans, DEFAULT_STANDARD_BAR_LENGTH_MM);

  const newBarsRequired = result.profileSummaries.reduce(
    (s, r) => s + r.newBarsRequired,
    0,
  );
  const totalBarsUsed = result.profileSummaries.reduce(
    (s, r) => s + r.totalBarsUsed,
    0,
  );

  return {
    label: "Fixed frame uses shared job-level optimizer",
    ok: messages.length === 0 && newBarsRequired > 0,
    messages,
    newBarsRequired,
    totalBarsUsed,
  };
}

export function runAllBarOptimizationTests(): BarOptimizationTestResult[] {
  return [
    runStockLengthValidationTest(),
    runProfileIsolationTest(),
    runPracticalVsTheoreticalBarsTest(),
    runLeftoverClassificationTest(),
    runInventoryFirstTest(),
    runPurchaseCostTest(),
    runJobLevelPackingExample(),
    runFixedFrameSharedOptimizerParityTest(),
  ];
}
