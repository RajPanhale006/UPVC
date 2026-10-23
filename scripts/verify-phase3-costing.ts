import { createDefaultCuttingOptions } from "../lib/cutting/presets";
import { applyTwoGlassOneNetSashConfiguration } from "../lib/cutting/sash-configuration";
import {
  calculateProduct,
  buildEstimationResultFromProduct,
} from "../lib/calculations";
import { calculateEstimation } from "../lib/estimation/calculate";
import { getDefaultEstimationInputs } from "../lib/estimation/defaults";
import { buildProfileCostSummary } from "../lib/summary/build-profile-cost-summary";
import { buildSummaryForProduct } from "../lib/summary/build-summary-for-product";
import { getDefaultProfileRateSettings } from "../lib/profiles";
import { mmToFeetInches } from "../lib/units/conversion";

let failed = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    failed += 1;
  } else {
    console.log(`PASS: ${message}`);
  }
}

console.log("Phase 3 — practical bar costing integration\n");

const profileRates = getDefaultProfileRateSettings();
const jobMeta = { jobName: "W-01", jobNotes: "", windowLocation: "Bedroom" };

function windowInputs(
  widthMm: number,
  heightMm: number,
  trackSystemId: "3-track-t109" | "2.5-track-t60",
) {
  const width = mmToFeetInches(widthMm);
  const height = mmToFeetInches(heightMm);
  return {
    ...getDefaultEstimationInputs(),
    trackSystemId,
    widthFeet: width.feet,
    widthInches: width.inches,
    heightFeet: height.feet,
    heightInches: height.inches,
    numberOfWindows: 1,
    productKind: "window" as const,
  };
}

const threeTrackOptions = {
  ...createDefaultCuttingOptions("3-track-t109", "sarik"),
  threeTrackSashConfiguration: "two-glass-one-net" as const,
};

const inputs = windowInputs(1187, 1208, "3-track-t109");
const product = calculateProduct({
  estimationInputs: inputs,
  cuttingOptions: threeTrackOptions,
  profileRates,
  cuttingJobMeta: jobMeta,
});

assert(
  product.profileCostSummary?.usesBarOptimization === true,
  "Product profile cost uses bar optimization",
);

const summary = buildSummaryForProduct({
  estimationInputs: inputs,
  cuttingOptions: threeTrackOptions,
  profileRates,
  cuttingJobMeta: jobMeta,
});

const estDirect = calculateEstimation(inputs, profileRates, threeTrackOptions).selectedTrack;
const estFromProduct = buildEstimationResultFromProduct(
  product,
  inputs,
  profileRates,
  threeTrackOptions,
);

assert(
  summary.totalProfileCost === product.profileCostSummary?.totalProfileCost,
  "Summary profile cost matches product",
);

assert(
  estFromProduct.selectedTrack.orderWorkshopTotal === product.estimation?.orderWorkshopTotal,
  "Estimation result workshop total matches product",
);

assert(
  estDirect.orderWorkshopTotal === product.estimation?.orderWorkshopTotal,
  "Direct estimation workshop total matches product",
);

const barOpt = product.profileCostSummary?.barOptimization;
assert(barOpt != null && barOpt.newBarsRequired > 0, "Profile summary includes new bars required");
assert(
  barOpt != null && barOpt.theoreticalBars > 0,
  "Profile summary includes theoretical bars reference",
);

const legacyWastageCost = product.profileCostSummary?.rows.reduce(
  (sum, row) => sum + row.costingRunFt * (row.ratePerFt ?? 0),
  0,
);

assert(
  product.profileCostSummary != null &&
    product.profileCostSummary.totalProfileCost > 0 &&
    (legacyWastageCost == null ||
      Math.abs(product.profileCostSummary.totalProfileCost - legacyWastageCost) > 0.01 ||
      product.profileCostSummary.totalProfileCost === legacyWastageCost),
  "Profile purchase cost is computed",
);

if (product.profileCostSummary && product.window?.cutting) {
  const recomputed = buildProfileCostSummary({
    trackSystemId: "3-track-t109",
    estimationInputs: inputs,
    profileRates,
    runningFeet: product.estimation!.runningFeet,
    tableRows: product.window.cutting.tableRows,
    profileCode: product.profileCode,
    windowQty: 1,
    cuttingOptions: threeTrackOptions,
  });

  assert(
    recomputed.totalProfileCost === product.profileCostSummary.totalProfileCost,
    "Rebuilt profile cost matches product engine",
  );
  assert(
    recomputed.barOptimization?.newBarsRequired === barOpt?.newBarsRequired,
    "New bars count stable across rebuild",
  );
}

const width25 = mmToFeetInches(1200);
const height25 = mmToFeetInches(1200);
const inputs25 = windowInputs(1200, 1200, "2.5-track-t60");
const options25 = applyTwoGlassOneNetSashConfiguration(
  createDefaultCuttingOptions("2.5-track-t60", "sarik"),
  "2.5-track-t60",
);
const product25 = calculateProduct({
  estimationInputs: inputs25,
  cuttingOptions: options25,
  profileRates,
  cuttingJobMeta: jobMeta,
});
const sashRow25 = product25.profileCostSummary?.rows.find((row) => row.id === "sash");
const screenSashRow25 = product25.profileCostSummary?.rows.find(
  (row) => row.id === "screen-sash",
);
assert(
  sashRow25 != null &&
    sashRow25.profileCode === "T60-051" &&
    (sashRow25.totalWeight ?? 0) > 0 &&
    sashRow25.totalCost > 0,
  "2.5 Track glass sash T60-051 has optimizer weight and purchase cost",
);
assert(
  screenSashRow25 != null &&
    screenSashRow25.profileCode === "T60-052" &&
    (screenSashRow25.totalWeight ?? 0) > 0 &&
    screenSashRow25.totalCost > 0,
  "2.5 Track net sash T60-052 has optimizer weight and purchase cost",
);
assert(
  (product25.estimation?.runningFeet.screenSashFt ?? 0) > 0,
  "2.5 Track includes net sash running feet",
);
assert(
  (product25.estimation?.materials.find((m) => m.key === "jaali")?.amount ?? 0) > 0,
  "2.5 Track jaali cost uses mesh panel area",
);
const meshComponent25 = product25.window?.components.find((row) =>
  row.part.toLowerCase().includes("mesh"),
);
assert(meshComponent25 != null, "2.5 Track summary includes mesh / jaali component");

console.log("\nSample 1187×1208 (3 Track 2 Glass + 1 Net):");
console.log(`  New full bars: ${barOpt?.newBarsRequired}`);
console.log(`  Theoretical bars (reference): ${barOpt?.theoreticalBars}`);
console.log(`  Purchase profile cost: ₹${product.profileCostSummary?.totalProfileCost}`);
console.log(`  Legacy wastage run-ft total (info): ${product.profileCostSummary?.totalCostingRunFt} ft`);
console.log(`  Purchase UPVC weight: ${product.profileCostSummary?.totalUpvcWeight} kg`);
console.log(`  Kerf: ${barOpt?.totalKerfMm} mm | Reusable: ${barOpt?.reusableLeftoverMm} mm | Scrap: ${barOpt?.scrapMm} mm`);

console.log(failed === 0 ? "\nAll Phase 3 costing tests passed." : `\n${failed} test(s) failed.`);
process.exit(failed === 0 ? 0 : 1);
