import { getDefaultDoorHardwareMasterSettings, DEFAULT_DOOR_HARDWARE_ITEMS } from "./defaults";
import type { DoorHardwareMasterSettings, HardwareMasterItem } from "./types";

const STORAGE_KEY = "upvc-workshop-door-hardware-rates";

function mergeHardwareItem(
  defaults: HardwareMasterItem,
  saved: HardwareMasterItem | undefined,
): HardwareMasterItem {
  if (!saved) return defaults;
  return {
    ...defaults,
    ...saved,
    id: defaults.id,
    code: saved.code?.trim() || defaults.code,
    applicableDoorTypes: saved.applicableDoorTypes?.length
      ? saved.applicableDoorTypes
      : defaults.applicableDoorTypes,
  };
}

export function mergeDoorHardwareMasterSettings(
  settings: DoorHardwareMasterSettings,
): DoorHardwareMasterSettings {
  const defaults = getDefaultDoorHardwareMasterSettings();
  const savedById = new Map(settings.items.map((item) => [item.id, item]));
  const mergedDefaults = DEFAULT_DOOR_HARDWARE_ITEMS.map((item) =>
    mergeHardwareItem(item, savedById.get(item.id)),
  );
  const customItems = settings.items.filter(
    (item) => !DEFAULT_DOOR_HARDWARE_ITEMS.some((d) => d.id === item.id),
  );
  return {
    ...settings,
    items: [...mergedDefaults, ...customItems],
  };
}

export function loadDoorHardwareMasterSettings(): DoorHardwareMasterSettings {
  if (typeof window === "undefined") {
    return getDefaultDoorHardwareMasterSettings();
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultDoorHardwareMasterSettings();
    return mergeDoorHardwareMasterSettings(JSON.parse(raw) as DoorHardwareMasterSettings);
  } catch {
    return getDefaultDoorHardwareMasterSettings();
  }
}

export function saveDoorHardwareMasterSettings(settings: DoorHardwareMasterSettings): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function resetDoorHardwareMasterSettings(): DoorHardwareMasterSettings {
  const defaults = getDefaultDoorHardwareMasterSettings();
  saveDoorHardwareMasterSettings(defaults);
  return defaults;
}
