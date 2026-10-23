import { createDefaultCuttingOptions } from "../lib/cutting/presets";
import { createProductFromEstimation } from "../lib/jobs/products";
import { getDefaultEstimationInputs } from "../lib/estimation/defaults";
import { getDefaultProfileRateSettings, recalculateProfileRates } from "../lib/profiles";
import { getDefaultDoorHardwareMasterSettings } from "../lib/door-hardware";
import { mmToFeetInches } from "../lib/units/conversion";
import { optimizeWorkshopJob } from "../lib/cutting/bar-optimization/optimize-workshop-job";
import {
  buildMaterialRequiredForJob,
  buildMaterialRequiredPdf,
  getMaterialRequiredNewBarTotal,
} from "../lib/material-required";
import { getDefaultQuotationForm } from "../lib/quotation/defaults";
import type { WorkshopJob } from "../lib/jobs/types";

let failed = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    failed += 1;
  } else {
    console.log(`PASS: ${message}`);
  }
}

console.log("Material Required — optimizer integration tests\n");

const profileRates = getDefaultProfileRateSettings();
const doorHardwareMaster = getDefaultDoorHardwareMasterSettings();

function buildValidationJob(): WorkshopJob {
  const width = mmToFeetInches(1187);
  const height = mmToFeetInches(1208);
  const inputs = {
    ...getDefaultEstimationInputs(),
    trackSystemId: "3-track-t109" as const,
    widthFeet: width.feet,
    widthInches: width.inches,
    heightFeet: height.feet,
    heightInches: height.inches,
    numberOfWindows: 1,
    productKind: "window" as const,
    customerName: "Validation Sample",
    location: "Workshop Floor Review",
  };
  const cuttingOptions = {
    ...createDefaultCuttingOptions("3-track-t109", "sarik"),
    threeTrackSashConfiguration: "two-glass-one-net" as const,
  };
  const product = createProductFromEstimation(
    "JOB-MAT-REQ",
    "window",
    inputs,
    [],
    "W01 — 1187×1208",
  );
  product.cuttingOptions = cuttingOptions;

  return {
    id: "JOB-MAT-REQ",
    customerName: "Validation Sample",
    customerPhone: "",
    billingAddress: "",
    siteAddress: "Workshop Floor Review",
    projectName: "Material Required Validation",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: "verify",
    status: "estimation-ready",
    products: [product],
    activeProductId: product.id,
    notes: "",
    cuttingJobMeta: {
      jobName: "W01 — 1187×1208",
      jobNotes: "3 Track 2 Glass + 1 Net",
      windowLocation: "Bedroom",
    },
    quotation: getDefaultQuotationForm(),
    quotationRevisions: [],
    documentIds: [],
    activity: [],
  };
}

const job = buildValidationJob();
const material = buildMaterialRequiredForJob({ job, profileRates, doorHardwareMaster });
const optimization = optimizeWorkshopJob({
  jobId: job.id,
  products: job.products,
  profileRates,
});

const optimizerNewBars = optimization.optimization.profileSummaries.reduce(
  (sum, row) => sum + row.newBarsRequired,
  0,
);
const materialNewBars = getMaterialRequiredNewBarTotal(material);

assert(
  material.labourBarCount === optimization.optimization.barPlans.length,
  "Material Required bar plan count matches optimizer",
);
assert(
  materialNewBars === optimizerNewBars,
  "Material Required new bar count matches optimizer summaries",
);
assert(
  material.upvcProfiles.every((row) => row.newBarsRequired > 0 || row.inventoryBarsConsumed > 0),
  "Each UPVC profile row has optimizer bar usage",
);
assert(
  material.upvcProfiles.some((row) => row.profileCode === "T60-052"),
  "3 Track 2 Glass + 1 Net includes screen sash profile T60-052",
);
assert(material.mesh.length === 1 && material.mesh[0]!.amount >= 0, "Mesh / jaali section populated");
assert(material.mesh[0]!.meshWidthMm > 0, "Mesh width is not zero");
assert(material.glass.length === 1, "Glass section populated");
assert(material.steel.length === 1, "Steel reinforcement separated from UPVC");
assert(
  material.upvcProfiles.every((row) => row.amount >= 0),
  "UPVC purchase amounts computed from rate master",
);

const t109 = material.upvcProfiles.find((row) => row.profileCode === "T109-600");
assert(t109 != null && t109.newBarsRequired === 1, "T109-600 new bars matches optimizer (1)");

const rateBefore = material.grandTotal;
const changedRates = recalculateProfileRates({
  ...profileRates,
  marketRatePerKg: profileRates.marketRatePerKg + 25,
});
const materialRateChanged = buildMaterialRequiredForJob({
  job,
  profileRates: changedRates,
  doorHardwareMaster,
});
assert(
  materialRateChanged.grandTotal !== rateBefore,
  "Rate master change updates purchase cost",
);
assert(
  getMaterialRequiredNewBarTotal(materialRateChanged) === materialNewBars,
  "Rate master change does not alter bar counts",
);

const internalPdf = buildMaterialRequiredPdf(material, "internal");
const supplierPdf = buildMaterialRequiredPdf(material, "supplier");
assert(internalPdf.getNumberOfPages() > 0, "Internal Material Required PDF builds");
assert(supplierPdf.getNumberOfPages() > 0, "Supplier enquiry PDF builds");

console.log("\nSample 1187×1208 (3 Track 2 Glass + 1 Net):");
console.log(`  Optimizer bar plans: ${material.labourBarCount}`);
console.log(`  New full bars: ${materialNewBars}`);
console.log(`  UPVC profiles: ${material.upvcProfiles.length}`);
console.log(`  Purchase total: ₹${material.grandTotal}`);
console.log(`  Mesh area: ${material.mesh[0]?.meshAreaSqft.toFixed(2)} sq.ft`);
console.log(`  Glass cut area: ${material.glass[0]?.actualCutAreaSqft.toFixed(2)} sq.ft`);

console.log(failed === 0 ? "\nAll Material Required tests passed." : `\n${failed} test(s) failed.`);
process.exit(failed === 0 ? 0 : 1);
