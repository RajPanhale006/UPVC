import type { TrackSystemId } from "@/lib/cutting/types";
import type { DoorCuttingOptions } from "@/lib/cutting/door";
import type { FixedFrameSettings } from "@/lib/cutting/fixed-frame";
import type { DoorHardwareCostItem, DoorHardwareJobOverride } from "@/lib/door-hardware";

export type ProductKind = "window" | "door" | "fixed-frame";

export type LockType = "Handle Lock" | "Button Lock";

export type GlassSizeOption = "3mm" | "3.5mm" | "5mm";

export type OverheadKey =
  | "transportation"
  | "electricity"
  | "maintenance"
  | "depreciation"
  | "otherExp"
  | "rentFixedCost";

export type EstimationInputs = {
  customerName: string;
  location: string;
  widthFeet: number;
  widthInches: number;
  heightFeet: number;
  heightInches: number;
  numberOfWindows: number;
  /** Window track or door product selector — defaults to window when missing. */
  productKind?: ProductKind;
  /** Door-only settings (Sarik Door Method). */
  doorSettings?: DoorCuttingOptions;
  /** Fixed UPVC partition frame settings. */
  fixedFrameSettings?: FixedFrameSettings;
  trackSystemId: TrackSystemId;
  lockType: LockType;
  glassSize: GlassSizeOption;
  beadAddMm: number;
  wastagePercent: number;
  profitMarginPercent: number;
  gstPercent: number;
  withoutGstLoadingPercent: number;
  labourRatePerSqft: number;
  profileRatePerKg: number;
  screwRatePerWindow: number;
  otherHardwareCostPerWindow: number;
  brushRubberRatePerFt: number;
  steelReinforcementRatePerFt: number;
  /** Optional labour validation — display only; does not change formulas. */
  labourReportedBars?: number | null;
  jaaliRatePerSqft: number;
  /** Purchase rate for bottom bearing steel track — ₹ per ft. */
  bearingSteelTrackRatePerFt: number;
  /** @deprecated Use bearingSteelTrackRatePerFt (₹15/ft). */
  bearingSteelTrackRatePer10Ft?: number;
  /** @deprecated Flat per-window cost. */
  bearingSteelTrackCost?: number;
  overheads: Record<OverheadKey, number>;
  glassRates: Record<GlassSizeOption, number>;
  lockRates: {
    buttonLockRate: number;
    handleLockRate: number;
  };
  bearingRatePerPiece: number;
  /** Per-job door hardware quantity/rate overrides keyed by hardware id. */
  doorHardwareOverrides?: Record<string, DoorHardwareJobOverride>;
};

export type TrackHardwareQty = {
  interlockQty: number;
  lockQty: number;
  bearingQty: number;
  glassQty: number;
};

export type RunningFeetBreakdown = {
  perimeterFt: number;
  frameFt: number;
  sashFt: number;
  screenSashFt: number;
  interlockFt: number;
  beadingFt: number;
  steelFt: number;
  /** Bottom sliding track — width × sliding sash count. */
  bearingSteelTrackFt: number;
  totalUpvcFt: number;
  frameFtWithWastage: number;
  sashFtWithWastage: number;
  screenSashFtWithWastage: number;
  interlockFtWithWastage: number;
  beadingFtWithWastage: number;
  totalUpvcFtWithWastage: number;
};

export type MaterialLineItem = {
  key: string;
  label: string;
  amount: number;
  note: string;
};

export type EstimationBreakdown = {
  trackLabel: string;
  areaSqft: number;
  widthMm: number;
  heightMm: number;
  numberOfWindows: number;
  runningFeet: RunningFeetBreakdown;
  materials: MaterialLineItem[];
  materialTotal: number;
  labourTotal: number;
  overheadTotal: number;
  workshopTotal: number;
  costPerSqft: number;
  profitAmount: number;
  profitPerSqft: number;
  baseRatePerSqftAfterProfit: number;
  gstPerSqft: number;
  totalGstAmount: number;
  ratePerSqftWithGst: number;
  ratePerSqftWithoutGst: number;
  finalAmountWithGst: number;
  finalAmountWithoutGst: number;
  /** Multiplied by number of windows. */
  orderWorkshopTotal: number;
  orderFinalAmountWithGst: number;
  orderFinalAmountWithoutGst: number;
  orderGstAmount: number;
  /** Standard margin % applied to workshop cost (before GST). */
  customerBaseMarginPercent: number;
  /** Margin amount on per-unit workshop cost. */
  customerBaseMarginAmount: number;
  /** Per-unit workshop cost + margin, before GST. */
  suggestedCustomerBasePrice: number;
  /** Margin amount on order workshop total (qty included once). */
  orderCustomerBaseMarginAmount: number;
  /** Order workshop total + margin, before GST. */
  orderSuggestedCustomerBasePrice: number;
  customerBasePriceAvailable: boolean;
  /** Suggested base price ÷ total area — before GST. */
  suggestedCustomerRatePerSqFt: number;
  customerRateAvailable: boolean;
  /** Door-only hardware line items (before ancillary screw/other flat costs). */
  doorHardwareItems?: DoorHardwareCostItem[];
  totalDoorHardwareCost?: number;
  hasMissingDoorHardwareRates?: boolean;
  missingDoorHardwareRateItems?: string[];
};

export type EstimationResult = {
  inputs: EstimationInputs;
  selectedTrack: EstimationBreakdown;
  allTracks: Record<TrackSystemId, EstimationBreakdown>;
};
