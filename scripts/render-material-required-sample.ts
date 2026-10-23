import fs from "node:fs";
import path from "node:path";

import { createDefaultCuttingOptions } from "../lib/cutting/presets";
import { getDefaultDoorHardwareMasterSettings } from "../lib/door-hardware";
import { createProductFromEstimation } from "../lib/jobs/products";
import { getDefaultEstimationInputs } from "../lib/estimation/defaults";
import { getDefaultProfileRateSettings } from "../lib/profiles";
import { mmToFeetInches } from "../lib/units/conversion";
import {
  buildMaterialRequiredForJob,
  buildMaterialRequiredPdf,
  getMaterialRequiredNewBarTotal,
} from "../lib/material-required";
import { optimizeWorkshopJob } from "../lib/cutting/bar-optimization/optimize-workshop-job";
import { getDefaultQuotationForm } from "../lib/quotation/defaults";
import type { WorkshopJob } from "../lib/jobs/types";

async function main() {
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
    "JOB-MAT-SAMPLE",
    "window",
    inputs,
    [],
    "W01 — 1187×1208",
  );
  product.cuttingOptions = cuttingOptions;

  const job: WorkshopJob = {
    id: "JOB-MAT-SAMPLE",
    customerName: "Validation Sample",
    customerPhone: "",
    billingAddress: "",
    siteAddress: "Workshop Floor Review",
    projectName: "Material Required — Validation Sample",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: "sample",
    status: "estimation-ready",
    products: [product],
    activeProductId: product.id,
    notes: "Phase 3 validation · 3 Track 2 Glass + 1 Net",
    cuttingJobMeta: {
      jobName: "W01 — 1187×1208",
      jobNotes: "Material Required sample",
      windowLocation: "Bedroom",
    },
    quotation: getDefaultQuotationForm(),
    quotationRevisions: [],
    documentIds: [],
    activity: [],
  };

  const profileRates = getDefaultProfileRateSettings();
  const doorHardwareMaster = getDefaultDoorHardwareMasterSettings();
  const material = buildMaterialRequiredForJob({ job, profileRates, doorHardwareMaster });
  const optimization = optimizeWorkshopJob({
    jobId: job.id,
    products: job.products,
    profileRates,
  });

  const outDir = path.join(process.cwd(), ".tmp-material-required");
  fs.mkdirSync(outDir, { recursive: true });

  const internalDoc = buildMaterialRequiredPdf(material, "internal");
  const supplierDoc = buildMaterialRequiredPdf(material, "supplier");
  const internalPath = path.join(outDir, "material-required-internal-1187x1208.pdf");
  const supplierPath = path.join(outDir, "material-required-supplier-1187x1208.pdf");
  fs.writeFileSync(internalPath, Buffer.from(internalDoc.output("arraybuffer")));
  fs.writeFileSync(supplierPath, Buffer.from(supplierDoc.output("arraybuffer")));

  console.log("Material Required sample generated\n");
  console.log(`  Internal PDF: ${internalPath}`);
  console.log(`  Supplier PDF: ${supplierPath}`);
  console.log(`  Labour bar plans: ${optimization.optimization.barPlans.length}`);
  console.log(`  Material new bars: ${getMaterialRequiredNewBarTotal(material)}`);
  console.log(`  UPVC purchase total: ₹${material.purchaseSummary.find((s) => s.id === "upvc")?.total}`);
  console.log(`  Grand total: ₹${material.grandTotal}`);

  console.log("\nUPVC profile requirement:");
  for (const row of material.upvcProfiles) {
    console.log(
      `  ${row.profileCode}: new bars ${row.newBarsRequired}, kg ${row.purchaseWeightKg.toFixed(2)}, amount ₹${row.amount.toFixed(2)}`,
    );
  }

  console.log("\nPurchase summary:");
  for (const section of material.purchaseSummary) {
    console.log(`  ${section.label}: ₹${section.total.toFixed(2)}`);
  }

  if (material.steel[0]) {
    const s = material.steel[0];
    console.log(`\nSteel: new bars ${s.newBarsRequired}, ${s.purchaseRunningFt.toFixed(2)} ft, amount ₹${s.amount.toFixed(2)}`);
  }
  if (material.glass[0]) {
    const g = material.glass[0];
    console.log(`Glass: ${g.pieceCount} pcs ${g.cutWidthMm}×${g.cutHeightMm} mm, cut ${g.actualCutAreaSqft} sq.ft, costing ${g.costingAreaSqft} sq.ft, ₹${g.amount.toFixed(2)}`);
  }
  if (material.mesh[0]) {
    const m = material.mesh[0];
    console.log(`Mesh: ${m.meshWidthMm}×${m.meshHeightMm} mm, ${m.meshAreaSqft} sq.ft, ₹${m.amount.toFixed(2)}`);
  }
  if (material.hardware.length) {
    console.log("\nHardware:");
    for (const h of material.hardware) {
      console.log(`  ${h.item}: qty ${h.quantity}, ₹${h.amount.toFixed(2)}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
