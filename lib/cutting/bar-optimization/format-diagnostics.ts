import type { CutPiece } from "./types";
import type { OptimizedBarPlan } from "./types";
import type { WorkshopJobOptimizationResult } from "./optimize-workshop-job";

export function formatCutPieceLine(piece: CutPiece): string {
  return [
    piece.windowRef ?? piece.productId ?? "—",
    piece.componentType,
    piece.profileCode,
    piece.componentLabel ?? piece.componentType,
    `${piece.lengthMm} mm`,
    `qty ${piece.quantity}`,
    piece.cuttingAngle ?? "—",
  ].join(" | ");
}

export function formatGroupedPieces(
  piecesByProfileCode: Record<string, CutPiece[]>,
): string[] {
  return Object.entries(piecesByProfileCode)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([profileCode, pieces]) => {
      const totalQty = pieces.reduce((sum, piece) => sum + piece.quantity, 0);
      const netLengthMm = pieces.reduce(
        (sum, piece) => sum + piece.lengthMm * piece.quantity,
        0,
      );
      return `${profileCode}: ${pieces.length} line(s), ${totalQty} physical cut(s), ${netLengthMm} mm net`;
    });
}

export function formatOptimizedBarPlan(bar: OptimizedBarPlan): string[] {
  const lines = [
    `Bar ${bar.barId} — ${bar.profileCode} — stock ${bar.standardBarLengthMm} mm`,
  ];

  for (const cut of bar.cuts) {
    lines.push(
      `  - ${cut.windowRef ?? "—"} · ${cut.componentLabel ?? cut.componentType} — ${cut.lengthMm} mm`,
    );
  }

  lines.push(`  - Kerf — ${bar.totalKerfMm} mm`);
  lines.push(`  - Used — ${bar.usedLengthMm} mm`);
  lines.push(`  - Remaining — ${bar.remainingLengthMm} mm`);
  lines.push(
    `  - Status — ${bar.leftoverStatus === "REUSABLE_LEFTOVER" ? "REUSABLE_LEFTOVER" : "SCRAP"} (reusable ${bar.reusableLeftoverMm} mm, scrap ${bar.scrapMm} mm)`,
  );
  lines.push(`  - Source — ${bar.fromInventory ? "inventory leftover" : "new full bar"}`);

  return lines;
}

export function formatWorkshopJobOptimizationReport(
  result: WorkshopJobOptimizationResult,
): string {
  const sections: string[] = [];

  sections.push("PHYSICAL CUT PIECES");
  for (const piece of result.cutPieces) {
    sections.push(formatCutPieceLine(piece));
  }

  sections.push("");
  sections.push("GROUPED BY PROFILE CODE");
  sections.push(...formatGroupedPieces(result.piecesByProfileCode));

  sections.push("");
  sections.push("OPTIMIZED BARS");
  for (const bar of result.optimization.barPlans) {
    sections.push(...formatOptimizedBarPlan(bar));
    sections.push("");
  }

  sections.push("PROFILE SUMMARY");
  for (const summary of result.optimization.profileSummaries) {
    sections.push(
      [
        summary.profileCode,
        `new bars ${summary.newBarsRequired}`,
        `theoretical ${summary.theoreticalBars}`,
        `net ${summary.netRequiredLengthMm} mm`,
        `purchased ${summary.purchasedLengthMm} mm`,
        `kerf ${summary.totalKerfMm} mm`,
        `reusable ${summary.reusableLeftoverMm} mm`,
        `scrap ${summary.scrapMm} mm`,
      ].join(" | "),
    );
  }

  return sections.join("\n");
}
