import { createDefaultCuttingOptions } from "@/lib/cutting/presets";
import {
  SARIK_GLASS_SASH_QTY,
  SARIK_NET_SASH_QTY,
} from "@/lib/cutting/sarik-method";
import { createDefaultDoorCuttingOptions } from "@/lib/cutting/door";
import { createProductFromEstimation } from "@/lib/jobs/products";
import type { JobProduct } from "@/lib/jobs/types";
import { getDefaultEstimationInputs } from "@/lib/estimation/defaults";
import { mmToFeetInches } from "@/lib/units/conversion";

import { extractCutPiecesFromJobProduct } from "./extract-from-product";
import {
  groupCutPiecesByProfileCode,
  sumPieceQuantity,
} from "./extract-pieces";
import { optimizeWorkshopJob } from "./optimize-workshop-job";
import { allBarsWithinStockLength } from "./validate";

export type Phase2TestResult = {
  label: string;
  ok: boolean;
  messages: string[];
};

function buildTwoGlassOneNetProduct(label = "W01 — 1187×1208"): JobProduct {
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
  };
  const product = createProductFromEstimation("JOB-PHASE2", "window", inputs, [], label);
  product.cuttingOptions = {
    ...createDefaultCuttingOptions("3-track-t109", "sarik"),
    threeTrackSashConfiguration: "two-glass-one-net",
  };
  return product;
}

function buildSingleDoorProduct(label = "D01 — 862×2141"): JobProduct {
  const width = mmToFeetInches(862);
  const height = mmToFeetInches(2141);
  const inputs = {
    ...getDefaultEstimationInputs(),
    productKind: "door" as const,
    widthFeet: width.feet,
    widthInches: width.inches,
    heightFeet: height.feet,
    heightInches: height.inches,
    numberOfWindows: 1,
    doorSettings: createDefaultDoorCuttingOptions("single"),
  };
  return createProductFromEstimation("JOB-PHASE2", "door", inputs, ["W01"], label);
}

export function runTwoGlassOneNetPieceExtractionTest(): Phase2TestResult {
  const product = buildTwoGlassOneNetProduct();
  const pieces = extractCutPiecesFromJobProduct("JOB-PHASE2", product);
  const messages: string[] = [];

  const frameQty = sumPieceQuantity(pieces, "FRAME");
  const glassSashQty = sumPieceQuantity(pieces, "GLASS_SASH");
  const screenSashQty = sumPieceQuantity(pieces, "SCREEN_SASH");
  const beadingQty = sumPieceQuantity(pieces, "BEADING");
  const interlockQty = sumPieceQuantity(pieces, "INTERLOCK");
  const steelQty = sumPieceQuantity(pieces, "REINFORCEMENT");

  if (frameQty !== 4) messages.push(`FRAME qty expected 4, got ${frameQty}`);
  if (glassSashQty !== SARIK_GLASS_SASH_QTY * 3) {
    messages.push(
      `GLASS_SASH qty expected ${SARIK_GLASS_SASH_QTY * 3}, got ${glassSashQty}`,
    );
  }
  if (screenSashQty !== SARIK_NET_SASH_QTY * 3) {
    messages.push(
      `SCREEN_SASH qty expected ${SARIK_NET_SASH_QTY * 3}, got ${screenSashQty}`,
    );
  }
  if (beadingQty !== SARIK_GLASS_SASH_QTY * 2) {
    messages.push(
      `BEADING qty expected ${SARIK_GLASS_SASH_QTY * 2}, got ${beadingQty}`,
    );
  }
  const interlockQtyExpected =
    createDefaultCuttingOptions("3-track-t109", "sarik").interlockQty;
  if (interlockQty !== interlockQtyExpected) {
    messages.push(
      `INTERLOCK qty expected ${interlockQtyExpected} (current system rule), got ${interlockQty}`,
    );
  }
  if (steelQty !== 10) messages.push(`REINFORCEMENT qty expected 10, got ${steelQty}`);

  const glassLines = pieces.filter((piece) => piece.componentType === "GLASS_SASH");
  const netLines = pieces.filter((piece) => piece.componentType === "SCREEN_SASH");
  if (glassLines.length !== 3) {
    messages.push(`Expected 3 glass sash cut lines, got ${glassLines.length}`);
  }
  if (netLines.length !== 3) {
    messages.push(`Expected 3 net sash cut lines, got ${netLines.length}`);
  }

  const hasGlass = pieces.some((piece) => piece.componentLabel === "Glass");
  const hasMesh = pieces.some((piece) =>
    (piece.componentLabel ?? "").toLowerCase().includes("jaali"),
  );
  if (hasGlass) messages.push("Glass panel must not appear in bar cut pieces");
  if (hasMesh) messages.push("Mesh panel must not appear in bar cut pieces");

  return {
    label: "3 Track / 2 Glass + 1 Net piece extraction",
    ok: messages.length === 0 && pieces.length > 0,
    messages,
  };
}

export function runDoorPieceExtractionTest(): Phase2TestResult {
  const product = buildSingleDoorProduct();
  const pieces = extractCutPiecesFromJobProduct("JOB-PHASE2", product);
  const messages: string[] = [];

  const frameQty = sumPieceQuantity(pieces, "FRAME");
  const sashQty = sumPieceQuantity(pieces, "DOOR_SASH");
  const beadingQty = sumPieceQuantity(pieces, "BEADING");

  if (frameQty !== 4) messages.push(`FRAME qty expected 4, got ${frameQty}`);
  if (sashQty !== 4) messages.push(`DOOR_SASH qty expected 4, got ${sashQty}`);
  if (beadingQty !== 4) messages.push(`BEADING qty expected 4, got ${beadingQty}`);

  const profileCodes = new Set(pieces.map((piece) => piece.profileCode));
  if (!profileCodes.has("P60A-052")) {
    messages.push("Missing frame profile P60A-052");
  }
  if (!profileCodes.has("P60A-057")) {
    messages.push("Missing sash profile P60A-057");
  }
  if (!profileCodes.has("P60A-059")) {
    messages.push("Missing beading profile P60A-059");
  }

  return {
    label: "Single door piece extraction",
    ok: messages.length === 0 && pieces.length > 0,
    messages,
  };
}

export function runJobLevelOptimizationTest(): Phase2TestResult {
  const windowA = buildTwoGlassOneNetProduct("W01 — 1187×1208");
  const windowB = {
    ...buildTwoGlassOneNetProduct("W02 — 1187×1208"),
    id: "JOB-PHASE2-W02",
  };

  const result = optimizeWorkshopJob({
    jobId: "JOB-PHASE2",
    products: [windowA, windowB],
  });

  const messages: string[] = [];
  const profileCodes = Object.keys(result.piecesByProfileCode);

  if (profileCodes.length < 4) {
    messages.push(`Expected multiple profile codes, got ${profileCodes.join(", ")}`);
  }

  for (const [profileCode, groupedPieces] of Object.entries(result.piecesByProfileCode)) {
    const foreign = groupedPieces.filter((piece) => piece.profileCode !== profileCode);
    if (foreign.length > 0) {
      messages.push(`Profile group ${profileCode} contains foreign pieces`);
    }
  }

  const frameBars = result.optimization.barPlans.filter(
    (bar) => bar.profileCode === "T109-600",
  );
  const packedAcrossWindows =
    frameBars.some((bar) => bar.cuts.some((cut) => cut.windowRef?.startsWith("W01"))) &&
    frameBars.some((bar) => bar.cuts.some((cut) => cut.windowRef?.startsWith("W02")));

  if (!packedAcrossWindows) {
    messages.push("Job-level frame bars should combine W01 and W02 cuts when possible");
  }

  if (!allBarsWithinStockLength(result.optimization.barPlans)) {
    messages.push("One or more optimized bars exceed stock length");
  }

  const totalNewBars = result.optimization.profileSummaries.reduce(
    (sum, row) => sum + row.newBarsRequired,
    0,
  );
  if (totalNewBars <= 0) {
    messages.push("Expected at least one new full bar in multi-window job");
  }

  return {
    label: "Job-level optimization across multiple windows",
    ok: messages.length === 0,
    messages,
  };
}

export function runProfileCodeIsolationInBarsTest(): Phase2TestResult {
  const product = buildTwoGlassOneNetProduct();
  const result = optimizeWorkshopJob({
    jobId: "JOB-PHASE2",
    products: [product],
  });

  const messages: string[] = [];
  for (const bar of result.optimization.barPlans) {
    const mixed = bar.cuts.some(() => false) || bar.profileCode.length === 0;
    if (mixed) {
      messages.push(`${bar.barId} has invalid profile assignment`);
    }
  }

  return {
    label: "Optimized bars never mix profile codes",
    ok:
      messages.length === 0 &&
      result.optimization.barPlans.every((bar) => bar.cuts.length > 0),
    messages,
  };
}

export function getPhase2SampleWindowPieces() {
  const product = buildTwoGlassOneNetProduct();
  return extractCutPiecesFromJobProduct("JOB-PHASE2", product);
}

export function getPhase2SampleDoorPieces() {
  const product = buildSingleDoorProduct();
  return extractCutPiecesFromJobProduct("JOB-PHASE2", product);
}

export function getPhase2SampleJobOptimization() {
  const windowA = buildTwoGlassOneNetProduct("W01 — 1187×1208");
  const windowB = {
    ...buildTwoGlassOneNetProduct("W02 — 1187×1208"),
    id: "JOB-PHASE2-W02",
  };
  const door = buildSingleDoorProduct("D01 — 862×2141");

  return optimizeWorkshopJob({
    jobId: "JOB-PHASE2",
    products: [windowA, windowB, door],
  });
}

export function runAllPhase2ExtractionTests(): Phase2TestResult[] {
  return [
    runTwoGlassOneNetPieceExtractionTest(),
    runDoorPieceExtractionTest(),
    runJobLevelOptimizationTest(),
    runProfileCodeIsolationInBarsTest(),
  ];
}

export function groupedPiecesForDisplay(pieces: ReturnType<typeof extractCutPiecesFromJobProduct>) {
  return groupCutPiecesByProfileCode(pieces);
}
