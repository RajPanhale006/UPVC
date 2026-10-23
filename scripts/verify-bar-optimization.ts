import { calculateFixedFrame } from "../lib/cutting/fixed-frame/calculate-fixed-frame";
import { createDefaultFixedFrameSettings } from "../lib/cutting/fixed-frame/defaults";
import { runBarOptimizationTest } from "../lib/cutting/fixed-frame/verification";
import {
  runAllBarOptimizationTests,
  runFixedFrameSharedOptimizerParityTest,
  runJobLevelPackingExample,
} from "../lib/cutting/bar-optimization/verification";
import { DEFAULT_KERF_MM, DEFAULT_STANDARD_BAR_LENGTH_MM } from "../lib/cutting/bar-optimization/constants";
import { feetInchesToMm } from "../lib/units/conversion";

let failed = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    failed += 1;
  } else {
    console.log(`PASS: ${message}`);
  }
}

console.log("Practical 5800 mm bar optimization — Phase 1 verification\n");
console.log(`Stock length: ${DEFAULT_STANDARD_BAR_LENGTH_MM} mm | Kerf: ${DEFAULT_KERF_MM} mm\n`);

for (const test of runAllBarOptimizationTests()) {
  assert(test.ok, test.label);
  for (const msg of test.messages) {
    console.error(`  ${msg}`);
  }
}

const jobExample = runJobLevelPackingExample();
console.log("\nJob-level packing example (3 windows, 2 profile codes):");
console.log(`  New full bars required: ${jobExample.newBarsRequired}`);
console.log(`  Total kerf: ${jobExample.totalKerfMm} mm`);
console.log(`  Reusable leftover: ${jobExample.reusableLeftoverMm} mm`);
console.log(`  Scrap: ${jobExample.scrapMm} mm`);

const fixedFrameSample = runFixedFrameSharedOptimizerParityTest();
console.log("\nFixed frame shared optimizer sample:");
console.log(`  New full bars required: ${fixedFrameSample.newBarsRequired}`);
console.log(`  Total bars used (incl. inventory): ${fixedFrameSample.totalBarsUsed}`);

const widthMm = feetInchesToMm(14, 0);
const heightMm = feetInchesToMm(3, 0);
const fixedFrameJob = calculateFixedFrame({
  openingWidthMm: widthMm,
  openingHeightMm: heightMm,
  quantity: 1,
  settings: createDefaultFixedFrameSettings({
    constructionMode: "SEPARATE_MODULES",
    divisionMode: "EQUAL",
    moduleCount: 2,
  }),
  profileRatePerKg: 150,
});

assert(runBarOptimizationTest(), "Fixed frame bar plans still produced");

if (!("error" in fixedFrameJob)) {
  const newBars = fixedFrameJob.barPlans.filter((bar) => !bar.fromInventory).length;
  const inventoryBars = fixedFrameJob.barPlans.filter((bar) => bar.fromInventory).length;
  const kerfTotal = fixedFrameJob.barPlans.reduce(
    (sum, bar) => sum + Math.max(0, bar.cuts.length - 1) * DEFAULT_KERF_MM,
    0,
  );
  const reusable = fixedFrameJob.barPlans.reduce(
    (sum, bar) => sum + bar.reusableLeftoverMm,
    0,
  );
  const scrap = fixedFrameJob.barPlans.reduce((sum, bar) => sum + bar.scrapMm, 0);

  console.log("\nFixed frame 14×3 ft (2 equal modules) — shared optimizer:");
  console.log(`  Total bar plans: ${fixedFrameJob.barPlans.length}`);
  console.log(`  New full bars: ${newBars}`);
  console.log(`  From inventory: ${inventoryBars}`);
  console.log(`  Total kerf: ${kerfTotal} mm`);
  console.log(`  Reusable leftover: ${reusable} mm`);
  console.log(`  Scrap: ${scrap} mm`);

  for (const bar of fixedFrameJob.barPlans) {
    const used = bar.consumedMm;
    const limit = bar.fromInventory ? bar.barLengthMm : DEFAULT_STANDARD_BAR_LENGTH_MM;
    assert(
      used <= limit + 0.001,
      `${bar.barId} (${bar.profileCode}) used ${used} mm ≤ ${limit} mm`,
    );
  }

  const profileCodesOnBars = new Set(fixedFrameJob.barPlans.map((b) => b.profileCode));
  assert(
    fixedFrameJob.barPlans.every(
      (bar) => new Set(bar.cuts.map(() => bar.profileCode)).size === 1,
    ),
    "Fixed frame bars never mix profile codes",
  );
  console.log(`  Profile codes optimized: ${[...profileCodesOnBars].join(", ")}`);
}

console.log(failed === 0 ? "\nAll bar optimization tests passed." : `\n${failed} test(s) failed.`);
process.exit(failed === 0 ? 0 : 1);
