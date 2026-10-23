import {
  DOOR_ACCEPTANCE_SAMPLES,
  calculateSarikDoorComponents,
  runAllDoorAcceptanceTests,
  runDoorOpeningDirectionInvariantTest,
} from "../lib/cutting/door/sarik-door-method";
import {
  RETIRED_SINGLE_DOOR_SASH_HEIGHT_DEDUCT,
  RETIRED_SINGLE_DOOR_SASH_WIDTH_DEDUCT,
  SARIK_DOOR_FORMULA_VERSION,
  SARIK_DOUBLE_DOOR_SASH_HEIGHT_DEDUCT,
  SARIK_SINGLE_DOOR_SASH_HEIGHT_DEDUCT,
  SARIK_SINGLE_DOOR_SASH_WIDTH_DEDUCT,
  SUPERSEDED_SINGLE_DOOR_SASH_HEIGHT_DEDUCT,
} from "../lib/cutting/door/constants";
import { runSarikAcceptanceTest } from "../lib/cutting/verification";

function main() {
  let failed = false;

  console.log("Sarik Door Method — official constants\n");
  if (SARIK_DOOR_FORMULA_VERSION !== 2) {
    console.log(`  FAIL: SARIK_DOOR_FORMULA_VERSION must be 2, got ${SARIK_DOOR_FORMULA_VERSION}`);
    failed = true;
  } else {
    console.log("  SARIK_DOOR_FORMULA_VERSION 2: PASS");
  }
  if (SARIK_SINGLE_DOOR_SASH_WIDTH_DEDUCT !== 58) {
    console.log(`  FAIL: single sash width deduct must be 58, got ${SARIK_SINGLE_DOOR_SASH_WIDTH_DEDUCT}`);
    failed = true;
  } else {
    console.log("  Single sash width deduct 58 mm: PASS");
  }
  if (SARIK_SINGLE_DOOR_SASH_HEIGHT_DEDUCT !== 31) {
    console.log(`  FAIL: single sash height deduct must be 31, got ${SARIK_SINGLE_DOOR_SASH_HEIGHT_DEDUCT}`);
    failed = true;
  } else {
    console.log("  Single sash height deduct 31 mm: PASS");
  }
  if (SARIK_DOUBLE_DOOR_SASH_HEIGHT_DEDUCT !== 31) {
    console.log(
      `  FAIL: double sash height deduct must be 31, got ${SARIK_DOUBLE_DOOR_SASH_HEIGHT_DEDUCT}`,
    );
    failed = true;
  } else {
    console.log("  Double sash height deduct 31 mm: PASS");
  }
  if (Number(SARIK_SINGLE_DOOR_SASH_HEIGHT_DEDUCT) === SUPERSEDED_SINGLE_DOOR_SASH_HEIGHT_DEDUCT) {
    console.log("  FAIL: production must not use superseded v1 sash height deduct (34 mm)");
    failed = true;
  } else {
    console.log("  Superseded v1 sash height deduct (34 mm) not in use: PASS");
  }
  const productionWidth = Number(SARIK_SINGLE_DOOR_SASH_WIDTH_DEDUCT);
  if (productionWidth === RETIRED_SINGLE_DOOR_SASH_WIDTH_DEDUCT) {
    console.log("  FAIL: production sash width deduct must not use retired 52 mm");
    failed = true;
  } else {
    console.log("  Retired 52 mm width deduct not in use: PASS");
  }
  void RETIRED_SINGLE_DOOR_SASH_HEIGHT_DEDUCT;

  console.log("\nLegacy Size 1 (920 × 2130) must not match retired sash output\n");
  const legacy = calculateSarikDoorComponents(
    { widthMm: 920, heightMm: 2130 },
    "single",
  );
  const retiredSashWidth = 920 - RETIRED_SINGLE_DOOR_SASH_WIDTH_DEDUCT;
  const retiredSashHeight = 2130 - RETIRED_SINGLE_DOOR_SASH_HEIGHT_DEDUCT;
  if (
    legacy.sash.widthMm === retiredSashWidth &&
    legacy.sash.heightMm === retiredSashHeight
  ) {
    console.log(
      `  FAIL: 920×2130 still produces retired sash ${retiredSashWidth}×${retiredSashHeight}`,
    );
    failed = true;
  } else {
    console.log(
      `  Official sash ${legacy.sash.widthMm}×${legacy.sash.heightMm} (not retired ${retiredSashWidth}×${retiredSashHeight}): PASS`,
    );
  }

  console.log("\nSarik Door Method acceptance samples\n");
  for (const test of runAllDoorAcceptanceTests()) {
    console.log(`  ${test.label}: ${test.allOk ? "PASS" : "FAIL"}`);
    for (const row of test.rows) {
      if (row.status !== "ok") {
        console.log(
          `    ${row.item}: expected ${row.expected}, got ${row.calculated} (diff ${row.diff})`,
        );
        failed = true;
      }
    }
  }

  console.log("\nOfficial single-door reference (862 × 2141)\n");
  const official = DOOR_ACCEPTANCE_SAMPLES.find(
    (s) => s.configuration === "single" && s.widthMm === 862,
  );
  if (!official) {
    console.log("  FAIL: official single-door acceptance sample missing");
    failed = true;
  } else {
    const components = calculateSarikDoorComponents(
      { widthMm: 862, heightMm: 2141 },
      "single",
    );
    const checks = [
      ["Frame", 868, 2144, components.frame.widthMm, components.frame.heightMm],
      ["Sash", 804, 2110, components.sash.widthMm, components.sash.heightMm],
      ["Beading", 626, 1932, components.beading.widthMm, components.beading.heightMm],
      ["Glass", 621, 1927, components.glass.widthMm, components.glass.heightMm],
    ] as const;
    for (const [label, ew, eh, cw, ch] of checks) {
      const ok = cw === ew && ch === eh;
      console.log(`  ${label} ${cw}×${ch} (expected ${ew}×${eh}): ${ok ? "PASS" : "FAIL"}`);
      if (!ok) failed = true;
    }
  }

  console.log("\nReported correction sample (2130 mm height → sash 2099 mm)\n");
  const correctionSample = calculateSarikDoorComponents(
    { widthMm: 862, heightMm: 2130 },
    "single",
  );
  if (correctionSample.sash.heightMm !== 2099) {
    console.log(
      `  FAIL: expected sash height 2099 mm, got ${correctionSample.sash.heightMm} mm`,
    );
    failed = true;
  } else {
    console.log("  Single door sash height 2099 mm (was 2096 mm at v1): PASS");
  }

  const doubleLeaf = calculateSarikDoorComponents(
    { widthMm: 1808, heightMm: 2130 },
    "double",
  );
  if (doubleLeaf.sash.heightMm !== 2099) {
    console.log(
      `  FAIL: double door leaf sash height expected 2099 mm, got ${doubleLeaf.sash.heightMm} mm`,
    );
    failed = true;
  } else {
    console.log("  Double door leaf sash height 2099 mm: PASS");
  }

  console.log("\nOpening direction invariant (single door 862 × 2141)\n");
  const opening = runDoorOpeningDirectionInvariantTest();
  console.log(
    `  Inward vs outward cutting sizes: ${opening.allOk ? "PASS" : "FAIL"}`,
  );
  if (!opening.allOk) failed = true;

  console.log("\nWindow Sarik regression (unchanged)\n");
  const windowSarik = runSarikAcceptanceTest();
  console.log(`  1187 × 1208 Sarik window sample: ${windowSarik.allOk ? "PASS" : "FAIL"}`);
  for (const row of windowSarik.rows) {
    if (row.status !== "ok") {
      console.log(
        `    ${row.item}: expected ${row.expected}, got ${row.calculated} (diff ${row.diff})`,
      );
      failed = true;
    }
  }

  console.log(`\nDoor samples covered: ${DOOR_ACCEPTANCE_SAMPLES.length}`);

  if (failed) {
    process.exit(1);
  }

  console.log("\nAll door cutting verification tests passed.");
}

main();
