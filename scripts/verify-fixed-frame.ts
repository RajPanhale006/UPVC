import { calculateFixedFrame } from "../lib/cutting/fixed-frame/calculate-fixed-frame";
import { createDefaultFixedFrameSettings } from "../lib/cutting/fixed-frame/defaults";
import { getFixedFrameProfileDeductions } from "../lib/cutting/fixed-frame/profile-deductions";
import {
  runAhilyanagarCombinedTest,
  runAllFixedFrameAcceptanceTests,
  runBarOptimizationTest,
  runManualModuleWidthValidationTest,
  runReinforcementRulesTest,
  runWorkshopCostPerSqFtTest,
} from "../lib/cutting/fixed-frame/verification";
import { calculateProduct } from "../lib/calculations";
import { getDefaultEstimationInputs, isFixedFrameProduct } from "../lib/estimation";
import { getDefaultProfileRateSettings } from "../lib/profiles";
import { createDefaultCuttingOptions } from "../lib/cutting";
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

console.log("Fixed UPVC Partition Frame — verification\n");

for (const test of runAllFixedFrameAcceptanceTests()) {
  assert(test.ok, test.label);
  for (const msg of test.messages) {
    console.error(`  ${msg}`);
  }
}

const ahilyanagar = runAhilyanagarCombinedTest();
assert(ahilyanagar.ok, "Ahilyanagar combined (9 openings, 18 modules, 385 sq.ft)");
for (const msg of ahilyanagar.messages) {
  console.error(`  ${msg}`);
}
console.log(
  `  Openings: ${ahilyanagar.totalOpenings}, modules: ${ahilyanagar.totalModules}, area: ${ahilyanagar.totalGrossAreaSqFt} sq.ft`,
);

assert(runManualModuleWidthValidationTest(), "Invalid manual module width total rejected");
assert(runReinforcementRulesTest(), "Reinforcement rules NONE vs FULL_PERIMETER");
assert(runWorkshopCostPerSqFtTest(), "Workshop cost per sq.ft formula");
assert(runBarOptimizationTest(), "Bar optimization produces cut plans");

const deductions = getFixedFrameProfileDeductions(
  "casement-frame",
  "gb36-beading",
  6,
);
assert(deductions.glassWidthDeductionMm > 0, "Profile-specific glass width deduction");
assert(deductions.glassHeightDeductionMm > 0, "Profile-specific glass height deduction");

const widthMm = feetInchesToMm(14, 0);
const heightMm = feetInchesToMm(3, 0);
const separate = calculateFixedFrame({
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
assert(!("error" in separate), "Two equal modules 14×3 ft");
if (!("error" in separate)) {
  assert(separate.moduleCount === 2, "Module count is 2");
  assert(
    Math.abs(separate.modules[0]!.widthMm - separate.modules[1]!.widthMm) <= 1,
    "Equal module widths (±1 mm rounding)",
  );
  assert(separate.totalMullionLengthMm === 0, "No mullion in SEPARATE_MODULES");
}

const internal = calculateFixedFrame({
  openingWidthMm: feetInchesToMm(8, 0),
  openingHeightMm: feetInchesToMm(4, 0),
  quantity: 1,
  settings: createDefaultFixedFrameSettings({
    constructionMode: "INTERNAL_PARTITIONS",
    sectionCount: 2,
  }),
  profileRatePerKg: 150,
});
assert(!("error" in internal), "Internal partitions 2 sections");
if (!("error" in internal)) {
  assert(internal.totalMullionLengthMm > 0, "Mullion length for internal partitions");
}

const inputs = {
  ...getDefaultEstimationInputs(),
  productKind: "fixed-frame" as const,
  widthFeet: 14,
  widthInches: 0,
  heightFeet: 3,
  heightInches: 0,
  numberOfWindows: 1,
  fixedFrameSettings: createDefaultFixedFrameSettings({
    constructionMode: "SEPARATE_MODULES",
    divisionMode: "EQUAL",
    moduleCount: 2,
    glassThicknessMm: 6,
  }),
};
assert(isFixedFrameProduct(inputs), "Product kind fixed-frame detected");

const product = calculateProduct({
  estimationInputs: inputs,
  cuttingOptions: createDefaultCuttingOptions("2-track-t60", "sarik"),
  profileRates: getDefaultProfileRateSettings(),
  cuttingJobMeta: { jobName: "FF-01", jobNotes: "", windowLocation: "Ahilyanagar" },
});
assert(product.validation.isValid, "calculateProduct fixed-frame validates");
assert(product.fixedFrame?.cutting != null, "calculateProduct returns fixed frame cutting");
assert(product.estimation != null, "calculateProduct returns estimation");

console.log(`\n${failed === 0 ? "All fixed frame tests passed." : `${failed} test(s) failed.`}`);
process.exit(failed > 0 ? 1 : 0);
