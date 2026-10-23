/**
 * Product preview architecture tests — Phase 2.
 * Run: npm run verify:product-preview
 */
import { createDefaultCuttingOptions } from "../lib/cutting";
import { createDefaultDoorCuttingOptions } from "../lib/cutting/door";
import { getDefaultEstimationInputs } from "../lib/estimation/defaults";
import { createWindowRow } from "../lib/quotation/defaults";

import {
  buildDoorPreviewData,
  buildPreviewDataFromEstimation,
  buildPreviewDataFromQuotationRow,
  buildWindowPreviewData,
  resolveQuotationPreviewData,
} from "../components/product-preview/preview-mapper";
import {
  computePreviewSizing,
  getWindowPanelLayout,
} from "../components/product-preview/preview-utils";

let failed = 0;

function assert(label: string, ok: boolean, detail = ""): void {
  console.log(`${ok ? "PASS" : "FAIL"}: ${label}${detail ? ` (${detail})` : ""}`);
  if (!ok) failed += 1;
}

console.log("Product preview architecture tests\n");

// Window track layouts
assert(
  "2 Track panels",
  getWindowPanelLayout("2-track-t60").join(",") === "glass,glass",
);
assert(
  "2.5 Track panels",
  getWindowPanelLayout("2.5-track-t60").join(",") === "glass,net,glass",
);
assert(
  "3 Track 2 Glass + 1 Net",
  getWindowPanelLayout("3-track-t109", "two-glass-one-net").join(",") ===
    "glass,glass,net",
);
assert(
  "3 Track 3 Glass + No Net",
  getWindowPanelLayout("3-track-t109", "three-glass-no-net").join(",") ===
    "glass,glass,glass",
);

// Door configurations
const singleLeft = buildDoorPreviewData({
  widthMm: 862,
  heightMm: 2141,
  configuration: "single",
  openingSide: "left",
  openingDirection: "inward",
});
assert("Single left-opening door", singleLeft.productType === "door" && singleLeft.door?.openingSide === "left");

const singleRight = buildDoorPreviewData({
  widthMm: 862,
  heightMm: 2141,
  openingSide: "right",
  openingDirection: "outward",
});
assert("Single right outward door", singleRight.door?.openingSide === "right" && singleRight.door?.openingDirection === "outward");

const doubleDoor = buildDoorPreviewData({
  widthMm: 1808,
  heightMm: 2425,
  configuration: "double",
  openingSide: "left",
  flatMullionMm: 2229,
});
assert("Double door with mullion flag", doubleDoor.door?.configuration === "double" && doubleDoor.door?.showFlatMullion === true);

// Sizing extremes
const narrow = computePreviewSizing(400, 2000, "detailed");
assert("Very narrow product sizing", narrow.viewH > narrow.viewW, `${narrow.viewW}x${narrow.viewH}`);

const wide = computePreviewSizing(5000, 1200, "detailed");
assert("Very wide product sizing", wide.viewW >= 280, `${wide.viewW}x${wide.viewH}`);

const tallDoor = computePreviewSizing(900, 2400, "compact");
assert("Very tall door compact mode", tallDoor.viewH >= 180, `${tallDoor.viewW}x${tallDoor.viewH}`);

const thumb = computePreviewSizing(1187, 1208, "thumbnail");
assert("Thumbnail mode smaller canvas", thumb.maxWidthPx <= 140);

const pdf = computePreviewSizing(1187, 1208, "pdf");
assert("PDF mode sizing", pdf.viewW >= 280);

// Estimation mapper
const windowEst = buildPreviewDataFromEstimation(
  {
    ...getDefaultEstimationInputs(),
    widthFeet: 3,
    widthInches: 10.7323,
    heightFeet: 3,
    heightInches: 11.5591,
    trackSystemId: "2-track-t60",
  },
  createDefaultCuttingOptions("2-track-t60", "sarik"),
);
assert("Estimation window preview", windowEst.productType === "window" && windowEst.widthMm === 1187);

const doorEst = buildPreviewDataFromEstimation({
  ...getDefaultEstimationInputs(),
  productKind: "door",
  doorSettings: createDefaultDoorCuttingOptions("double"),
});
assert("Estimation door preview", doorEst.productType === "door" && doorEst.door?.configuration === "double");

// Quotation backward compatibility (no previewData)
const legacyWindowRow = {
  ...createWindowRow("3-track-upvc"),
  length: 1187,
  height: 1208,
  unit: "mm" as const,
};
const derivedWindow = buildPreviewDataFromQuotationRow(legacyWindowRow);
assert(
  "Legacy quotation row fallback (window)",
  derivedWindow.productType === "window" && derivedWindow.window?.trackSystemId === "3-track-t109",
);

const legacyDoorRow = {
  ...createWindowRow("upvc-door"),
  length: 862,
  height: 2141,
  unit: "mm" as const,
  doorConfiguration: "single" as const,
  openingSide: "left" as const,
  openingDirection: "inward" as const,
};
const derivedDoor = resolveQuotationPreviewData(legacyDoorRow);
assert(
  "Legacy quotation row fallback (door)",
  derivedDoor.productType === "door" && derivedDoor.door?.configuration === "single",
);

// Mixed quotation
const mixed = [
  buildPreviewDataFromQuotationRow(createWindowRow("2-track-upvc")),
  buildPreviewDataFromQuotationRow(createWindowRow("upvc-door")),
];
assert(
  "Mixed quotation types",
  mixed[0]!.productType === "window" && mixed[1]!.productType === "door",
);

// Optional labels off
const noLabels = buildWindowPreviewData({
  trackSystemId: "2-track-t60",
  widthMm: 1000,
  heightMm: 1000,
});
noLabels.showLabels = false;
noLabels.showLegend = false;
assert("Missing optional labels config", noLabels.showLabels === false);

console.log(`\n${failed === 0 ? "All preview tests passed." : `${failed} test(s) failed.`}`);
process.exit(failed > 0 ? 1 : 0);
