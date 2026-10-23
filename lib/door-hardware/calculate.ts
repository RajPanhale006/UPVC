import type { DoorCuttingOptions } from "@/lib/cutting/door";

import {
  doorConfigurationToFilter,
  getDoorHardwareDisplayName,
  getDoorHardwareQuantityLines,
} from "./mapping";
import type {
  DoorHardwareCostItem,
  DoorHardwareCostResult,
  DoorHardwareJobOverride,
  DoorHardwareMasterSettings,
  HardwareMasterItem,
  HardwareUnit,
} from "./types";
import { HARDWARE_UNIT_LABELS } from "./types";

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function resolveEffectiveRate(
  master: HardwareMasterItem,
  override?: DoorHardwareJobOverride,
): { rate?: number; isRateMissing: boolean; isRateOverridden: boolean } {
  if (override?.rateOverride != null && Number.isFinite(override.rateOverride)) {
    if (override.rateOverride < 0) {
      return { rate: undefined, isRateMissing: true, isRateOverridden: true };
    }
    return {
      rate: override.rateOverride,
      isRateMissing: false,
      isRateOverridden: true,
    };
  }

  if (master.allowZeroCost && master.rate === 0) {
    return { rate: 0, isRateMissing: false, isRateOverridden: false };
  }

  if (master.rate == null || !Number.isFinite(master.rate)) {
    return { rate: undefined, isRateMissing: true, isRateOverridden: false };
  }

  if (master.rate < 0) {
    return { rate: undefined, isRateMissing: true, isRateOverridden: false };
  }

  return { rate: master.rate, isRateMissing: false, isRateOverridden: false };
}

function isItemApplicable(
  item: HardwareMasterItem,
  doorType: ReturnType<typeof doorConfigurationToFilter>,
): boolean {
  if (!item.isActive || item.isDraft) return false;
  if (item.applicableProduct !== "door" && item.applicableProduct !== "both") {
    return false;
  }
  return item.applicableDoorTypes.includes(doorType);
}

export function computeDoorHardwareCost(
  doorSettings: DoorCuttingOptions,
  masterSettings: DoorHardwareMasterSettings,
  overrides?: Record<string, DoorHardwareJobOverride>,
): DoorHardwareCostResult {
  const doorType = doorConfigurationToFilter(doorSettings.configuration);
  const quantityLines = getDoorHardwareQuantityLines(
    doorSettings.configuration,
    doorSettings.hardware,
  );
  const masterById = new Map(masterSettings.items.map((item) => [item.id, item]));

  const items: DoorHardwareCostItem[] = [];
  const missing: string[] = [];
  let total = 0;

  for (const line of quantityLines) {
    const master = masterById.get(line.hardwareId);
    if (!master || !isItemApplicable(master, doorType)) continue;

    const masterQuantity = Math.max(0, line.quantity);
    if (masterQuantity <= 0) continue;

    const override = overrides?.[line.hardwareId];
    const effectiveQuantity =
      override?.quantityOverride != null && Number.isFinite(override.quantityOverride)
        ? Math.max(0, override.quantityOverride)
        : masterQuantity;

    if (effectiveQuantity <= 0) continue;

    const { rate, isRateMissing, isRateOverridden } = resolveEffectiveRate(master, override);
    const displayName = getDoorHardwareDisplayName(
      line.hardwareId,
      doorSettings.configuration,
      master.name,
    );

    if (isRateMissing) {
      missing.push(displayName);
      items.push({
        hardwareId: line.hardwareId,
        name: displayName,
        specification: master.specification,
        quantity: effectiveQuantity,
        masterQuantity,
        unit: master.unit,
        unitLabel: HARDWARE_UNIT_LABELS[master.unit],
        unitRate: undefined,
        masterRate: master.rate,
        totalCost: undefined,
        isRateMissing: true,
        isQuantityOverridden:
          override?.quantityOverride != null &&
          override.quantityOverride !== masterQuantity,
        isRateOverridden,
      });
      continue;
    }

    const lineTotal = round2(effectiveQuantity * (rate ?? 0));
    total = round2(total + lineTotal);

    items.push({
      hardwareId: line.hardwareId,
      name: displayName,
      specification: master.specification,
      quantity: effectiveQuantity,
      masterQuantity,
      unit: master.unit,
      unitLabel: HARDWARE_UNIT_LABELS[master.unit],
      unitRate: rate,
      masterRate: master.rate,
      totalCost: lineTotal,
      isRateMissing: false,
      isQuantityOverridden:
        override?.quantityOverride != null &&
        override.quantityOverride !== masterQuantity,
      isRateOverridden,
    });
  }

  return {
    items,
    totalDoorHardwareCost: round2(total),
    hasMissingDoorHardwareRates: missing.length > 0,
    missingDoorHardwareRateItems: missing,
  };
}

export function formatHardwareQuantityLabel(unit: HardwareUnit, quantity: number): string {
  if (unit === "set") {
    return `Qty: ${quantity} Set${quantity === 1 ? "" : "s"}`;
  }
  if (unit === "pair") {
    return `Qty: ${quantity} Pair${quantity === 1 ? "" : "s"}`;
  }
  return `Qty: ${quantity} Piece${quantity === 1 ? "" : "s"}`;
}
