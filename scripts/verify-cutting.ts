import {
  runAcceptanceSampleTest,
  runSarikAcceptanceTest,
  runSarikThreeGlassAcceptanceTest,
  runSarikTwoGlassOneNetRegressionTest,
  runStandardAcceptanceTests,
} from "../lib/cutting/verification";

function main() {
  let failed = false;

  console.log("Standard Method acceptance samples\n");
  for (const test of runStandardAcceptanceTests()) {
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

  console.log("\nWorkshop Confirmed acceptance sample\n");
  const workshop = runAcceptanceSampleTest();
  console.log(`  2385 × 2053 workshop sample: ${workshop.allOk ? "PASS" : "FAIL"}`);
  for (const row of workshop.rows) {
    if (row.status !== "ok") {
      console.log(
        `    ${row.item}: expected ${row.expected}, got ${row.calculated} (diff ${row.diff})`,
      );
      failed = true;
    }
  }

  console.log("\nSarik Method acceptance sample\n");
  const sarik = runSarikAcceptanceTest();
  console.log(`  1187 × 1208 Sarik sample: ${sarik.allOk ? "PASS" : "FAIL"}`);
  for (const row of sarik.rows) {
    if (row.status !== "ok") {
      console.log(
        `    ${row.item}: expected ${row.expected}, got ${row.calculated} (diff ${row.diff})`,
      );
      failed = true;
    }
  }

  console.log("\nSarik 3 Glass + No Net (4685 × 2110)\n");
  const sarikThreeGlass = runSarikThreeGlassAcceptanceTest();
  console.log(
    `  4685 × 2110 three-glass sample: ${sarikThreeGlass.allOk ? "PASS" : "FAIL"}`,
  );
  for (const row of sarikThreeGlass.rows) {
    if (row.status !== "ok") {
      console.log(
        `    ${row.item}: expected ${row.expected}, got ${row.calculated} (diff ${row.diff})`,
      );
      failed = true;
    }
  }

  console.log("\nSarik 3 Track 2 Glass + 1 Net regression\n");
  const sarikRegression = runSarikTwoGlassOneNetRegressionTest();
  console.log(
    `  1187 × 1208 two-glass-one-net regression: ${sarikRegression.allOk ? "PASS" : "FAIL"}`,
  );
  for (const row of sarikRegression.rows) {
    if (row.status !== "ok") {
      console.log(
        `    ${row.item}: expected ${row.expected}, got ${row.calculated} (diff ${row.diff})`,
      );
      failed = true;
    }
  }

  if (failed) {
    process.exit(1);
  }

  console.log("\nAll cutting verification tests passed.");
}

main();
