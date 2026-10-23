import type { ProfileRateKey } from "@/lib/profiles/types";

export type FixedFrameConstructionMode =
  | "SINGLE_FRAME"
  | "SEPARATE_MODULES"
  | "INTERNAL_PARTITIONS";

export type FixedFrameDivisionMode = "NONE" | "AUTO" | "EQUAL" | "MANUAL";

export type FixedFrameReinforcementRule =
  | "NONE"
  | "FULL_PERIMETER"
  | "HORIZONTAL_ONLY"
  | "VERTICAL_ONLY"
  | "CUSTOM";

export type FixedFrameReinforcementSides = {
  top: boolean;
  bottom: boolean;
  left: boolean;
  right: boolean;
  internalPartitions: boolean;
};

export type FixedFrameGlassThicknessMm = 4 | 5 | 6 | 8 | 10 | 12;

export type FixedFrameMaterialCategory =
  | "upvc-frame"
  | "bead"
  | "mullion"
  | "reinforcement"
  | "glass"
  | "anchor-fasteners"
  | "fixing-screws"
  | "setting-blocks"
  | "gasket"
  | "silicone"
  | "pu-foam"
  | "module-joiner"
  | "protective-tape"
  | "cleaning"
  | "labour"
  | "transportation";

export type FixedFrameProfileSelection = {
  frameProfileKey: ProfileRateKey;
  frameProfileCode: string;
  beadProfileKey: ProfileRateKey;
  beadProfileCode: string;
  mullionProfileKey?: ProfileRateKey;
  mullionProfileCode?: string;
  reinforcementProfileKey?: ProfileRateKey;
  reinforcementProfileCode?: string;
};

/** User-facing fixed frame product settings — single source for calculation input. */
export type FixedFrameSettings = {
  constructionMode: FixedFrameConstructionMode;
  divisionMode: FixedFrameDivisionMode;
  maximumModuleWidthMm: number;
  moduleCount: number;
  sectionCount: number;
  moduleWidthsMm: number[];
  leftClearanceMm: number;
  rightClearanceMm: number;
  topClearanceMm: number;
  bottomClearanceMm: number;
  jointGapMm: number;
  manualWidthToleranceMm: number;
  profiles: FixedFrameProfileSelection;
  reinforcementRule: FixedFrameReinforcementRule;
  reinforcementSides: FixedFrameReinforcementSides;
  glassType: string;
  glassThicknessMm: FixedFrameGlassThicknessMm;
  glassRatePerSqFt: number;
  reinforcementRatePerKg: number;
  labourRatePerSqFt: number;
  transportation: number;
  standardBarLengthMm: number;
  kerfMm: number;
  minimumReusableLengthMm: number;
  savedLeftoverInventoryMm: number[];
};

export type FixedFrameModuleResult = {
  id: string;
  moduleIndex: number;
  label: string;
  widthMm: number;
  heightMm: number;
  weldedWidthMm: number;
  weldedHeightMm: number;
  glassWidthMm: number;
  glassHeightMm: number;
  glassAreaSqFt: number;
  isPartitionSection?: boolean;
};

export type FixedFrameCutPiece = {
  id: string;
  moduleId: string;
  moduleLabel: string;
  profileCode: string;
  profileKey: ProfileRateKey;
  component: string;
  lengthMm: number;
  quantity: number;
  angle: string;
  barId?: string;
  cutOrder?: number;
};

export type FixedFrameGlassPanel = {
  moduleId: string;
  moduleLabel: string;
  widthMm: number;
  heightMm: number;
  thicknessMm: FixedFrameGlassThicknessMm;
  glassType: string;
  quantity: number;
  areaSqFt: number;
  totalAreaSqFt: number;
  ratePerSqFt: number;
  totalCost: number;
};

export type FixedFrameMaterialItem = {
  id: string;
  category: FixedFrameMaterialCategory;
  itemName: string;
  profileCode?: string;
  unit: string;
  quantity: number;
  rate: number;
  amount: number;
  note?: string;
};

export type FixedFrameBarCut = {
  cutIndex: number;
  lengthMm: number;
  moduleLabel: string;
  component: string;
};

export type FixedFrameBarPlan = {
  barId: string;
  profileCode: string;
  profileKey: ProfileRateKey;
  barLengthMm: number;
  cuts: FixedFrameBarCut[];
  consumedMm: number;
  leftoverMm: number;
  reusableLeftoverMm: number;
  scrapMm: number;
  fromInventory: boolean;
};

export type FixedFrameProfileCostRow = {
  profileCode: string;
  profileKey: ProfileRateKey;
  component: string;
  cutLengthMm: number;
  quantity: number;
  totalRunningMm: number;
  standardBarLengthMm: number;
  requiredBars: number;
  purchasedLengthMm: number;
  consumedLengthMm: number;
  reusableLeftoverMm: number;
  scrapMm: number;
  weightPerMetreKg: number;
  totalWeightKg: number;
  ratePerKg: number;
  totalCost: number;
};

export type FixedFrameCalculationResult = {
  openingWidthMm: number;
  openingHeightMm: number;
  quantity: number;
  grossAreaSqFt: number;
  totalGrossAreaSqFt: number;
  constructionMode: FixedFrameConstructionMode;
  divisionMode: FixedFrameDivisionMode;
  moduleCount: number;
  sectionCount: number;
  modules: FixedFrameModuleResult[];
  cutPieces: FixedFrameCutPiece[];
  glassPanels: FixedFrameGlassPanel[];
  totalGlassAreaSqFt: number;
  totalGlassCost: number;
  totalBeadLengthMm: number;
  totalFrameLengthMm: number;
  totalMullionLengthMm: number;
  totalReinforcementLengthMm: number;
  barPlans: FixedFrameBarPlan[];
  profileCostRows: FixedFrameProfileCostRow[];
  materials: FixedFrameMaterialItem[];
  workshopCost: {
    profileCost: number;
    reinforcementCost: number;
    glassCost: number;
    beadCost: number;
    mullionCost: number;
    hardwareCost: number;
    labourCost: number;
    transportation: number;
    totalWorkshopCost: number;
    workshopCostPerSqFt: number;
  };
  warnings: string[];
};

export type FixedFrameCuttingResult = {
  components: FixedFrameModuleResult[];
  tableRows: FixedFrameCutPiece[];
  glassPanels: FixedFrameGlassPanel[];
  barPlans: FixedFrameBarPlan[];
  profileCostRows: FixedFrameProfileCostRow[];
  materials: FixedFrameMaterialItem[];
  summary: FixedFrameCalculationResult;
};
