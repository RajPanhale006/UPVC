import type { DoorConfiguration, DoorCuttingOptions, DoorHardwareSettings } from "./types";

export const DOOR_CONFIGURATION_LABELS: Record<DoorConfiguration, string> = {
  single: "Single Door",
  double: "Double Door",
};

export const DOOR_OPENING_SIDE_LABELS = {
  left: "Left opening",
  right: "Right opening",
} as const;

export const DOOR_OPENING_DIRECTION_LABELS = {
  inward: "Inward opening",
  outward: "Outward opening",
} as const;

export function getDefaultSingleDoorHardware(): DoorHardwareSettings {
  return {
    casementEspagQty: 1,
    espagBacksetMm: 30,
    espagLengthMm: 1800,
    casementKeepsQty: 4,
    handleSetQty: 1,
    pin3dHingesQty: 4,
    hingeCapacityKg: 120,
    hinges3dQty: 0,
    shootBoltsQty: 0,
  };
}

export function getDefaultDoubleDoorHardware(): DoorHardwareSettings {
  return {
    casementEspagQty: 1,
    espagBacksetMm: 30,
    espagLengthMm: 1800,
    casementKeepsQty: 0,
    handleSetQty: 1,
    pin3dHingesQty: 0,
    hingeCapacityKg: 0,
    hinges3dQty: 8,
    shootBoltsQty: 2,
  };
}

export function getDefaultDoorHardware(
  configuration: DoorConfiguration,
): DoorHardwareSettings {
  return configuration === "double"
    ? getDefaultDoubleDoorHardware()
    : getDefaultSingleDoorHardware();
}

export function createDefaultDoorCuttingOptions(
  configuration: DoorConfiguration = "single",
): DoorCuttingOptions {
  return {
    configuration,
    openingSide: "left",
    openingDirection: "inward",
    hardware: getDefaultDoorHardware(configuration),
  };
}

export function applyDoorConfigurationDefaults(
  options: DoorCuttingOptions,
  configuration: DoorConfiguration,
): DoorCuttingOptions {
  if (options.configuration === configuration) {
    return options;
  }
  return {
    ...options,
    configuration,
    hardware: getDefaultDoorHardware(configuration),
  };
}

export function formatDoorHardwareSummary(
  options: DoorCuttingOptions,
): string[] {
  const { hardware, configuration, openingSide, openingDirection } = options;
  const lines: string[] = [
    `${DOOR_OPENING_SIDE_LABELS[openingSide]} · ${DOOR_OPENING_DIRECTION_LABELS[openingDirection]}`,
  ];

  if (configuration === "single") {
    lines.push(
      `${hardware.casementEspagQty} Casement Espag (${hardware.espagBacksetMm} mm backset, ${hardware.espagLengthMm} mm)`,
      `${hardware.casementKeepsQty} Casement Keeps`,
      `${hardware.handleSetQty} Handle Set`,
      `${hardware.pin3dHingesQty} Pin 3D Hinges (capacity ${hardware.hingeCapacityKg} kg)`,
    );
  } else {
    lines.push(
      `${hardware.hinges3dQty} 3D Hinges`,
      `${hardware.casementEspagQty} Espag`,
      `${hardware.handleSetQty} Handle Set`,
      `${hardware.shootBoltsQty} Shoot Bolts`,
    );
  }

  return lines;
}
