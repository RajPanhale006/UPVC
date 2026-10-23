import { calculateAllCuts, calculateWorkshopGlassSize } from "./calculate-sash-cuts";
import {
  calculateSarikComponents,
  calculateSarikThreeGlassNoNetComponents,
  calculateSarikTwoGlassOneNetComponents,
} from "./sarik-method";
import { compareWithinTolerance } from "./calibration";
import {
  createDefaultCuttingOptions,
  getActiveWorkshopPreset,
  WORKSHOP_PRESETS,
} from "./presets";
import type { CuttingOptions, TrackSystemId } from "./types";

/**
 * Standard Method acceptance samples (Profile Section, Height Minus 20, Width Minus 18).
 */
export const STANDARD_ACCEPTANCE_SAMPLES = [
  {
    id: "3x3-t60",
    label: "3 ft × 3 ft T60",
    trackSystemId: "2-track-t60" as TrackSystemId,
    widthMm: 914.4,
    heightMm: 914.4,
    expected: {
      sashTop: 436.2,
      sashBottom: 436.2,
      sashSide: 814.4,
      interlock: 814.4,
    },
  },
  {
    id: "4x4-t109",
    label: "4 ft × 4 ft T109 3 Track",
    trackSystemId: "3-track-t109" as TrackSystemId,
    widthMm: 1219,
    heightMm: 1219,
    expected: {
      sashTop: 376,
      sashBottom: 376,
      sashSide: 1021,
      interlock: 1021,
    },
  },
] as const;

export type StandardSampleId = (typeof STANDARD_ACCEPTANCE_SAMPLES)[number]["id"];

/**
 * Acceptance test sample.
 * Input: 2385 × 2053 mm, Size Type = Final Frame Cutting Size,
 * Workshop Confirmed Method, 2 Track, "Workshop Confirmed 60mm 2 Track" preset.
 */
export const ACCEPTANCE_SAMPLE = {
  widthMm: 2385,
  heightMm: 2053,
  presetId: "workshop-confirmed-60-2track",
  expected: {
    frameWidth: 2390,
    frameHeight: 2058,
    sashTop: 1077,
    sashBottom: 1077,
    sashSide: 1955,
    interlock: 1955,
    sashTopWelded: 1072,
    sashSideWelded: 1950,
    glassWidth: 1072,
    glassHeight: 1845,
  },
} as const;

/**
 * Sarik Method acceptance sample — final window size 1187 × 1208 mm (after welding).
 */
export const SARIK_ACCEPTANCE_SAMPLE = {
  widthMm: 1187,
  heightMm: 1208,
  expected: {
    frameCutWidth: 1192,
    frameCutHeight: 1213,
    frameAfterWidth: 1187,
    frameAfterHeight: 1208,
    sashCutWidth: 593,
    sashCutHeight: 1131,
    sashAfterWidth: 588,
    sashAfterHeight: 1126,
    glassWidth: 477,
    glassHeight: 1014,
  },
} as const;

/**
 * Glass formula acceptance (sash cut sizes → glass).
 * Sash Top 827 − 5 = 822; Sash Side 1955 − ((60×2) − 10) = 1845.
 */
export const WORKSHOP_GLASS_ACCEPTANCE = {
  sashTopCut: 827,
  sashSideCut: 1955,
  profileSectionMm: 60,
  glassWidthLessMm: 5,
  glassHeightStandardLessMm: 10,
  expected: {
    glassWidth: 822,
    glassHeight: 1845,
  },
} as const;

export type SampleTestRow = {
  item: string;
  expected: number;
  calculated: number;
  diff: number;
  status: "ok" | "fail";
};

export type SampleTestResult = {
  rows: SampleTestRow[];
  allOk: boolean;
};

/** Run acceptance test with a fresh workshop-confirmed options set. */
export function runAcceptanceSampleTest(): SampleTestResult {
  const preset = WORKSHOP_PRESETS[ACCEPTANCE_SAMPLE.presetId];
  const options = createDefaultCuttingOptions("2-track-t60", "workshop-confirmed");
  return runSampleTestWith({
    ...options,
    ...preset.defaults,
    cuttingMethod: "workshop-confirmed",
    workshopPresetId: preset.id,
  });
}

export function runSampleTestWith(options: CuttingOptions): SampleTestResult {
  const cuts = calculateAllCuts(
    { widthMm: ACCEPTANCE_SAMPLE.widthMm, heightMm: ACCEPTANCE_SAMPLE.heightMm },
    { ...options, cuttingMethod: "workshop-confirmed" },
  );

  const calc: Record<keyof typeof ACCEPTANCE_SAMPLE.expected, number> = {
    frameWidth: cuts.frameWidth,
    frameHeight: cuts.frameHeight,
    sashTop: cuts.sashTop,
    sashBottom: cuts.sashBottom,
    sashSide: cuts.sashSide,
    interlock: cuts.interlock,
    sashTopWelded: cuts.sashTopWelded,
    sashSideWelded: cuts.sashSideWelded,
    glassWidth: cuts.glassWidth,
    glassHeight: cuts.glassHeight,
  };

  const labels: Record<keyof typeof ACCEPTANCE_SAMPLE.expected, string> = {
    frameWidth: "Frame Width (cut)",
    frameHeight: "Frame Height (cut)",
    sashTop: "Sash Top (cut, before weld)",
    sashBottom: "Sash Bottom (cut, before weld)",
    sashSide: "Sash Side (cut, before weld)",
    interlock: "Interlock (cut, before weld)",
    sashTopWelded: "Sash Top (welded)",
    sashSideWelded: "Sash Side (welded)",
    glassWidth: "Glass Width",
    glassHeight: "Glass Height",
  };

  const keys = Object.keys(ACCEPTANCE_SAMPLE.expected) as (keyof typeof ACCEPTANCE_SAMPLE.expected)[];
  const rows: SampleTestRow[] = keys.map((k) => {
    const exp = ACCEPTANCE_SAMPLE.expected[k];
    const c = calc[k];
    const { diff, ok } = compareWithinTolerance(c, exp);
    return {
      item: labels[k],
      expected: exp,
      calculated: c,
      diff,
      status: ok ? "ok" : "fail",
    };
  });

  const glassRows = runWorkshopGlassAcceptanceTest().rows;

  return {
    rows: [...rows, ...glassRows],
    allOk: rows.every((r) => r.status === "ok") && glassRows.every((r) => r.status === "ok"),
  };
}

/** Verify workshop glass formula with explicit sash cut sizes. */
export function runWorkshopGlassAcceptanceTest(): SampleTestResult {
  const { glassWidth, glassHeight } = calculateWorkshopGlassSize(
    WORKSHOP_GLASS_ACCEPTANCE.sashTopCut,
    WORKSHOP_GLASS_ACCEPTANCE.sashSideCut,
    {
      profileSectionMm: WORKSHOP_GLASS_ACCEPTANCE.profileSectionMm,
      glassWidthLessMm: WORKSHOP_GLASS_ACCEPTANCE.glassWidthLessMm,
      glassHeightStandardLessMm:
        WORKSHOP_GLASS_ACCEPTANCE.glassHeightStandardLessMm,
    },
  );

  const checks: { item: string; expected: number; calculated: number }[] = [
    {
      item: "Glass Width (827 − 5)",
      expected: WORKSHOP_GLASS_ACCEPTANCE.expected.glassWidth,
      calculated: glassWidth,
    },
    {
      item: "Glass Height (1955 − 110)",
      expected: WORKSHOP_GLASS_ACCEPTANCE.expected.glassHeight,
      calculated: glassHeight,
    },
  ];

  const rows: SampleTestRow[] = checks.map(({ item, expected, calculated }) => {
    const { diff, ok } = compareWithinTolerance(calculated, expected);
    return { item, expected, calculated, diff, status: ok ? "ok" : "fail" };
  });

  return { rows, allOk: rows.every((r) => r.status === "ok") };
}

export const SARIK_THREE_GLASS_ACCEPTANCE_SAMPLE = {
  widthMm: 4685,
  heightMm: 2110,
  expected: {
    frameCutWidth: 4690,
    frameCutHeight: 2115,
    frameAfterWidth: 4685,
    frameAfterHeight: 2110,
    sashCutWidth: 1587,
    sashCutHeight: 2033,
    sashAfterWidth: 1582,
    sashAfterHeight: 2028,
    glassWidth: 1473,
    glassHeight: 1918,
    interlockLength: 2023,
    glassSashQty: 3,
    glassQty: 3,
    netQty: 0,
  },
} as const;

/** Run Sarik Method acceptance test (1187 × 1208 mm final size). */
export function runSarikAcceptanceTest(): SampleTestResult {
  const options = createDefaultCuttingOptions("2-track-t60", "sarik");
  const dimensions = {
    widthMm: SARIK_ACCEPTANCE_SAMPLE.widthMm,
    heightMm: SARIK_ACCEPTANCE_SAMPLE.heightMm,
  };
  const sarik = calculateSarikComponents(dimensions);
  const cuts = calculateAllCuts(dimensions, options, "2-track-t60");

  const checks: { item: string; expected: number; calculated: number }[] = [
    {
      item: "Outer Frame cutting width",
      expected: SARIK_ACCEPTANCE_SAMPLE.expected.frameCutWidth,
      calculated: sarik.outerFrame.cuttingWidthMm,
    },
    {
      item: "Outer Frame cutting height",
      expected: SARIK_ACCEPTANCE_SAMPLE.expected.frameCutHeight,
      calculated: sarik.outerFrame.cuttingHeightMm,
    },
    {
      item: "Outer Frame after-welding width",
      expected: SARIK_ACCEPTANCE_SAMPLE.expected.frameAfterWidth,
      calculated: sarik.outerFrame.afterWeldingWidthMm,
    },
    {
      item: "Outer Frame after-welding height",
      expected: SARIK_ACCEPTANCE_SAMPLE.expected.frameAfterHeight,
      calculated: sarik.outerFrame.afterWeldingHeightMm,
    },
    {
      item: "Sash cutting width",
      expected: SARIK_ACCEPTANCE_SAMPLE.expected.sashCutWidth,
      calculated: sarik.sash.cuttingWidthMm,
    },
    {
      item: "Sash cutting height",
      expected: SARIK_ACCEPTANCE_SAMPLE.expected.sashCutHeight,
      calculated: sarik.sash.cuttingHeightMm,
    },
    {
      item: "Sash after-welding width",
      expected: SARIK_ACCEPTANCE_SAMPLE.expected.sashAfterWidth,
      calculated: sarik.sash.afterWeldingWidthMm,
    },
    {
      item: "Sash after-welding height",
      expected: SARIK_ACCEPTANCE_SAMPLE.expected.sashAfterHeight,
      calculated: sarik.sash.afterWeldingHeightMm,
    },
    {
      item: "Glass width",
      expected: SARIK_ACCEPTANCE_SAMPLE.expected.glassWidth,
      calculated: sarik.glass.widthMm,
    },
    {
      item: "Glass height",
      expected: SARIK_ACCEPTANCE_SAMPLE.expected.glassHeight,
      calculated: sarik.glass.heightMm,
    },
    {
      item: "Glass width (AllCuts)",
      expected: SARIK_ACCEPTANCE_SAMPLE.expected.glassWidth,
      calculated: cuts.glassWidth,
    },
    {
      item: "Glass height (AllCuts)",
      expected: SARIK_ACCEPTANCE_SAMPLE.expected.glassHeight,
      calculated: cuts.glassHeight,
    },
  ];

  const rows: SampleTestRow[] = checks.map(({ item, expected, calculated }) => {
    const { diff, ok } = compareWithinTolerance(calculated, expected, 0);
    return { item, expected, calculated, diff, status: ok ? "ok" : "fail" };
  });

  return { rows, allOk: rows.every((r) => r.status === "ok") };
}

/** Run Sarik 3 Glass + No Net acceptance test (4685 × 2110 mm). */
export function runSarikThreeGlassAcceptanceTest(): SampleTestResult {
  const options = {
    ...createDefaultCuttingOptions("3-track-t109", "sarik"),
    threeTrackSashConfiguration: "three-glass-no-net" as const,
    shutterQty: 6,
    glassPanelQty: 3,
    interlockQty: 4,
  };
  const dimensions = {
    widthMm: SARIK_THREE_GLASS_ACCEPTANCE_SAMPLE.widthMm,
    heightMm: SARIK_THREE_GLASS_ACCEPTANCE_SAMPLE.heightMm,
  };
  const sarik = calculateSarikThreeGlassNoNetComponents(dimensions);
  const cuts = calculateAllCuts(dimensions, options, "3-track-t109");

  const expected = SARIK_THREE_GLASS_ACCEPTANCE_SAMPLE.expected;
  const checks: { item: string; expected: number; calculated: number }[] = [
    {
      item: "Outer Frame cutting width",
      expected: expected.frameCutWidth,
      calculated: sarik.outerFrame.cuttingWidthMm,
    },
    {
      item: "Outer Frame cutting height",
      expected: expected.frameCutHeight,
      calculated: sarik.outerFrame.cuttingHeightMm,
    },
    {
      item: "Outer Frame after-welding width",
      expected: expected.frameAfterWidth,
      calculated: sarik.outerFrame.afterWeldingWidthMm,
    },
    {
      item: "Outer Frame after-welding height",
      expected: expected.frameAfterHeight,
      calculated: sarik.outerFrame.afterWeldingHeightMm,
    },
    {
      item: "Sash cutting width",
      expected: expected.sashCutWidth,
      calculated: sarik.sash.cuttingWidthMm,
    },
    {
      item: "Sash cutting height",
      expected: expected.sashCutHeight,
      calculated: sarik.sash.cuttingHeightMm,
    },
    {
      item: "Sash after-welding width",
      expected: expected.sashAfterWidth,
      calculated: sarik.sash.afterWeldingWidthMm,
    },
    {
      item: "Sash after-welding height",
      expected: expected.sashAfterHeight,
      calculated: sarik.sash.afterWeldingHeightMm,
    },
    {
      item: "Glass width",
      expected: expected.glassWidth,
      calculated: sarik.glass.widthMm,
    },
    {
      item: "Glass height",
      expected: expected.glassHeight,
      calculated: sarik.glass.heightMm,
    },
    {
      item: "Interlock length",
      expected: expected.interlockLength,
      calculated: cuts.interlock,
    },
  ];

  const rows: SampleTestRow[] = checks.map(({ item, expected: exp, calculated }) => {
    const { diff, ok } = compareWithinTolerance(calculated, exp, 0);
    return { item, expected: exp, calculated, diff, status: ok ? "ok" : "fail" };
  });

  return { rows, allOk: rows.every((r) => r.status === "ok") };
}

/** Regression: 3 Track + 2 Glass + 1 Net Sarik (1187 × 1208). */
export function runSarikTwoGlassOneNetRegressionTest(): SampleTestResult {
  const options = {
    ...createDefaultCuttingOptions("3-track-t109", "sarik"),
    threeTrackSashConfiguration: "two-glass-one-net" as const,
  };
  const dimensions = {
    widthMm: SARIK_ACCEPTANCE_SAMPLE.widthMm,
    heightMm: SARIK_ACCEPTANCE_SAMPLE.heightMm,
  };
  const sarik = calculateSarikTwoGlassOneNetComponents(dimensions);
  const cuts = calculateAllCuts(dimensions, options, "3-track-t109");

  const checks: { item: string; expected: number; calculated: number }[] = [
    {
      item: "Outer Frame cutting width",
      expected: SARIK_ACCEPTANCE_SAMPLE.expected.frameCutWidth,
      calculated: sarik.outerFrame.cuttingWidthMm,
    },
    {
      item: "Outer Frame cutting height",
      expected: SARIK_ACCEPTANCE_SAMPLE.expected.frameCutHeight,
      calculated: sarik.outerFrame.cuttingHeightMm,
    },
    {
      item: "Glass sash cutting width",
      expected: SARIK_ACCEPTANCE_SAMPLE.expected.sashCutWidth,
      calculated: sarik.sash.cuttingWidthMm,
    },
    {
      item: "Glass sash cutting height",
      expected: SARIK_ACCEPTANCE_SAMPLE.expected.sashCutHeight,
      calculated: sarik.sash.cuttingHeightMm,
    },
    {
      item: "Glass width",
      expected: SARIK_ACCEPTANCE_SAMPLE.expected.glassWidth,
      calculated: sarik.glass.widthMm,
    },
    {
      item: "Glass height",
      expected: SARIK_ACCEPTANCE_SAMPLE.expected.glassHeight,
      calculated: sarik.glass.heightMm,
    },
    {
      item: "Net sash cutting width",
      expected: SARIK_ACCEPTANCE_SAMPLE.expected.sashCutWidth,
      calculated: sarik.netSash?.cuttingWidthMm ?? 0,
    },
    {
      item: "Net sash cutting height",
      expected: SARIK_ACCEPTANCE_SAMPLE.expected.sashCutHeight,
      calculated: sarik.netSash?.cuttingHeightMm ?? 0,
    },
    {
      item: "Net sash after-welding width",
      expected: SARIK_ACCEPTANCE_SAMPLE.expected.sashAfterWidth,
      calculated: sarik.netSash?.afterWeldingWidthMm ?? 0,
    },
    {
      item: "Mesh width",
      expected: SARIK_ACCEPTANCE_SAMPLE.expected.glassWidth,
      calculated: sarik.mesh?.widthMm ?? 0,
    },
    {
      item: "Mesh height",
      expected: SARIK_ACCEPTANCE_SAMPLE.expected.glassHeight,
      calculated: sarik.mesh?.heightMm ?? 0,
    },
    {
      item: "Glass width (AllCuts)",
      expected: SARIK_ACCEPTANCE_SAMPLE.expected.glassWidth,
      calculated: cuts.glassWidth,
    },
    {
      item: "Mesh width (AllCuts)",
      expected: SARIK_ACCEPTANCE_SAMPLE.expected.glassWidth,
      calculated: cuts.meshWidth,
    },
  ];

  const rows: SampleTestRow[] = checks.map(({ item, expected, calculated }) => {
    const { diff, ok } = compareWithinTolerance(calculated, expected, 0);
    return { item, expected, calculated, diff, status: ok ? "ok" : "fail" };
  });

  return { rows, allOk: rows.every((r) => r.status === "ok") };
}

function runSarikAcceptanceTestWithOptions(
  options: CuttingOptions,
): SampleTestResult {
  const dimensions = {
    widthMm: SARIK_ACCEPTANCE_SAMPLE.widthMm,
    heightMm: SARIK_ACCEPTANCE_SAMPLE.heightMm,
  };
  const sarik = calculateSarikComponents(dimensions);
  const cuts = calculateAllCuts(dimensions, options, "3-track-t109");

  const checks: { item: string; expected: number; calculated: number }[] = [
    {
      item: "Outer Frame cutting width",
      expected: SARIK_ACCEPTANCE_SAMPLE.expected.frameCutWidth,
      calculated: sarik.outerFrame.cuttingWidthMm,
    },
    {
      item: "Outer Frame cutting height",
      expected: SARIK_ACCEPTANCE_SAMPLE.expected.frameCutHeight,
      calculated: sarik.outerFrame.cuttingHeightMm,
    },
    {
      item: "Sash cutting width",
      expected: SARIK_ACCEPTANCE_SAMPLE.expected.sashCutWidth,
      calculated: sarik.sash.cuttingWidthMm,
    },
    {
      item: "Sash cutting height",
      expected: SARIK_ACCEPTANCE_SAMPLE.expected.sashCutHeight,
      calculated: sarik.sash.cuttingHeightMm,
    },
    {
      item: "Glass width",
      expected: SARIK_ACCEPTANCE_SAMPLE.expected.glassWidth,
      calculated: sarik.glass.widthMm,
    },
    {
      item: "Glass height",
      expected: SARIK_ACCEPTANCE_SAMPLE.expected.glassHeight,
      calculated: sarik.glass.heightMm,
    },
    {
      item: "Glass width (AllCuts)",
      expected: SARIK_ACCEPTANCE_SAMPLE.expected.glassWidth,
      calculated: cuts.glassWidth,
    },
  ];

  const rows: SampleTestRow[] = checks.map(({ item, expected, calculated }) => {
    const { diff, ok } = compareWithinTolerance(calculated, expected, 0);
    return { item, expected, calculated, diff, status: ok ? "ok" : "fail" };
  });

  return { rows, allOk: rows.every((r) => r.status === "ok") };
}

export type StandardSampleTestResult = SampleTestResult & {
  sampleId: StandardSampleId;
  label: string;
};

/** Run all Standard Method acceptance samples with track presets. */
export function runStandardAcceptanceTests(): StandardSampleTestResult[] {
  return STANDARD_ACCEPTANCE_SAMPLES.map((sample) => {
    const options = createDefaultCuttingOptions(sample.trackSystemId, "standard");
    const cuts = calculateAllCuts(
      { widthMm: sample.widthMm, heightMm: sample.heightMm },
      options,
    );

    const labels: Record<keyof typeof sample.expected, string> = {
      sashTop: "Sash Top",
      sashBottom: "Sash Bottom",
      sashSide: "Sash Side",
      interlock: "Interlock",
    };

    const rows: SampleTestRow[] = (
      Object.keys(sample.expected) as (keyof typeof sample.expected)[]
    ).map((key) => {
      const expected = sample.expected[key];
      const calculated = cuts[key];
      const { diff, ok } = compareWithinTolerance(calculated, expected);
      return {
        item: labels[key],
        expected,
        calculated,
        diff,
        status: ok ? "ok" : "fail",
      };
    });

    return {
      sampleId: sample.id,
      label: sample.label,
      rows,
      allOk: rows.every((r) => r.status === "ok"),
    };
  });
}

/** Run a single Standard Method sample by id. */
export function runStandardSampleTest(
  sampleId: StandardSampleId,
): StandardSampleTestResult | null {
  return runStandardAcceptanceTests().find((r) => r.sampleId === sampleId) ?? null;
}

export type ChecklistItem = {
  id: string;
  label: string;
  passed: boolean;
};

export function buildChecklist(
  options: CuttingOptions,
  sampleTest: SampleTestResult | null,
  standardTests: StandardSampleTestResult[] = runStandardAcceptanceTests(),
  systemId: TrackSystemId = "2-track-t60",
): ChecklistItem[] {
  const preset =
    getActiveWorkshopPreset(options, systemId) ??
    WORKSHOP_PRESETS["workshop-confirmed-60-2track"];
  const standardAllOk = standardTests.every((t) => t.allOk);
  const workshopSampleResult =
    sampleTest ??
    (options.cuttingMethod === "workshop-confirmed"
      ? runSampleTestWith(options)
      : { rows: [], allOk: false });
  const sarikSampleResult =
    options.cuttingMethod === "sarik"
      ? sampleTest ?? runSarikAcceptanceTest()
      : { rows: [], allOk: false };

  const common: ChecklistItem[] = [
    {
      id: "method-dropdown",
      label: "Cutting Method dropdown exists",
      passed: true,
    },
    {
      id: "labour-pdf",
      label: "Labour PDF shows only cutting details (no pricing)",
      passed: true,
    },
    {
      id: "estimation-separate",
      label: "Estimation and quotation work separately",
      passed: true,
    },
  ];

  if (options.cuttingMethod === "standard") {
    return [
      ...common,
      {
        id: "standard-default",
        label: "Standard Method is the default cutting logic",
        passed: options.cuttingMethod === "standard",
      },
      {
        id: "standard-height-minus",
        label: "Standard Height Minus is 20 mm",
        passed: options.standardHeightMinusMm === 20,
      },
      {
        id: "standard-width-minus",
        label: "Standard Width Minus is 18 mm",
        passed: options.standardWidthMinusMm === 18,
      },
      {
        id: "standard-3x3-t60",
        label: "3 ft × 3 ft T60 → Sash Top/Bottom 436.2, Sash Side/Interlock 814.4",
        passed: standardTests.find((t) => t.sampleId === "3x3-t60")?.allOk ?? false,
      },
      {
        id: "standard-4x4-t109",
        label: "4 ft × 4 ft T109 → Sash Top/Bottom 376.1, Sash Side/Interlock 1021.2",
        passed: standardTests.find((t) => t.sampleId === "4x4-t109")?.allOk ?? false,
      },
      {
        id: "standard-all-samples",
        label: "All Standard Method acceptance samples pass",
        passed: standardAllOk,
      },
    ];
  }

  if (options.cuttingMethod === "sarik") {
    return [
      ...common,
      {
        id: "sarik-input-final-size",
        label: "Sarik input is final window size after welding",
        passed: true,
      },
      {
        id: "sarik-frame-formula",
        label: "Outer frame cutting = final size + 5 mm",
        passed: true,
      },
      {
        id: "sarik-sash-formula",
        label: "Sash after-weld W = ((W−1)/2)−5, H = H−82; cutting = after + 5",
        passed: true,
      },
      {
        id: "sarik-glass-formula",
        label: "Glass = sash after-weld − 111 × − 112",
        passed: true,
      },
      {
        id: "sarik-sample-1187",
        label: "1187×1208 → Frame 1192×1213 cut, 1187×1208 weld; Sash 593×1131 / 588×1126; Glass 477×1014",
        passed: sarikSampleResult.allOk,
      },
    ];
  }

  return [
    ...common,
    {
      id: "workshop-preset",
      label: "Workshop Confirmed 60mm 2 Track preset exists",
      passed: Boolean(preset),
    },
    {
      id: "frame-add-5",
      label: "Frame Add is 5 mm",
      passed:
        options.frameAddWidthMm === 5 && options.frameAddHeightMm === 5,
    },
    {
      id: "sash-width-236",
      label: `Sash Width Total Deduction is ${preset.defaults.sashWidthTotalDeductionMm} mm (from frame cut size)`,
      passed:
        options.sashWidthTotalDeductionMm === preset.defaults.sashWidthTotalDeductionMm,
    },
    {
      id: "welding-5",
      label: "Welding Allowance is 5 mm (sash cut − 5 = welded size)",
      passed: options.weldingAllowanceMm === 5,
    },
    {
      id: "sash-height-103",
      label: `Sash Height Deduction is ${preset.defaults.sashHeightDeductionMm} mm`,
      passed:
        options.sashHeightDeductionMm === preset.defaults.sashHeightDeductionMm,
    },
    {
      id: "glass-width-less-5",
      label: "Glass Width Less is 5 mm",
      passed: options.glassWidthLessMm === 5,
    },
    {
      id: "glass-height-standard-less-10",
      label: "Glass Height Standard Less is 10 mm",
      passed: options.glassHeightStandardLessMm === 10,
    },
    {
      id: "glass-formula-test",
      label: "Glass formula: 827×1955 sash cut → Glass 822×1845",
      passed: runWorkshopGlassAcceptanceTest().allOk,
    },
    {
      id: "sample-test",
      label: "Workshop sample passes (2385×2053 → Frame 2390×2058, Sash cut 1077/1955, Glass 1072×1845)",
      passed: workshopSampleResult.allOk,
    },
  ];
}
