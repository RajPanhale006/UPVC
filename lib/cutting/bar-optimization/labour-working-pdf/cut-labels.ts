import type { CutPieceComponentType } from "../types";
import type { OptimizedBarCut } from "../types";

/** Short window ref for bar labels — e.g. "W01" from "W01 — 1187×1208". */
export function shortenWindowRef(windowRef?: string): string {
  if (!windowRef?.trim()) {
    return "—";
  }
  const primary = windowRef.split(/[—–-]/)[0]?.trim() ?? windowRef.trim();
  return primary.replace(/\s+/g, "");
}

export function componentTag(
  componentLabel?: string,
  componentType?: CutPieceComponentType,
): string {
  const label = (componentLabel ?? "").toLowerCase();
  const type = String(componentType ?? "").toLowerCase();

  if (label.includes("frame top") || label.includes("frame bottom")) return "H";
  if (label.includes("frame left") || label.includes("frame right")) return "W";
  if (label.includes("net sash side")) return "NS-S";
  if (label.includes("net sash top")) return "NS-T";
  if (label.includes("net sash bottom")) return "NS-B";
  if (label.includes("net sash") || type === "screen_sash") return "NS";
  if (label.includes("glass sash side") || label.includes("sash side")) return "GS-S";
  if (label.includes("glass sash top") || label.includes("sash top")) return "GS-T";
  if (label.includes("glass sash bottom") || label.includes("sash bottom")) return "GS-B";
  if (label.includes("glass sash") || type === "glass_sash") return "GS";
  if (label.includes("interlock") || type === "interlock") return "IL";
  if (label.includes("beading") || type === "beading") return "BD";
  if (label.includes("steel frame h")) return "RI-H";
  if (label.includes("steel frame v")) return "RI-V";
  if (label.includes("steel sash h")) return "RI-SH";
  if (label.includes("steel sash v")) return "RI-SV";
  if (label.includes("steel") || type === "reinforcement") return "RI";
  if (label.includes("mullion") || type === "mullion") return "ML";
  if (type === "door_sash" || label.includes("sash")) return "S";

  return (componentLabel ?? componentType ?? "CUT").slice(0, 8);
}

export function formatBarCutLabel(cut: OptimizedBarCut, sequenceNumber: number): string {
  const ref = shortenWindowRef(cut.windowRef);
  const tag = componentTag(cut.componentLabel, cut.componentType);
  return `${sequenceNumber}) ${ref}-${tag}`;
}

export function hasMiterAngle(angle?: string): boolean {
  if (!angle) return false;
  const normalized = angle.toLowerCase();
  return normalized.includes("45") || normalized.includes("miter");
}
