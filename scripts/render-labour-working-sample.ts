/**
 * Generate a sample Labour Working PDF for the Phase 3 validation job:
 * 1187 × 1208 mm · 3 Track · 2 Glass + 1 Net (Sarik)
 */
import fs from "node:fs";
import path from "node:path";

import { createDefaultCuttingOptions } from "../lib/cutting/presets";
import { createProductFromEstimation } from "../lib/jobs/products";
import { getDefaultEstimationInputs } from "../lib/estimation/defaults";
import { getDefaultProfileRateSettings } from "../lib/profiles";
import { mmToFeetInches } from "../lib/units/conversion";
import {
  buildLabourWorkingPdfAsync,
  buildLabourWorkingPdfInput,
} from "../lib/cutting/bar-optimization/labour-working-pdf";

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
    "JOB-LABOUR-SAMPLE",
    "window",
    inputs,
    [],
    "W01 — 1187×1208",
  );
  product.cuttingOptions = cuttingOptions;

  const profileRates = getDefaultProfileRateSettings();
  const cuttingJobMeta = {
    jobName: "W01 — 1187×1208",
    jobNotes: "Phase 3 validation · 3 Track 2 Glass + 1 Net · Sarik method",
    windowLocation: "Bedroom",
  };

  const pdfInput = buildLabourWorkingPdfInput({
    jobId: "JOB-LABOUR-SAMPLE",
    jobCode: "LAB-1187-1208",
    projectName: "Labour Working PDF — Validation Sample",
    products: [product],
    profileRates,
    estimationInputs: inputs,
    cuttingOptions,
    cuttingJobMeta,
  });

  const doc = await buildLabourWorkingPdfAsync(pdfInput);
  const outDir = path.join(process.cwd(), ".tmp-labour-working");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "labour-working-1187x1208-3track-2glass-1net.pdf");
  const buffer = Buffer.from(doc.output("arraybuffer"));
  fs.writeFileSync(outPath, buffer);

  const barCount = pdfInput.optimization.optimization.barPlans.length;
  const profileCount = pdfInput.optimization.optimization.profileSummaries.length;
  const glassSashQty = pdfInput.optimization.cutPieces
    .filter((p) => p.componentType === "GLASS_SASH")
    .reduce((s, p) => s + p.quantity, 0);
  const netSashQty = pdfInput.optimization.cutPieces
    .filter((p) => p.componentType === "SCREEN_SASH")
    .reduce((s, p) => s + p.quantity, 0);

  console.log("Labour Working PDF sample generated\n");
  console.log(`  Output: ${outPath}`);
  console.log(`  Bar plans: ${barCount}`);
  console.log(`  Profile codes: ${profileCount}`);
  console.log(`  Glass sash cuts: ${glassSashQty}`);
  console.log(`  Net sash cuts: ${netSashQty}`);
  console.log(`  New full bars: ${pdfInput.optimization.optimization.profileSummaries.reduce((s, r) => s + r.newBarsRequired, 0)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
