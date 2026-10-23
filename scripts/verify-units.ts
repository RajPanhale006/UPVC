import {
  feetAndInchesToMm,
  feetInchesToMm,
  feetToMm,
  inchesToMm,
  normalizeMm,
} from "../lib/units/conversion";

type UnitTest = {
  label: string;
  run: () => boolean;
  expected: string;
  actual: () => string;
};

const tests: UnitTest[] = [
  {
    label: "4 ft",
    run: () => feetToMm(4) === 1219,
    expected: "1219 mm",
    actual: () => `${feetToMm(4)} mm`,
  },
  {
    label: "4 ft × 4 ft",
    run: () =>
      feetInchesToMm(4, 0) === 1219 &&
      feetInchesToMm(4, 0) === feetInchesToMm(4, 0),
    expected: "1219 mm each",
    actual: () =>
      `${feetInchesToMm(4, 0)} × ${feetInchesToMm(4, 0)} mm`,
  },
  {
    label: "5 ft",
    run: () => feetToMm(5) === 1524,
    expected: "1524 mm",
    actual: () => `${feetToMm(5)} mm`,
  },
  {
    label: "3.5 ft",
    run: () => feetToMm(3.5) === 1067,
    expected: "1067 mm",
    actual: () => `${feetToMm(3.5)} mm`,
  },
  {
    label: "48 inches",
    run: () => inchesToMm(48) === 1219,
    expected: "1219 mm",
    actual: () => `${inchesToMm(48)} mm`,
  },
  {
    label: "4 ft 6 in",
    run: () => feetAndInchesToMm(4, 6) === 1372,
    expected: "1372 mm",
    actual: () => `${feetAndInchesToMm(4, 6)} mm`,
  },
  {
    label: "3 ft 3 in",
    run: () => feetAndInchesToMm(3, 3) === 991,
    expected: "991 mm",
    actual: () => `${feetAndInchesToMm(3, 3)} mm`,
  },
  {
    label: "4 ft 6.5 in",
    run: () => feetAndInchesToMm(4, 6.5) === 1384,
    expected: "1384 mm",
    actual: () => `${feetAndInchesToMm(4, 6.5)} mm`,
  },
  {
    label: "Direct mm 1219.33",
    run: () => normalizeMm(1219.33) === 1219,
    expected: "1219 mm",
    actual: () => `${normalizeMm(1219.33)} mm`,
  },
  {
    label: "Direct mm 1219.8",
    run: () => normalizeMm(1219.8) === 1220,
    expected: "1220 mm",
    actual: () => `${normalizeMm(1219.8)} mm`,
  },
];

function main() {
  let failed = false;

  console.log("Unit conversion tests\n");
  for (const test of tests) {
    const pass = test.run();
    console.log(`  ${test.label}: ${pass ? "PASS" : "FAIL"}`);
    if (!pass) {
      console.log(`    expected ${test.expected}, got ${test.actual()}`);
      failed = true;
    }
  }

  if (failed) {
    process.exit(1);
  }

  console.log("\nAll unit conversion tests passed.");
}

main();
