export type HardwareCategory =
  | "espag"
  | "keep"
  | "handle"
  | "hinge"
  | "shoot-bolt"
  | "lock"
  | "cylinder"
  | "accessory";

export type HardwareUnit = "piece" | "set" | "pair";

export type DoorTypeFilter = "single-door" | "double-door";

export type HardwareMasterItem = {
  id: string;
  code: string;
  name: string;
  specification?: string;
  category: HardwareCategory;
  applicableProduct: "door" | "window" | "both";
  applicableDoorTypes: DoorTypeFilter[];
  unit: HardwareUnit;
  defaultSingleDoorQty?: number;
  defaultDoubleDoorQty?: number;
  /** Undefined = rate not configured. Zero only when allowZeroCost is true. */
  rate?: number;
  allowZeroCost?: boolean;
  isActive: boolean;
  isDraft?: boolean;
  notes?: string;
  updatedAt?: string;
  updatedBy?: string;
};

export type DoorHardwareMasterSettings = {
  items: HardwareMasterItem[];
  updatedAt?: string;
  updatedBy?: string;
};

export type DoorHardwareJobOverride = {
  quantityOverride?: number;
  rateOverride?: number;
  reason?: string;
  updatedBy?: string;
  updatedAt?: string;
};

export type DoorHardwareCostItem = {
  hardwareId: string;
  name: string;
  specification?: string;
  quantity: number;
  masterQuantity: number;
  unit: HardwareUnit;
  unitLabel: string;
  unitRate?: number;
  masterRate?: number;
  totalCost?: number;
  isRateMissing: boolean;
  isQuantityOverridden: boolean;
  isRateOverridden: boolean;
};

export type DoorHardwareCostResult = {
  items: DoorHardwareCostItem[];
  totalDoorHardwareCost: number;
  hasMissingDoorHardwareRates: boolean;
  missingDoorHardwareRateItems: string[];
};

export const HARDWARE_UNIT_LABELS: Record<HardwareUnit, string> = {
  piece: "Per Piece",
  set: "Per Set",
  pair: "Per Pair",
};

export const DOOR_HARDWARE_SETTING_KEY = "doorHardwareOverrides" as const;
