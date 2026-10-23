import type { CuttingMethod, TrackSystemId } from "@/lib/cutting/types";
import type {
  DoorConfiguration,
  DoorOpeningDirection,
  DoorOpeningSide,
} from "@/lib/cutting/door";
import type { ProductKind } from "@/lib/estimation/types";

export type CuttingJobMeta = {
  jobName: string;
  jobNotes: string;
  windowLocation: string;
};

export type SummaryComponentRow = {
  part: string;
  quantity: string;
  cuttingSize: string;
  afterWeldingSize: string;
};

export type SummaryDetailRow = {
  name: string;
  qty: number;
  cuttingSize: string;
  afterWeldingSize: string;
  angle: string;
};

export type SummaryWindowEntry = {
  index: number;
  name: string;
  widthMm: number;
  heightMm: number;
  quantity: number;
  trackSystemId: TrackSystemId;
  trackLabel: string;
  profileCode: string;
  method: CuttingMethod;
  methodLabel: string;
  sashConfigurationLabel?: string;
  windowLocation: string;
  areaSqft: number;
  totalAreaSqft: number;
  workshopRatePerSqft: number;
  workshopCostPerWindow: number;
  workshopCostTotal: number;
  components: SummaryComponentRow[];
  details: SummaryDetailRow[];
};

export type SummaryDoorEntry = {
  index: number;
  name: string;
  widthMm: number;
  heightMm: number;
  quantity: number;
  configuration: DoorConfiguration;
  configurationLabel: string;
  openingSide: DoorOpeningSide;
  openingDirection: DoorOpeningDirection;
  methodLabel: string;
  doorLocation: string;
  profileCode: string;
  flatMullionMm: number | null;
  areaSqft: number;
  totalAreaSqft: number;
  workshopRatePerSqft: number;
  workshopCostPerWindow: number;
  workshopCostTotal: number;
  hardwareSummary: string[];
  components: SummaryComponentRow[];
  details: SummaryDetailRow[];
};

export type SummaryFixedFrameEntry = {
  index: number;
  name: string;
  widthMm: number;
  heightMm: number;
  quantity: number;
  constructionMode: string;
  constructionLabel: string;
  divisionMode: string;
  moduleCount: number;
  methodLabel: string;
  location: string;
  profileCode: string;
  areaSqft: number;
  totalAreaSqft: number;
  totalGlassAreaSqFt: number;
  workshopRatePerSqft: number;
  workshopCostPerWindow: number;
  workshopCostTotal: number;
  components: SummaryComponentRow[];
  details: SummaryDetailRow[];
};

export type SummaryData = {
  productKind?: ProductKind;
  hasWindows: boolean;
  customerName: string;
  location: string;
  jobNotes: string;
  totalWindows: number;
  totalAreaSqft: number;
  totalProfileWeight: number;
  totalProfileCost: number;
  workshopRatePerSqft: number;
  totalWorkshopCost: number;
  customerBaseMarginPercent?: number;
  customerBaseMarginAmount?: number;
  suggestedCustomerBasePrice?: number;
  suggestedCustomerRatePerSqFt?: number;
  customerBasePriceAvailable?: boolean;
  customerRateAvailable?: boolean;
  profileCostSummary: ProfileCostSummary;
  windows: SummaryWindowEntry[];
  doors?: SummaryDoorEntry[];
  fixedFrames?: SummaryFixedFrameEntry[];
};

export type ProfileCostBreakdownItem = {
  cuttingItem: string;
  qty: number;
  runFt: number;
};

export type ProfileCostSummaryRow = {
  id: string;
  profileName: string;
  profileCode: string;
  /** Net cut length from cut table (reference). */
  requiredRunFt: number;
  /** Legacy wastage-adjusted run ft — informational when bar optimization is active. */
  costingRunFt: number;
  weightPerFt: number | null;
  totalWeight: number | null;
  ratePerKg: number | null;
  ratePerFt: number | null;
  totalCost: number;
  isSteel: boolean;
  missingWeight: boolean;
  missingRate: boolean;
  breakdown: ProfileCostBreakdownItem[];
  /** Practical bar optimization — new full 5800 mm bars purchased. */
  newBarsRequired?: number;
  /** Naive theoretical bars (net length ÷ stock length). */
  theoreticalBars?: number;
  purchasedLengthMm?: number;
  totalKerfMm?: number;
  reusableLeftoverMm?: number;
  scrapMm?: number;
};

export type ProfileBarOptimizationSummary = {
  newBarsRequired: number;
  theoreticalBars: number;
  purchasedLengthMm: number;
  totalKerfMm: number;
  reusableLeftoverMm: number;
  scrapMm: number;
  purchaseWeightKg: number;
  materialUtilizationPercent: number;
  /** Optional labour validation entry — does not alter calculations. */
  labourReportedBars?: number | null;
};

export type ProfileCostSummary = {
  rows: ProfileCostSummaryRow[];
  totalRequiredRunFt: number;
  /** Legacy wastage-based run ft total — informational when bar optimization is active. */
  totalCostingRunFt: number;
  totalUpvcWeight: number;
  totalProfileCost: number;
  hasMissingConfig: boolean;
  /** Informational legacy setting — not applied on top of optimized purchase bars. */
  wastagePercent: number;
  usesBarOptimization: boolean;
  barOptimization?: ProfileBarOptimizationSummary;
};
