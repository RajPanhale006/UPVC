import type { CuttingOptions, CuttingResult, TrackSystemId } from "@/lib/cutting/types";
import type { DoorCuttingOptions, DoorCuttingResult } from "@/lib/cutting/door";
import type { EstimationBreakdown, EstimationInputs } from "@/lib/estimation/types";
import type { ProfileRateSettings } from "@/lib/profiles/types";
import type { CuttingJobMeta, ProfileCostSummary, SummaryComponentRow, SummaryDetailRow } from "@/lib/summary/types";
import type { DoorHardwareMasterSettings } from "@/lib/door-hardware";

export type ProductType = "window" | "door" | "fixed-frame";

export type CalculationMethodId =
  | "sarik-window"
  | "sarik-door"
  | "fixed-frame"
  | "standard-window"
  | "workshop-window";

export type CalculationMethodMeta = {
  id: CalculationMethodId;
  name: string;
  version: string;
  effectiveDate: string;
  productType: ProductType;
  status: "approved" | "draft";
  approvedBy: string;
};

export type ValidationIssue = {
  field: string;
  message: string;
  requiredMinimum?: string;
};

export type CalculationValidation = {
  isValid: boolean;
  blockingMessage: string | null;
  issues: ValidationIssue[];
};

export type ProductDimensions = {
  widthMm: number;
  heightMm: number;
  quantity: number;
  areaSqFt: number;
};

export type ProductCalculationResult = {
  productType: ProductType;
  method: CalculationMethodMeta;
  trackSystemId?: TrackSystemId;
  profileCode: string;
  inputDimensions: ProductDimensions;
  validation: CalculationValidation;
  window?: {
    cutting: CuttingResult;
    components: SummaryComponentRow[];
    details: SummaryDetailRow[];
  };
  door?: {
    cutting: DoorCuttingResult;
    doorSettings: DoorCuttingOptions;
    components: SummaryComponentRow[];
    details: SummaryDetailRow[];
  };
  fixedFrame?: {
    cutting: import("@/lib/cutting/fixed-frame").FixedFrameCuttingResult;
    fixedFrameSettings: import("@/lib/cutting/fixed-frame").FixedFrameSettings;
    components: SummaryComponentRow[];
    details: SummaryDetailRow[];
    summary: import("@/lib/cutting/fixed-frame").FixedFrameCalculationResult;
  };
  estimation: EstimationBreakdown | null;
  profileCostSummary: ProfileCostSummary | null;
  cuttingJobMeta: CuttingJobMeta;
};

export type CalculateProductInput = {
  estimationInputs: EstimationInputs;
  cuttingOptions: CuttingOptions;
  profileRates: ProfileRateSettings;
  cuttingJobMeta: CuttingJobMeta;
  doorHardwareMaster?: DoorHardwareMasterSettings;
};
