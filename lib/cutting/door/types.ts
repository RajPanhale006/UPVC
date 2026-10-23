import type { CutAngle, EnhancedCutRow, RunningFeetLine } from "@/lib/cutting/types";

export type DoorConfiguration = "single" | "double";

export type DoorOpeningSide = "left" | "right";

export type DoorOpeningDirection = "inward" | "outward";

export type DoorHardwareSettings = {
  casementEspagQty: number;
  espagBacksetMm: number;
  espagLengthMm: number;
  casementKeepsQty: number;
  handleSetQty: number;
  pin3dHingesQty: number;
  hingeCapacityKg: number;
  hinges3dQty: number;
  shootBoltsQty: number;
};

export type DoorCuttingOptions = {
  configuration: DoorConfiguration;
  openingSide: DoorOpeningSide;
  openingDirection: DoorOpeningDirection;
  hardware: DoorHardwareSettings;
};

export type DoorDimensions = {
  widthMm: number;
  heightMm: number;
};

export type DoorComponentSizes = {
  finalWidthMm: number;
  finalHeightMm: number;
  frame: { widthMm: number; heightMm: number };
  sash: { widthMm: number; heightMm: number; quantity: number };
  beading: { widthMm: number; heightMm: number };
  glass: { widthMm: number; heightMm: number };
  flatMullionMm: number | null;
};

export type DoorCuts = {
  frameTop: number;
  frameBottom: number;
  frameLeft: number;
  frameRight: number;
  sashWidth: number;
  sashHeight: number;
  sashQty: number;
  beadingWidth: number;
  beadingHeight: number;
  glassWidth: number;
  glassHeight: number;
  flatMullion: number | null;
};

export type DoorCuttingResult = {
  components: DoorComponentSizes;
  cuts: DoorCuts;
  tableRows: EnhancedCutRow[];
  runningFeetSummary: RunningFeetLine[];
};

export type { CutAngle };
