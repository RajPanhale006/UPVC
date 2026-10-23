/**
 * Cross-module consistency verification — Cutting, Summary, Estimate, Quotation.
 * Does not modify formulas; asserts shared engine outputs align.
 */
import { createDefaultCuttingOptions } from "../lib/cutting";
import { createDefaultDoorCuttingOptions } from "../lib/cutting/door";
import {
  addCurrentProductToQuotation,
  buildEstimationResultFromProduct,
  calculateProduct,
} from "../lib/calculations";
import { calculateEstimation } from "../lib/estimation/calculate";
import { getDefaultEstimationInputs } from "../lib/estimation/defaults";
import { getDefaultProfileRateSettings } from "../lib/profiles/catalog";
import { buildSummaryForProduct } from "../lib/summary/build-summary-for-product";
import { calculateWindowRow, getDefaultQuotationForm } from "../lib/quotation";
import { mmToFeetInches } from "../lib/units/conversion";
import type { EstimationInputs } from "../lib/estimation/types";
import type { TrackSystemId } from "../lib/cutting/types";

let failed = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    failed += 1;
  } else {
    console.log(`PASS: ${message}`);
  }
}

function inputsFromMm(
  widthMm: number,
  heightMm: number,
  trackSystemId: TrackSystemId,
  quantity = 1,
): EstimationInputs {
  const w = mmToFeetInches(widthMm);
  const h = mmToFeetInches(heightMm);
  return {
    ...getDefaultEstimationInputs(),
    widthFeet: w.feet,
    widthInches: w.inches,
    heightFeet: h.feet,
    heightInches: h.inches,
    numberOfWindows: quantity,
    trackSystemId,
    productKind: "window",
  };
}

function doorInputsFromMm(widthMm: number, heightMm: number, configuration: "single" | "double") {
  const w = mmToFeetInches(widthMm);
  const h = mmToFeetInches(heightMm);
  return {
    ...getDefaultEstimationInputs(),
    widthFeet: w.feet,
    widthInches: w.inches,
    heightFeet: h.feet,
    heightInches: h.inches,
    numberOfWindows: 1,
    productKind: "door" as const,
    doorSettings: createDefaultDoorCuttingOptions(configuration),
  };
}

type Scenario = {
  label: string;
  inputs: EstimationInputs;
  cuttingOptions: ReturnType<typeof createDefaultCuttingOptions>;
  productId: string;
};

const profileRates = getDefaultProfileRateSettings();
const jobMeta = { jobName: "Consistency Job", jobNotes: "", windowLocation: "Site" };

const threeGlassOptions = {
  ...createDefaultCuttingOptions("3-track-t109", "sarik"),
  threeTrackSashConfiguration: "three-glass-no-net" as const,
  shutterQty: 6,
  glassPanelQty: 3,
  interlockQty: 4,
};

const scenarios: Scenario[] = [
  {
    label: "2 Track window",
    inputs: inputsFromMm(1187, 1208, "2-track-t60", 2),
    cuttingOptions: createDefaultCuttingOptions("2-track-t60", "sarik"),
    productId: "W-001",
  },
  {
    label: "2.5 Track window",
    inputs: inputsFromMm(1500, 1400, "2.5-track-t60", 1),
    cuttingOptions: createDefaultCuttingOptions("2.5-track-t60", "sarik"),
    productId: "W-002",
  },
  {
    label: "3 Track 2 Glass + 1 Net",
    inputs: inputsFromMm(1187, 1208, "3-track-t109", 1),
    cuttingOptions: createDefaultCuttingOptions("3-track-t109", "sarik"),
    productId: "W-003",
  },
  {
    label: "3 Track 3 Glass + No Net",
    inputs: inputsFromMm(4685, 2110, "3-track-t109", 1),
    cuttingOptions: threeGlassOptions,
    productId: "W-004",
  },
  {
    label: "Single door",
    inputs: doorInputsFromMm(862, 2141, "single"),
    cuttingOptions: createDefaultCuttingOptions("2-track-t60", "sarik"),
    productId: "D-001",
  },
  {
    label: "Double door",
    inputs: doorInputsFromMm(1808, 2425, "double"),
    cuttingOptions: createDefaultCuttingOptions("2-track-t60", "sarik"),
    productId: "D-002",
  },
];

console.log("Cross-module consistency tests\n");

for (const scenario of scenarios) {
  const { label, inputs, cuttingOptions, productId } = scenario;
  const product = calculateProduct({
    estimationInputs: inputs,
    cuttingOptions,
    profileRates,
    cuttingJobMeta: jobMeta,
  });

  assert(product.validation.isValid, `${label}: product validates`);

  const summary = buildSummaryForProduct({
    estimationInputs: inputs,
    cuttingOptions,
    profileRates,
    cuttingJobMeta: jobMeta,
  });

  const estFromProduct = buildEstimationResultFromProduct(
    product,
    inputs,
    profileRates,
    cuttingOptions,
  );
  const estDirect = calculateEstimation(inputs, profileRates, cuttingOptions).selectedTrack;

  if (product.estimation) {
    const expectedTotalArea =
      product.estimation.areaSqft * product.inputDimensions.quantity;
    assert(
      summary.totalAreaSqft === expectedTotalArea,
      `${label}: summary area matches product`,
    );
    assert(
      estDirect.areaSqft === product.estimation.areaSqft,
      `${label}: estimation area matches product`,
    );
    assert(
      estFromProduct.selectedTrack.orderWorkshopTotal === product.estimation.orderWorkshopTotal,
      `${label}: estimation workshop total matches product`,
    );
    assert(
      summary.totalProfileCost === product.profileCostSummary?.totalProfileCost,
      `${label}: summary profile cost matches product`,
    );
  }

  const added = addCurrentProductToQuotation({
    estimationInputs: inputs,
    cuttingOptions,
    profileRates,
    cuttingJobMeta: jobMeta,
    quotationForm: getDefaultQuotationForm(),
    productId,
  });

  assert(added.ok, `${label}: add to quotation succeeds`);
  if (added.ok && product.estimation) {
    const row = added.row;
    const calculated = calculateWindowRow(row);
    assert(
      calculated.areaSqFt === product.inputDimensions.areaSqFt,
      `${label}: quotation area matches product`,
    );
    assert(
      calculated.quantity === product.inputDimensions.quantity,
      `${label}: quotation quantity matches product`,
    );
  }
}

console.log(`\n${failed === 0 ? "All consistency tests passed." : `${failed} test(s) failed.`}`);
process.exit(failed > 0 ? 1 : 0);
