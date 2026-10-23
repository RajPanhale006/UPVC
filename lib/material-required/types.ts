import type { WorkshopJobOptimizationResult } from "@/lib/cutting/bar-optimization/optimize-workshop-job";
import type { OptimizedBarPlan } from "@/lib/cutting/bar-optimization/types";
import type { JobProductKind } from "@/lib/jobs/types";

export type MaterialRequiredStatus = "ready" | "partial" | "invalid";

export type MaterialRequiredHeader = {
  jobId: string;
  customerName: string;
  siteName: string;
  projectName: string;
  date: string;
  totalProducts: number;
  validProducts: number;
  totalAreaSqft: number;
  systemsIncluded: string[];
  calculationStatus: MaterialRequiredStatus;
  optimizerStatus: MaterialRequiredStatus;
};

export type MaterialRequiredProfileRow = {
  profileCode: string;
  profileName: string;
  category: string;
  kgPerMetre: number | null;
  standardBarLengthMm: number;
  cutPiecesCount: number;
  netRequiredLengthMm: number;
  inventoryBarsConsumed: number;
  inventoryLengthUsedMm: number;
  newBarsRequired: number;
  purchasedLengthMm: number;
  purchaseWeightKg: number;
  ratePerKg: number | null;
  amount: number;
  reusableLeftoverMm: number;
  scrapMm: number;
  totalKerfMm: number;
  materialUtilizationPercent: number;
  optimizationWastePercent: number;
  theoreticalBars: number;
  barPlans: OptimizedBarPlan[];
};

export type MaterialRequiredSteelRow = {
  profileCode: string;
  profileName: string;
  kgPerMetre: number | null;
  standardBarLengthMm: number;
  cutPiecesCount: number;
  netRequiredLengthMm: number;
  inventoryBarsConsumed: number;
  inventoryLengthUsedMm: number;
  newBarsRequired: number;
  purchasedLengthMm: number;
  purchaseRunningFt: number;
  purchaseWeightKg: number;
  rateBasis: "PER_RUNNING_FOOT" | "PER_KG";
  rate: number;
  amount: number;
  reusableLeftoverMm: number;
  scrapMm: number;
  totalKerfMm: number;
  barPlans: OptimizedBarPlan[];
};

export type MaterialRequiredGlassRow = {
  productId: string;
  productLabel: string;
  productKind: JobProductKind;
  quantity: number;
  glassThickness: string;
  glassType: string;
  pieceCount: number;
  cutWidthMm: number;
  cutHeightMm: number;
  actualCutAreaSqft: number;
  costingAreaSqft: number;
  ratePerSqft: number;
  amount: number;
};

export type MaterialRequiredMeshRow = {
  productId: string;
  productLabel: string;
  quantity: number;
  meshWidthMm: number;
  meshHeightMm: number;
  meshAreaSqft: number;
  ratePerSqft: number;
  amount: number;
};

export type MaterialRequiredHardwareRow = {
  key: string;
  item: string;
  sku: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
  stockAvailable: number | null;
  purchaseRequired: number;
};

export type MaterialRequiredPurchaseSection = {
  id: "upvc" | "steel" | "glass" | "mesh" | "hardware" | "consumables";
  label: string;
  total: number;
};

export type MaterialRequiredResult = {
  header: MaterialRequiredHeader;
  upvcProfiles: MaterialRequiredProfileRow[];
  steel: MaterialRequiredSteelRow[];
  glass: MaterialRequiredGlassRow[];
  mesh: MaterialRequiredMeshRow[];
  hardware: MaterialRequiredHardwareRow[];
  consumables: MaterialRequiredHardwareRow[];
  purchaseSummary: MaterialRequiredPurchaseSection[];
  grandTotal: number;
  optimization: WorkshopJobOptimizationResult;
  labourBarCount: number;
  materialRequiredBarCount: number;
};

export type MaterialRequiredPdfMode = "internal" | "supplier";
