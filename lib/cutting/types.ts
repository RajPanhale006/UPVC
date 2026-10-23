export type TrackSystemId = "2-track-t60" | "2.5-track-t60" | "3-track-t109";

export type CuttingMethod = "standard" | "workshop-confirmed" | "sarik";

export type ThreeTrackSashConfiguration = "two-glass-one-net" | "three-glass-no-net";

export type SteelCalculationBase = "cutting" | "after-welding";

export type SizeType = "opening" | "final-frame";

export type SharedCuttingParams = {
  divider: number;
  shutterQty: number;
  interlockQty: number;
  glassPanelQty: number;
  glassWidthDeductionMm: number;
  glassHeightDeductionMm: number;
  beadingAddMm: number;
  steelDeductionMm: number;
};

export type StandardCuttingParams = SharedCuttingParams & {
  profileSectionMm: number;
  standardHeightMinusMm: number;
  standardWidthMinusMm: number;
};

export type WorkshopCuttingParams = SharedCuttingParams & {
  frameAddWidthMm: number;
  frameAddHeightMm: number;
  sashWidthTotalDeductionMm: number;
  sashHeightDeductionMm: number;
  /** Welding shrinkage — sash cut size minus this = welded/finished sash size. */
  weldingAllowanceMm: number;
  /** null/blank = use sash side for interlock */
  interlockHeightDeductionMm: number | null;
  /** Glass width = sash top/bottom cut − this (workshop confirmed). */
  glassWidthLessMm: number;
  /** Glass height = sash side cut − ((profile section × 2) − this). */
  glassHeightStandardLessMm: number;
};

export type SarikCuttingParams = SharedCuttingParams & {
  profileSectionMm: number;
  frameCuttingExtraWidthMm: number;
  frameCuttingExtraHeightMm: number;
  sashCuttingExtraWidthMm: number;
  sashCuttingExtraHeightMm: number;
  weldingLossWidthMm: number;
  weldingLossHeightMm: number;
  sashWidthTotalDeductionMm: number;
  sashHeightDeductionMm: number;
  glassWidthLessMm: number;
  glassHeightStandardLessMm: number;
  addWeldingAllowanceToInterlock: boolean;
  steelCalculationBase: SteelCalculationBase;
};

export type CuttingOptions = StandardCuttingParams &
  WorkshopCuttingParams &
  SarikCuttingParams & {
    cuttingMethod: CuttingMethod;
    sizeType: SizeType;
    workshopPresetId?: string;
    sarikPresetId?: string;
    customInterlockDeductionEnabled: boolean;
    customInterlockDeductionMm: number;
    /** 3 Track only — defaults to two-glass-one-net when missing (backward compatible). */
    threeTrackSashConfiguration?: ThreeTrackSashConfiguration;
  };

export type WindowDimensions = {
  widthMm: number;
  heightMm: number;
};

export type FrameCuts = {
  frameWidth: number;
  frameHeight: number;
  frameTop: number;
  frameBottom: number;
  frameLeft: number;
  frameRight: number;
};

export type SashCuts = {
  /** Cut size (before welding, long point to long point). */
  sashSide: number;
  sashTop: number;
  sashBottom: number;
  interlock: number;
  /** Welded/finished size (cut − welding allowance). */
  sashSideWelded: number;
  sashTopWelded: number;
  sashBottomWelded: number;
  interlockWelded: number;
};

export type NetSashCuts = {
  netSashTop: number;
  netSashBottom: number;
  netSashSide: number;
  netSashTopWelded: number;
  netSashBottomWelded: number;
  netSashSideWelded: number;
};

export type MaterialCuts = {
  glassWidth: number;
  glassHeight: number;
  beadingWidth: number;
  beadingHeight: number;
  steelFrameH: number;
  steelFrameV: number;
  steelSashH: number;
  steelSashV: number;
  /** @deprecated use steelSashV — kept for quick display */
  steelSide: number;
  steelTop: number;
  steelBottom: number;
  /** Mesh / jaali panel width (3 Track 2 Glass + 1 Net). */
  meshWidth: number;
  /** Mesh / jaali panel height (3 Track 2 Glass + 1 Net). */
  meshHeight: number;
};

export type AllCuts = FrameCuts & SashCuts & NetSashCuts & MaterialCuts;

export type CutAngle = "45° both side" | "90° straight";

export type CutListItem = {
  name: string;
  lengthMm: number;
  qty: number;
  crossSectionMm?: number;
};

export type EnhancedCutRow = {
  srNo: number;
  item: string;
  profileCode: string;
  qtyPerWindow: number;
  /** Cutting size before welding (long point to long point). */
  cutSizeMm: number;
  /** Size after welding / joined — undefined when not applicable. */
  afterWeldingMm?: number | null;
  /** After-welding cross dimension (height) for component rows. */
  afterWeldingCrossMm?: number | null;
  cutSizeCrossMm?: number;
  cutSizeInch: string;
  cutSizeFtInch: string;
  cutAngle: CutAngle;
  totalQty: number;
  totalRunningFt: number;
  notes: string;
};

export type RunningFeetLine = {
  label: string;
  feet: number;
};

export type CuttingResult = {
  cuts: AllCuts;
  cutList: CutListItem[];
  tableRows: EnhancedCutRow[];
  runningFeetSummary: RunningFeetLine[];
};

export type TrackSystemPreset = {
  id: TrackSystemId;
  label: string;
  profileCode: string;
  defaults: StandardCuttingParams;
};

export type WorkshopPreset = {
  id: string;
  name: string;
  trackSystemId: TrackSystemId;
  profileCode: string;
  defaults: WorkshopCuttingParams;
  /** Sample verification (opening mm → expected cuts) */
  sample?: {
    openingWidthMm: number;
    openingHeightMm: number;
    expected: {
      frameWidth: number;
      frameHeight: number;
      sashTop: number;
      sashSide: number;
      glassWidth: number;
      glassHeight: number;
    };
  };
};

export type SarikPreset = {
  id: string;
  name: string;
  trackSystemId: TrackSystemId;
  profileCode: string;
  /** Dedicated screen / net sash profile code (3 Track 2 Glass + 1 Net). */
  screenSashProfileCode?: string;
  jaaliApplicable?: boolean;
  defaults: SarikCuttingParams;
  sample?: {
    siteWidthMm: number;
    siteHeightMm: number;
    expected: {
      frameCutWidth: number;
      frameCutHeight: number;
      frameAfterWidth?: number;
      frameAfterHeight?: number;
    };
  };
};

export type CalibrationInput = {
  sampleWidthMm: number;
  sampleHeightMm: number;
  /** Frame after welding (sarik) or frame cut size (workshop). */
  actualFrameWidth: number;
  actualFrameHeight: number;
  /** Sarik: frame cutting before welding. */
  actualFrameCutWidth?: number;
  actualFrameCutHeight?: number;
  /** Sash after welding. */
  actualSashTop: number;
  actualSashSide: number;
  /** Sarik: sash cutting before welding. */
  actualSashTopCut?: number;
  actualSashSideCut?: number;
  actualInterlock: number;
  actualGlassWidth: number;
  actualGlassHeight: number;
};

export type CalibrationResult = {
  calculated: Record<string, number>;
  differences: Record<string, number>;
  suggestedAdjustments: Partial<WorkshopCuttingParams & SarikCuttingParams>;
};

export type TrackProfileCuttingConfig = {
  trackSystemId: TrackSystemId;
  label: string;
  profileCode: string;
  defaultCuttingMethod: CuttingMethod;
  fallbackCuttingMethod: CuttingMethod;
};

export type ProfileCuttingSettings = {
  tracks: Record<TrackSystemId, TrackProfileCuttingConfig>;
};
