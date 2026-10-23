import type { EnhancedCutRow } from "@/lib/cutting/types";
import { getGlassSashProfileCode } from "@/lib/cutting/presets";

import type { CutPiece, CutPieceComponentType } from "./types";

/** Workshop SKU for sliding interlock (cut table may carry frame code on the row). */
export const SLIDING_INTERLOCK_PROFILE_CODE = "T60-413";

/** Workshop SKU for sliding glass beading (cut table may carry frame code on the row). */
export const SLIDING_BEADING_PROFILE_CODE = "T88-044";

export const STEEL_PROFILE_CODE = "STEEL";

const NON_BAR_ITEMS = new Set([
  "glass",
  "jaali / mesh",
  "jaali",
  "mesh",
]);

export type CutPieceExtractionSource = {
  jobId?: string;
  productId: string;
  productKind: "window" | "door" | "fixed-frame";
  windowRef: string;
  sourceSystem?: string;
};

function normalizeItem(item: string): string {
  return item.trim().toLowerCase();
}

export function inferComponentTypeFromItem(
  item: string,
  productKind: CutPieceExtractionSource["productKind"],
): CutPieceComponentType | null {
  const normalized = normalizeItem(item);

  if (NON_BAR_ITEMS.has(normalized)) {
    return null;
  }

  if (normalized.startsWith("frame")) return "FRAME";
  if (normalized.startsWith("glass sash")) return "GLASS_SASH";
  if (normalized.startsWith("net sash")) return "SCREEN_SASH";
  if (normalized === "interlock") return "INTERLOCK";
  if (normalized.startsWith("beading")) return "BEADING";
  if (normalized.startsWith("steel")) return "REINFORCEMENT";

  if (productKind === "door") {
    if (normalized.startsWith("sash")) return "DOOR_SASH";
    if (normalized.includes("mullion")) return "MULLION";
  } else if (normalized.startsWith("sash")) {
    return "GLASS_SASH";
  }

  if (normalized.includes("mullion")) return "MULLION";
  if (normalized.includes("reinforcement")) return "REINFORCEMENT";

  return item;
}

/**
 * Resolve the physical profile SKU used for bar packing.
 * Cut dimensions come unchanged from the cut table; only the stock SKU is normalized
 * where the table row reused the frame code for interlock/beading.
 */
export function resolveOptimizationProfileCode(
  row: Pick<EnhancedCutRow, "item" | "profileCode">,
  productKind: CutPieceExtractionSource["productKind"],
): string | null {
  const componentType = inferComponentTypeFromItem(row.item, productKind);
  if (componentType == null) {
    return null;
  }

  const normalized = normalizeItem(row.item);
  if (productKind === "window") {
    if (normalized === "interlock") {
      return SLIDING_INTERLOCK_PROFILE_CODE;
    }
    if (normalized.startsWith("beading")) {
      return SLIDING_BEADING_PROFILE_CODE;
    }
    if (componentType === "GLASS_SASH") {
      return getGlassSashProfileCode();
    }
  }

  if (componentType === "REINFORCEMENT") {
    return STEEL_PROFILE_CODE;
  }

  return row.profileCode;
}

export function shouldExtractBarCutPiece(
  row: EnhancedCutRow,
  productKind: CutPieceExtractionSource["productKind"],
): boolean {
  return resolveOptimizationProfileCode(row, productKind) != null;
}

export function extractCutPiecesFromTableRows(
  tableRows: EnhancedCutRow[],
  source: CutPieceExtractionSource,
): CutPiece[] {
  const pieces: CutPiece[] = [];

  for (const row of tableRows) {
    const profileCode = resolveOptimizationProfileCode(row, source.productKind);
    const componentType = inferComponentTypeFromItem(row.item, source.productKind);
    if (profileCode == null || componentType == null || row.cutSizeMm <= 0) {
      continue;
    }

    pieces.push({
      id: `${source.productId}-${row.srNo}`,
      jobId: source.jobId,
      productId: source.productId,
      windowRef: source.windowRef,
      componentType,
      profileCode,
      lengthMm: row.cutSizeMm,
      quantity: Math.max(0, row.totalQty),
      cuttingAngle: row.cutAngle,
      sourceSystem: source.sourceSystem ?? source.productKind,
      moduleLabel: source.windowRef,
      componentLabel: row.item,
    });
  }

  return pieces.filter((piece) => piece.quantity > 0);
}

export function groupCutPiecesByProfileCode(
  pieces: CutPiece[],
): Record<string, CutPiece[]> {
  const grouped: Record<string, CutPiece[]> = {};
  for (const piece of pieces) {
    const list = grouped[piece.profileCode] ?? [];
    list.push(piece);
    grouped[piece.profileCode] = list;
  }
  return grouped;
}

export function summarizeCutPiecesByComponentType(
  pieces: CutPiece[],
): Record<string, { lineCount: number; totalQty: number; totalLengthMm: number }> {
  const summary: Record<
    string,
    { lineCount: number; totalQty: number; totalLengthMm: number }
  > = {};

  for (const piece of pieces) {
    const key = String(piece.componentType);
    const row = summary[key] ?? { lineCount: 0, totalQty: 0, totalLengthMm: 0 };
    row.lineCount += 1;
    row.totalQty += piece.quantity;
    row.totalLengthMm += piece.lengthMm * piece.quantity;
    summary[key] = row;
  }

  return summary;
}

export function sumPieceQuantity(
  pieces: CutPiece[],
  componentType: CutPieceComponentType,
): number {
  return pieces
    .filter((piece) => piece.componentType === componentType)
    .reduce((sum, piece) => sum + piece.quantity, 0);
}
