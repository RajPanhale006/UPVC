import type { CutAngle, EnhancedCutRow } from "@/lib/cutting/types";
import {
  formatFtInches,
  formatInches,
  lengthToRunningFt,
} from "@/lib/cutting/format-units";

import { DOOR_PROFILE_CODES } from "./constants";
import { calculateSarikDoorComponents, validateDoorDimensions } from "./sarik-door-method";
import type {
  DoorComponentSizes,
  DoorCuttingOptions,
  DoorCuttingResult,
  DoorCuts,
  DoorDimensions,
} from "./types";
import type { RunningFeetLine } from "@/lib/cutting/types";

function buildDoorCuts(components: DoorComponentSizes): DoorCuts {
  const { frame, sash, beading, glass, flatMullionMm } = components;
  return {
    frameTop: frame.widthMm,
    frameBottom: frame.widthMm,
    frameLeft: frame.heightMm,
    frameRight: frame.heightMm,
    sashWidth: sash.widthMm,
    sashHeight: sash.heightMm,
    sashQty: sash.quantity,
    beadingWidth: beading.widthMm,
    beadingHeight: beading.heightMm,
    glassWidth: glass.widthMm,
    glassHeight: glass.heightMm,
    flatMullion: flatMullionMm,
  };
}

type RowDef = {
  item: string;
  code: string;
  qty: number;
  mm: number;
  cross?: number;
  angle: CutAngle;
  notes: string;
};

function mapTableRows(rows: RowDef[], numberOfDoors: number): EnhancedCutRow[] {
  const n = Math.max(1, numberOfDoors);
  return rows.map((row, index) => ({
    srNo: index + 1,
    item: row.item,
    profileCode: row.code,
    qtyPerWindow: row.qty,
    cutSizeMm: row.mm,
    afterWeldingMm: null,
    afterWeldingCrossMm: null,
    cutSizeCrossMm: row.cross,
    cutSizeInch:
      row.cross != null
        ? `${formatInches(row.mm)} × ${formatInches(row.cross)}`
        : formatInches(row.mm),
    cutSizeFtInch:
      row.cross != null
        ? `${formatFtInches(row.mm)} × ${formatFtInches(row.cross)}`
        : formatFtInches(row.mm),
    cutAngle: row.angle,
    totalQty: row.qty * n,
    totalRunningFt: lengthToRunningFt(row.mm, row.qty * n),
    notes: row.notes,
  }));
}

function buildSingleDoorRows(cuts: DoorCuts): RowDef[] {
  return [
    {
      item: "Frame Top",
      code: DOOR_PROFILE_CODES.frame,
      qty: 1,
      mm: cuts.frameTop,
      angle: "45° both side",
      notes: "Long point to long point",
    },
    {
      item: "Frame Bottom",
      code: DOOR_PROFILE_CODES.frame,
      qty: 1,
      mm: cuts.frameBottom,
      angle: "45° both side",
      notes: "Long point to long point",
    },
    {
      item: "Frame Left",
      code: DOOR_PROFILE_CODES.frame,
      qty: 1,
      mm: cuts.frameLeft,
      angle: "45° both side",
      notes: "Long point to long point",
    },
    {
      item: "Frame Right",
      code: DOOR_PROFILE_CODES.frame,
      qty: 1,
      mm: cuts.frameRight,
      angle: "45° both side",
      notes: "Long point to long point",
    },
    {
      item: "Sash Top",
      code: DOOR_PROFILE_CODES.sash,
      qty: 1,
      mm: cuts.sashWidth,
      angle: "45° both side",
      notes: "Long point to long point",
    },
    {
      item: "Sash Bottom",
      code: DOOR_PROFILE_CODES.sash,
      qty: 1,
      mm: cuts.sashWidth,
      angle: "45° both side",
      notes: "Long point to long point",
    },
    {
      item: "Sash Left",
      code: DOOR_PROFILE_CODES.sash,
      qty: 1,
      mm: cuts.sashHeight,
      angle: "45° both side",
      notes: "Long point to long point",
    },
    {
      item: "Sash Right",
      code: DOOR_PROFILE_CODES.sash,
      qty: 1,
      mm: cuts.sashHeight,
      angle: "45° both side",
      notes: "Long point to long point",
    },
    {
      item: "Beading H",
      code: DOOR_PROFILE_CODES.beading,
      qty: 2,
      mm: cuts.beadingWidth,
      angle: "45° both side",
      notes: "Long point to long point",
    },
    {
      item: "Beading V",
      code: DOOR_PROFILE_CODES.beading,
      qty: 2,
      mm: cuts.beadingHeight,
      angle: "45° both side",
      notes: "Long point to long point",
    },
    {
      item: "Glass",
      code: "GLASS",
      qty: 1,
      mm: cuts.glassWidth,
      cross: cuts.glassHeight,
      angle: "90° straight",
      notes: "Panel / glass size",
    },
  ];
}

function buildDoubleDoorRows(cuts: DoorCuts): RowDef[] {
  const sashPrefix = (index: 1 | 2, part: string): RowDef => ({
    item: `Sash ${index} ${part}`,
    code: DOOR_PROFILE_CODES.sash,
    qty: 1,
    mm: part === "Top" || part === "Bottom" ? cuts.sashWidth : cuts.sashHeight,
    angle: "45° both side",
    notes: "Long point to long point",
  });

  const rows: RowDef[] = [
    {
      item: "Frame Top",
      code: DOOR_PROFILE_CODES.frame,
      qty: 1,
      mm: cuts.frameTop,
      angle: "45° both side",
      notes: "Long point to long point",
    },
    {
      item: "Frame Bottom",
      code: DOOR_PROFILE_CODES.frame,
      qty: 1,
      mm: cuts.frameBottom,
      angle: "45° both side",
      notes: "Long point to long point",
    },
    {
      item: "Frame Left",
      code: DOOR_PROFILE_CODES.frame,
      qty: 1,
      mm: cuts.frameLeft,
      angle: "45° both side",
      notes: "Long point to long point",
    },
    {
      item: "Frame Right",
      code: DOOR_PROFILE_CODES.frame,
      qty: 1,
      mm: cuts.frameRight,
      angle: "45° both side",
      notes: "Long point to long point",
    },
    sashPrefix(1, "Top"),
    sashPrefix(1, "Bottom"),
    sashPrefix(1, "Left"),
    sashPrefix(1, "Right"),
    sashPrefix(2, "Top"),
    sashPrefix(2, "Bottom"),
    sashPrefix(2, "Left"),
    sashPrefix(2, "Right"),
    {
      item: "Beading H",
      code: DOOR_PROFILE_CODES.beading,
      qty: 4,
      mm: cuts.beadingWidth,
      angle: "45° both side",
      notes: "Long point to long point",
    },
    {
      item: "Beading V",
      code: DOOR_PROFILE_CODES.beading,
      qty: 4,
      mm: cuts.beadingHeight,
      angle: "45° both side",
      notes: "Long point to long point",
    },
    {
      item: "Glass",
      code: "GLASS",
      qty: 2,
      mm: cuts.glassWidth,
      cross: cuts.glassHeight,
      angle: "90° straight",
      notes: "Panel / glass size per sash",
    },
  ];

  if (cuts.flatMullion != null && cuts.flatMullion > 0) {
    rows.push({
      item: "Flat Mullion",
      code: DOOR_PROFILE_CODES.mullion,
      qty: 1,
      mm: cuts.flatMullion,
      angle: "90° straight",
      notes: "Centre mullion",
    });
  }

  return rows;
}

function buildDoorRunningFeetSummary(
  tableRows: EnhancedCutRow[],
): RunningFeetLine[] {
  const grouped = new Map<string, number>();
  for (const row of tableRows) {
    if (row.item === "Glass") continue;
    const label = row.item.startsWith("Frame")
      ? "Frame"
      : row.item.startsWith("Sash")
        ? "Sash"
        : row.item.startsWith("Beading")
          ? "Beading"
          : row.item === "Flat Mullion"
            ? "Mullion"
            : row.item;
    grouped.set(label, (grouped.get(label) ?? 0) + row.totalRunningFt);
  }

  return Array.from(grouped.entries()).map(([label, feet]) => ({
    label,
    feet: Math.round(feet * 100) / 100,
  }));
}

export function calculateDoorCutting(
  dimensions: DoorDimensions,
  options: DoorCuttingOptions,
  numberOfDoors = 1,
): DoorCuttingResult | null {
  if (validateDoorDimensions(dimensions, options.configuration)) {
    return null;
  }

  const components = calculateSarikDoorComponents(
    dimensions,
    options.configuration,
  );
  const cuts = buildDoorCuts(components);
  const rowDefs =
    options.configuration === "double"
      ? buildDoubleDoorRows(cuts)
      : buildSingleDoorRows(cuts);
  const tableRows = mapTableRows(rowDefs, numberOfDoors);
  return {
    components,
    cuts,
    tableRows,
    runningFeetSummary: buildDoorRunningFeetSummary(tableRows),
  };
}

export function isDoorCalculationReady(
  dimensions: DoorDimensions,
  configuration: import("./types").DoorConfiguration,
): boolean {
  return validateDoorDimensions(dimensions, configuration) == null;
}
