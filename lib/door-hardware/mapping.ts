import type { DoorConfiguration, DoorHardwareSettings } from "@/lib/cutting/door";

import type { DoorTypeFilter } from "./types";

export type DoorHardwareQuantityLine = {
  hardwareId: string;
  quantity: number;
};

export function doorConfigurationToFilter(
  configuration: DoorConfiguration,
): DoorTypeFilter {
  return configuration === "single" ? "single-door" : "double-door";
}

/** Map live door hardware qty fields to master catalog ids. */
export function getDoorHardwareQuantityLines(
  configuration: DoorConfiguration,
  hardware: DoorHardwareSettings,
): DoorHardwareQuantityLine[] {
  if (configuration === "single") {
    return [
      { hardwareId: "casement-espag", quantity: hardware.casementEspagQty },
      { hardwareId: "casement-keep", quantity: hardware.casementKeepsQty },
      { hardwareId: "handle-set", quantity: hardware.handleSetQty },
      { hardwareId: "pin-3d-hinge", quantity: hardware.pin3dHingesQty },
    ];
  }
  return [
    { hardwareId: "casement-espag", quantity: hardware.casementEspagQty },
    { hardwareId: "handle-set", quantity: hardware.handleSetQty },
    { hardwareId: "3d-hinge", quantity: hardware.hinges3dQty },
    { hardwareId: "shoot-bolt", quantity: hardware.shootBoltsQty },
  ];
}

/** Display name override for double-door espag label. */
export function getDoorHardwareDisplayName(
  hardwareId: string,
  configuration: DoorConfiguration,
  masterName: string,
): string {
  if (hardwareId === "casement-espag" && configuration === "double") {
    return "Door Espag";
  }
  if (hardwareId === "pin-3d-hinge" && configuration === "double") {
    return "3D Hinge";
  }
  return masterName;
}
