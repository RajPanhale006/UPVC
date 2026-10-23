import { mmAreaToSqFt } from "@/lib/calculations/format";
import { calculateDoorProduct } from "@/lib/calculations/calculate-door";
import { calculateFixedFrameProduct } from "@/lib/calculations/calculate-fixed-frame";
import { calculateWindowProduct } from "@/lib/calculations/calculate-window";
import { cutPiecesFromFixedFrame } from "@/lib/cutting/bar-optimization/adapters";
import { createDefaultDoorCuttingOptions } from "@/lib/cutting/door";
import type { JobProduct } from "@/lib/jobs/types";
import { feetInchesToMm } from "@/lib/units/conversion";

import { extractCutPiecesFromTableRows, type CutPieceExtractionSource } from "./extract-pieces";
import type { CutPiece } from "./types";

function buildSource(jobId: string, product: JobProduct): CutPieceExtractionSource {
  return {
    jobId,
    productId: product.id,
    productKind: product.productKind,
    windowRef: product.label,
    sourceSystem: product.productKind,
  };
}

export function extractCutPiecesFromJobProduct(
  jobId: string,
  product: JobProduct,
  profileRatePerKg = 150,
): CutPiece[] {
  const inputs = product.estimationInputs;
  const widthMm = feetInchesToMm(inputs.widthFeet, inputs.widthInches);
  const heightMm = feetInchesToMm(inputs.heightFeet, inputs.heightInches);
  const quantity = Math.max(1, Math.floor(inputs.numberOfWindows || 1));
  const areaSqFt =
    widthMm > 0 && heightMm > 0 ? mmAreaToSqFt(widthMm, heightMm) : 0;
  const source = buildSource(jobId, product);

  if (product.productKind === "door") {
    const doorSettings =
      inputs.doorSettings ?? createDefaultDoorCuttingOptions("single");
    const door = calculateDoorProduct({
      widthMm,
      heightMm,
      quantity,
      areaSqFt,
      doorSettings,
    });
    if (!door.validation.isValid || !door.cutting) {
      return [];
    }
    return extractCutPiecesFromTableRows(door.cutting.tableRows, source);
  }

  if (product.productKind === "fixed-frame") {
    const fixed = calculateFixedFrameProduct({
      widthMm,
      heightMm,
      quantity,
      areaSqFt,
      fixedFrameSettings: inputs.fixedFrameSettings,
      profileRatePerKg,
    });
    if (!fixed.validation.isValid || !fixed.cutting) {
      return [];
    }
    return cutPiecesFromFixedFrame(fixed.cutting.tableRows, jobId).map((piece) => ({
      ...piece,
      productId: product.id,
      windowRef: product.label,
      sourceSystem: "fixed-frame",
    }));
  }

  const window = calculateWindowProduct({
    widthMm,
    heightMm,
    quantity,
    areaSqFt,
    trackSystemId: inputs.trackSystemId,
    cuttingOptions: product.cuttingOptions,
  });

  if (!window.validation.isValid || !window.cutting) {
    return [];
  }

  return extractCutPiecesFromTableRows(window.cutting.tableRows, source);
}

export function extractCutPiecesFromJobProducts(
  jobId: string,
  products: JobProduct[],
  profileRatePerKg = 150,
): CutPiece[] {
  return products.flatMap((product) =>
    extractCutPiecesFromJobProduct(jobId, product, profileRatePerKg),
  );
}
