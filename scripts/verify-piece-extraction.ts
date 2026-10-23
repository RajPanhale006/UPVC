import {
  formatCutPieceLine,
  formatGroupedPieces,
  formatOptimizedBarPlan,
  formatWorkshopJobOptimizationReport,
} from "../lib/cutting/bar-optimization/format-diagnostics";
import {
  getPhase2SampleDoorPieces,
  getPhase2SampleJobOptimization,
  getPhase2SampleWindowPieces,
  groupedPiecesForDisplay,
  runAllPhase2ExtractionTests,
} from "../lib/cutting/bar-optimization/verification-phase2";
import { DEFAULT_KERF_MM, DEFAULT_STANDARD_BAR_LENGTH_MM } from "../lib/cutting/bar-optimization/constants";

let failed = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    failed += 1;
  } else {
    console.log(`PASS: ${message}`);
  }
}

console.log("Phase 2 — piece extraction & job-level bar optimization (validation only)\n");
console.log(`Stock: ${DEFAULT_STANDARD_BAR_LENGTH_MM} mm | Kerf: ${DEFAULT_KERF_MM} mm\n`);

for (const test of runAllPhase2ExtractionTests()) {
  assert(test.ok, test.label);
  for (const msg of test.messages) {
    console.error(`  ${msg}`);
  }
}

const windowPieces = getPhase2SampleWindowPieces();
const doorPieces = getPhase2SampleDoorPieces();
const jobResult = getPhase2SampleJobOptimization();

console.log("\n=== 3 TRACK / 2 GLASS + 1 NET — PHYSICAL CUT PIECES (1 window) ===\n");
for (const piece of windowPieces) {
  console.log(formatCutPieceLine(piece));
}

console.log("\n=== SINGLE DOOR — PHYSICAL CUT PIECES (862×2141) ===\n");
for (const piece of doorPieces) {
  console.log(formatCutPieceLine(piece));
}

console.log("\n=== JOB-LEVEL GROUPED PIECES BY PROFILE CODE (2 windows + 1 door) ===\n");
console.log(formatGroupedPieces(jobResult.piecesByProfileCode).join("\n"));

console.log("\n=== JOB-LEVEL OPTIMIZED 5800 mm BARS ===\n");
for (const bar of jobResult.optimization.barPlans) {
  console.log(formatOptimizedBarPlan(bar).join("\n"));
  console.log("");
}

console.log("=== JOB PROFILE SUMMARY (kerf / reusable / scrap) ===\n");
for (const summary of jobResult.optimization.profileSummaries) {
  console.log(
    [
      summary.profileCode,
      `new bars ${summary.newBarsRequired}`,
      `theoretical ${summary.theoreticalBars}`,
      `net ${summary.netRequiredLengthMm} mm`,
      `purchased ${summary.purchasedLengthMm} mm`,
      `kerf ${summary.totalKerfMm} mm`,
      `reusable ${summary.reusableLeftoverMm} mm`,
      `scrap ${summary.scrapMm} mm`,
      `util ${summary.materialUtilizationPercent}%`,
    ].join(" | "),
  );
}

console.log("\n=== WINDOW GROUPED BY PROFILE (single window) ===\n");
console.log(formatGroupedPieces(groupedPiecesForDisplay(windowPieces)).join("\n"));

console.log("\n=== DOOR GROUPED BY PROFILE (single door) ===\n");
console.log(formatGroupedPieces(groupedPiecesForDisplay(doorPieces)).join("\n"));

console.log("\n(Full job report available via formatWorkshopJobOptimizationReport — not duplicated here.)");
void formatWorkshopJobOptimizationReport;

console.log(failed === 0 ? "\nAll Phase 2 extraction tests passed." : `\n${failed} test(s) failed.`);
process.exit(failed === 0 ? 0 : 1);
