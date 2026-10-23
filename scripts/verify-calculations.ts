import { createDefaultCuttingOptions } from "@/lib/cutting";
import {
  runAllDoorAcceptanceTests,
  runDoorOpeningDirectionInvariantTest,
} from "@/lib/cutting/door";
import {
  runAcceptanceSampleTest,
  runSarikAcceptanceTest,
  runSarikThreeGlassAcceptanceTest,
  runSarikTwoGlassOneNetRegressionTest,
  runStandardAcceptanceTests,
} from "@/lib/cutting/verification";
import {
  addCurrentProductToQuotation,
  buildEstimationResultFromProduct,
  calculateProduct,
  calculateWindowProduct,
  mmAreaToSqFt,
} from "@/lib/calculations";
import { calculateEstimation } from "@/lib/estimation/calculate";
import { getDefaultEstimationInputs } from "@/lib/estimation/defaults";
import { calculateWindowRow, getDefaultQuotationForm } from "@/lib/quotation";
import { getDefaultProfileRateSettings } from "@/lib/profiles";
import { buildSummaryForProduct } from "@/lib/summary/build-summary-for-product";
import { mmToFeetInches } from "@/lib/units/conversion";

let failed = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    failed += 1;
  } else {
    console.log(`PASS: ${message}`);
  }
}

console.log("Shared calculation engine — consistency & validation tests\n");

const sarik = runSarikAcceptanceTest();
assert(sarik.allOk, "Sarik reference sample 1187 × 1208");

for (const test of runStandardAcceptanceTests()) {
  assert(test.allOk, test.label);
}

assert(runAcceptanceSampleTest().allOk, "Workshop 2385 × 2053 sample");
assert(runSarikThreeGlassAcceptanceTest().allOk, "Sarik 3-glass no net sample");
assert(runSarikTwoGlassOneNetRegressionTest().allOk, "Sarik 2-glass 1-net regression");

for (const test of runAllDoorAcceptanceTests()) {
  assert(test.allOk, test.label);
}

assert(
  runDoorOpeningDirectionInvariantTest().allOk,
  "Door opening direction invariant",
);

const cuttingOptions = createDefaultCuttingOptions("3-track-t109", "sarik");
const narrow = calculateWindowProduct({
  widthMm: 300,
  heightMm: 400,
  quantity: 1,
  areaSqFt: mmAreaToSqFt(300, 400),
  trackSystemId: "3-track-t109",
  cuttingOptions,
});
assert(!narrow.validation.isValid, "Narrow 3-track window blocked");
assert(
  narrow.cutting == null,
  "Invalid narrow window returns no cutting result",
);

const validWindow = calculateWindowProduct({
  widthMm: 1187,
  heightMm: 1208,
  quantity: 1,
  areaSqFt: mmAreaToSqFt(1187, 1208),
  trackSystemId: "2-track-t60",
  cuttingOptions: createDefaultCuttingOptions("2-track-t60", "sarik"),
});
assert(validWindow.validation.isValid, "Valid Sarik window passes validation");
assert(
  validWindow.cutting?.cuts.glassWidth === 477,
  "Valid Sarik window glass width is 477 mm",
);

function inputsFromMm(widthMm: number, heightMm: number) {
  const width = mmToFeetInches(widthMm);
  const height = mmToFeetInches(heightMm);
  return {
    ...getDefaultEstimationInputs(),
    widthFeet: width.feet,
    widthInches: width.inches,
    heightFeet: height.feet,
    heightInches: height.inches,
    numberOfWindows: 1,
    trackSystemId: "2-track-t60" as const,
  };
}

const profileRates = getDefaultProfileRateSettings();
const sarikOptions = createDefaultCuttingOptions("2-track-t60", "sarik");
const jobMeta = { jobName: "W-01", jobNotes: "", windowLocation: "Bedroom" };
const sarikInputs = inputsFromMm(1187, 1208);

const product = calculateProduct({
  estimationInputs: sarikInputs,
  cuttingOptions: sarikOptions,
  profileRates,
  cuttingJobMeta: jobMeta,
});

assert(
  product.validation.isValid && product.window?.cutting != null && product.estimation != null,
  "calculateProduct returns valid Sarik 1187 × 1208 job",
);

const summary = buildSummaryForProduct({
  estimationInputs: sarikInputs,
  cuttingOptions: sarikOptions,
  profileRates,
  cuttingJobMeta: jobMeta,
});

const estFromProduct = buildEstimationResultFromProduct(
  product,
  sarikInputs,
  profileRates,
  sarikOptions,
);
const estDirect = calculateEstimation(sarikInputs, profileRates, sarikOptions).selectedTrack;

if (product.estimation && product.window) {
  assert(
    product.window.cutting.cuts.glassWidth === 477,
    "Product engine glass width 477 mm",
  );
  assert(
    summary.windows[0]?.areaSqft === product.estimation.areaSqft,
    "Summary area matches product estimation",
  );
  assert(
    estDirect.areaSqft === product.estimation.areaSqft,
    "Estimation tab area matches product estimation",
  );
  assert(
    estFromProduct.selectedTrack.orderWorkshopTotal === product.estimation.orderWorkshopTotal,
    "Estimation result workshop total matches product",
  );
  assert(
    summary.totalProfileCost === product.profileCostSummary?.totalProfileCost,
    "Summary profile cost matches product",
  );
  assert(
    summary.profileCostSummary.totalRequiredRunFt ===
      product.profileCostSummary?.totalRequiredRunFt,
    "Summary running feet matches product",
  );
}

const added = addCurrentProductToQuotation({
  estimationInputs: sarikInputs,
  cuttingOptions: sarikOptions,
  profileRates,
  cuttingJobMeta: jobMeta,
  quotationForm: getDefaultQuotationForm(),
});

assert(added.ok, "Add current product to quotation succeeds for valid job");

if (added.ok && product.estimation) {
  const row = added.form.windows[added.form.windows.length - 1]!;
  const calculated = calculateWindowRow(row);
  assert(row.unit === "mm", "Quotation row stores mm dimensions");
  assert(row.length === 1187 && row.height === 1208, "Quotation row dimensions 1187 × 1208 mm");
  assert(
    calculated.areaSqFt === product.inputDimensions.areaSqFt,
    `Quotation area ${calculated.areaSqFt} matches product ${product.inputDimensions.areaSqFt}`,
  );
  assert(
    calculated.quantity === product.inputDimensions.quantity,
    "Quotation quantity matches product",
  );
  const rate = product.estimation.customerRateAvailable
    ? product.estimation.suggestedCustomerRatePerSqFt
    : (product.estimation.baseRatePerSqftAfterProfit ?? product.estimation.costPerSqft);
  assert(
    row.ratePerSqFt === rate,
    "Quotation default rate uses suggested customer rate per sq.ft",
  );
  const expectedAmount = Math.round(calculated.areaSqFt * calculated.quantity * rate * 100) / 100;
  assert(
    Math.abs(calculated.amount - expectedAmount) < 0.02,
    "Quotation line amount matches area × rate from estimation",
  );
}

const narrowInputs = {
  ...getDefaultEstimationInputs(),
  widthFeet: 1,
  widthInches: 0,
  heightFeet: 1,
  heightInches: 0,
  trackSystemId: "3-track-t109" as const,
};
const narrowOpts = createDefaultCuttingOptions("3-track-t109", "sarik");
const narrowProduct = calculateProduct({
  estimationInputs: narrowInputs,
  cuttingOptions: narrowOpts,
  profileRates,
  cuttingJobMeta: jobMeta,
});
const narrowEstResult = buildEstimationResultFromProduct(
  narrowProduct,
  narrowInputs,
  profileRates,
  narrowOpts,
);

assert(!narrowProduct.validation.isValid, "Invalid narrow 3-track blocked in product engine");
assert(
  narrowProduct.estimation == null,
  "Invalid job has null estimation in product engine",
);
assert(
  narrowEstResult.selectedTrack.workshopTotal === 0,
  "Blocked estimation result has zero workshop total",
);
assert(
  narrowEstResult.selectedTrack.orderWorkshopTotal === 0,
  "Blocked estimation result has zero order workshop total",
);

console.log(`\n${failed === 0 ? "All tests passed." : `${failed} test(s) failed.`}`);
process.exit(failed > 0 ? 1 : 0);
