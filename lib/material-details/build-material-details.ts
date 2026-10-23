import { calculateProduct } from "@/lib/calculations";
import type { ProductCalculationResult } from "@/lib/calculations/types";
import { mmAreaToSqFt } from "@/lib/calculations/format";
import type { DoorHardwareMasterSettings } from "@/lib/door-hardware";
import { TRACK_LABELS } from "@/lib/estimation/defaults";
import type { MaterialLineItem } from "@/lib/estimation/types";
import type { JobProduct, WorkshopJob } from "@/lib/jobs/types";
import type { ProfileRateSettings } from "@/lib/profiles/types";
import { getSimpleQuoteProductLabel } from "@/lib/simple-quote/product-types";
import { rowHasDimensions, getRowHeightMm, getRowWidthMm } from "@/lib/simple-quote/row-dimensions";
import { loadSimpleQuoteRows } from "@/lib/simple-quote/storage";
import { loadSimpleQuoteRateSettings } from "@/lib/simple-quote/rate-settings";
import {
  formatLowersPricingNote,
  isLowersProduct,
  LOWERS_MATERIALS,
  resolveLowersRatePerPiece,
} from "@/lib/simple-quote/lowers-pricing";
import { rowToProductInputs } from "@/lib/simple-quote/row-to-product";
import type { SimpleQuoteRow } from "@/lib/simple-quote/types";
import type { CuttingJobMeta } from "@/lib/summary/types";

import type {
  MaterialDetailsCategory,
  MaterialDetailsJobResult,
  MaterialDetailsLineItem,
  MaterialDetailsProduct,
} from "./types";

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function categorizeMaterialKey(key: string): MaterialDetailsCategory {
  switch (key) {
    case "upvc-profiles":
    case "beading":
    case "steel":
      return "Profile";
    case "glass":
      return "Glass";
    case "jaali":
      return "Mesh";
    case "bearing":
    case "lock":
    case "screw":
    case "brush-rubber":
    case "bearing-steel-track":
    case "other-hardware":
    case "door-hardware":
    case "door-ancillary-hardware":
      return "Hardware";
    default:
      return "Other";
  }
}

function unitForMaterialKey(key: string, qty: number): string {
  switch (key) {
    case "glass":
    case "jaali":
      return "sq.ft";
    case "brush-rubber":
      return "ft";
    case "screw":
    case "other-hardware":
      return qty > 1 ? "windows" : "window";
    default:
      return "set";
  }
}

function lineFromMaterial(
  material: MaterialLineItem,
  windowQty: number,
  bearingSteelTrackFt = 0,
): MaterialDetailsLineItem {
  const category = categorizeMaterialKey(material.key);
  if (material.key === "bearing-steel-track" && bearingSteelTrackFt > 0) {
    const quantity = round2(bearingSteelTrackFt * windowQty);
    return {
      category,
      item: material.label,
      quantity,
      unit: "ft",
      rate: quantity > 0 ? round2(material.amount / quantity) : material.amount,
      amount: material.amount,
      note: material.note,
    };
  }
  const quantity =
    material.key === "glass" || material.key === "jaali"
      ? windowQty
      : material.key === "brush-rubber"
        ? 1
        : windowQty;
  return {
    category,
    item: material.label,
    quantity,
    unit: unitForMaterialKey(material.key, windowQty),
    rate: quantity > 0 ? round2(material.amount / quantity) : material.amount,
    amount: material.amount,
    note: material.note,
  };
}

function buildLinesFromResult(
  result: ProductCalculationResult,
  windowQty: number,
): MaterialDetailsLineItem[] {
  const lines: MaterialDetailsLineItem[] = [];
  const est = result.estimation;
  if (!est) return lines;

  for (const material of est.materials) {
    if (material.amount <= 0 && material.key !== "jaali") continue;
    lines.push(
      lineFromMaterial(material, windowQty, est.runningFeet?.bearingSteelTrackFt ?? 0),
    );
  }

  if (est.labourTotal > 0) {
    const labourArea = round2(est.areaSqft * windowQty);
    lines.push({
      category: "Labour",
      item: "Fabrication labour",
      quantity: labourArea,
      unit: "sq.ft",
      rate: round2(est.labourTotal / Math.max(labourArea, 1)),
      amount: est.labourTotal,
      note: "Area × labour rate per sq.ft",
    });
  }

  if (est.overheadTotal > 0) {
    lines.push({
      category: "Overhead",
      item: "Overheads (transport, rent, utilities, etc.)",
      quantity: windowQty,
      unit: windowQty > 1 ? "windows" : "window",
      rate: round2(est.overheadTotal / windowQty),
      amount: est.overheadTotal,
    });
  }

  for (const hardware of est.doorHardwareItems ?? []) {
    lines.push({
      category: "Hardware",
      item: hardware.name,
      specification: hardware.specification,
      quantity: hardware.quantity,
      unit: hardware.unitLabel || "pcs",
      rate: hardware.unitRate ?? hardware.masterRate ?? 0,
      amount: hardware.totalCost ?? 0,
    });
  }

  const cuts = result.window?.cutting.cuts ?? result.door?.cutting.cuts;
  if (cuts && cuts.glassWidth > 0 && cuts.glassHeight > 0) {
    const glassArea = mmAreaToSqFt(cuts.glassWidth, cuts.glassHeight);
    const glassLine = lines.find((line) => line.item === "Glass");
    if (glassLine) {
      glassLine.specification = `${Math.round(cuts.glassWidth)} × ${Math.round(cuts.glassHeight)} mm`;
      glassLine.note = glassLine.note
        ? `${glassLine.note} · Cut ${glassLine.specification}`
        : `Cut size ${glassLine.specification}`;
    }
  }

  if (cuts && "meshWidth" in cuts && cuts.meshWidth > 0 && cuts.meshHeight > 0) {
    const meshLine = lines.find((line) => line.category === "Mesh");
    const meshSpec = `${Math.round(cuts.meshWidth)} × ${Math.round(cuts.meshHeight)} mm`;
    if (meshLine) {
      meshLine.specification = meshSpec;
      meshLine.note = meshLine.note
        ? `${meshLine.note} · Cut ${meshSpec}`
        : `Mesh panel ${meshSpec}`;
    }
  }

  return lines;
}

function resultToProduct(
  id: string,
  label: string,
  productKind: MaterialDetailsProduct["productKind"],
  result: ProductCalculationResult,
  quantity: number,
): MaterialDetailsProduct {
  const est = result.estimation;
  const windowQty = Math.max(1, quantity);

  if (!result.validation.isValid || !est) {
    return {
      id,
      label,
      productKind,
      quantity: windowQty,
      widthMm: result.inputDimensions.widthMm,
      heightMm: result.inputDimensions.heightMm,
      areaSqft: 0,
      lines: [],
      profileRows: [],
      materialTotal: 0,
      labourTotal: 0,
      overheadTotal: 0,
      workshopTotal: 0,
      isValid: false,
      error: result.validation.blockingMessage ?? "Calculation unavailable.",
    };
  }

  return {
    id,
    label,
    productKind,
    quantity: windowQty,
    widthMm: result.inputDimensions.widthMm,
    heightMm: result.inputDimensions.heightMm,
    areaSqft: round2(est.areaSqft * windowQty),
    trackLabel: result.trackSystemId ? TRACK_LABELS[result.trackSystemId] : est.trackLabel,
    profileCode: result.profileCode,
    lines: buildLinesFromResult(result, windowQty),
    profileRows: result.profileCostSummary?.rows ?? [],
    materialTotal: est.materialTotal,
    labourTotal: est.labourTotal,
    overheadTotal: est.overheadTotal,
    workshopTotal: windowQty > 1 ? est.orderWorkshopTotal : est.workshopTotal,
    isValid: true,
  };
}

function buildFromJobProduct(
  product: JobProduct,
  profileRates: ProfileRateSettings,
  doorHardwareMaster: DoorHardwareMasterSettings,
  cuttingJobMeta: CuttingJobMeta,
): MaterialDetailsProduct {
  const result = calculateProduct({
    estimationInputs: product.estimationInputs,
    cuttingOptions: product.cuttingOptions,
    profileRates,
    cuttingJobMeta,
    doorHardwareMaster,
  });
  const qty = Math.max(1, product.estimationInputs.numberOfWindows || 1);
  return resultToProduct(product.id, product.label, product.productKind, result, qty);
}

function buildFromLowersRow(
  row: SimpleQuoteRow,
  jobId: string,
): MaterialDetailsProduct | null {
  if (!rowHasDimensions(row)) return null;

  const rateSettings = loadSimpleQuoteRateSettings(jobId);
  const { ratePerPiece, tier } = resolveLowersRatePerPiece(row, rateSettings);
  const qty = Math.max(1, row.quantity);
  const widthMm = getRowWidthMm(row);
  const heightMm = getRowHeightMm(row);
  const customerTotal = round2(ratePerPiece * qty);
  const pricingNote = formatLowersPricingNote(tier, ratePerPiece);

  if (ratePerPiece <= 0) {
    return {
      id: row.id,
      label: `${Math.round(widthMm)} × ${Math.round(heightMm)} mm · Lowers · Qty ${qty}`,
      productKind: "window",
      quantity: qty,
      widthMm,
      heightMm,
      areaSqft: 0,
      lines: [],
      profileRows: [],
      materialTotal: 0,
      labourTotal: 0,
      overheadTotal: 0,
      workshopTotal: 0,
      isValid: false,
      error: "Enter a valid Lowers rate per piece.",
    };
  }

  const materialLines: MaterialDetailsLineItem[] = LOWERS_MATERIALS.map((item) => ({
    category: item.includes("glass")
      ? "Glass"
      : item.includes("frame")
        ? "Profile"
        : "Other",
    item,
    quantity: qty,
    unit: qty > 1 ? "pcs" : "pc",
    rate: 0,
    amount: 0,
    note: "Included in lumpsum per-piece rate",
  }));

  materialLines.push({
    category: "Other",
    item: "Lumpsum customer rate",
    quantity: qty,
    unit: qty > 1 ? "pcs" : "pc",
    rate: ratePerPiece,
    amount: customerTotal,
    note: pricingNote,
  });

  return {
    id: row.id,
    label: `${Math.round(widthMm)} × ${Math.round(heightMm)} mm · Lowers (Casement Frame) · Qty ${qty}`,
    productKind: "window",
    quantity: qty,
    widthMm,
    heightMm,
    areaSqft: 0,
    trackLabel: "Lowers",
    lines: materialLines,
    profileRows: [],
    materialTotal: customerTotal,
    labourTotal: 0,
    overheadTotal: 0,
    workshopTotal: customerTotal,
    isValid: true,
  };
}

function buildFromQuickQuoteRow(
  row: SimpleQuoteRow,
  index: number,
  profileRates: ProfileRateSettings,
  doorHardwareMaster: DoorHardwareMasterSettings,
  cuttingJobMeta: CuttingJobMeta,
  jobId: string,
): MaterialDetailsProduct | null {
  if (!rowHasDimensions(row)) return null;
  if (isLowersProduct(row.productType)) {
    return buildFromLowersRow(row, jobId);
  }
  const rateSettings = loadSimpleQuoteRateSettings(jobId);
  const { estimationInputs, cuttingOptions, productKind } = rowToProductInputs(
    row,
    profileRates,
    rateSettings,
  );
  const result = calculateProduct({
    estimationInputs,
    cuttingOptions,
    profileRates,
    cuttingJobMeta,
    doorHardwareMaster,
  });
  const label = `${Math.round(result.inputDimensions.widthMm)} × ${Math.round(result.inputDimensions.heightMm)} mm · ${getSimpleQuoteProductLabel(row.productType)} · Qty ${row.quantity}`;
  return resultToProduct(row.id, label, productKind, result, row.quantity);
}

function buildProductsFromQuoteRows(
  quoteRows: SimpleQuoteRow[],
  profileRates: ProfileRateSettings,
  doorHardwareMaster: DoorHardwareMasterSettings,
  cuttingJobMeta: CuttingJobMeta,
  jobId: string,
): MaterialDetailsProduct[] {
  return quoteRows
    .map((row, index) =>
      buildFromQuickQuoteRow(
        row,
        index,
        profileRates,
        doorHardwareMaster,
        cuttingJobMeta,
        jobId,
      ),
    )
    .filter((product): product is MaterialDetailsProduct => product != null);
}

export function buildMaterialDetailsFromQuoteRows(input: {
  jobId: string;
  projectName: string;
  customerName: string;
  rows: SimpleQuoteRow[];
  profileRates: ProfileRateSettings;
  doorHardwareMaster: DoorHardwareMasterSettings;
  cuttingJobMeta?: CuttingJobMeta;
}): MaterialDetailsJobResult {
  const cuttingJobMeta: CuttingJobMeta = input.cuttingJobMeta ?? {
    jobName: input.projectName,
    jobNotes: "",
    windowLocation: "",
  };
  const quoteRows = input.rows.filter(rowHasDimensions);
  const products = buildProductsFromQuoteRows(
    quoteRows,
    input.profileRates,
    input.doorHardwareMaster,
    cuttingJobMeta,
    input.jobId,
  );
  const validProducts = products.filter((product) => product.isValid);

  return {
    jobId: input.jobId,
    projectName: input.projectName,
    customerName: input.customerName,
    generatedAt: new Date().toISOString(),
    source: "quick-quote",
    products,
    grandMaterialTotal: round2(validProducts.reduce((sum, p) => sum + p.materialTotal, 0)),
    grandLabourTotal: round2(validProducts.reduce((sum, p) => sum + p.labourTotal, 0)),
    grandOverheadTotal: round2(validProducts.reduce((sum, p) => sum + p.overheadTotal, 0)),
    grandWorkshopTotal: round2(validProducts.reduce((sum, p) => sum + p.workshopTotal, 0)),
    totalAreaSqft: round2(validProducts.reduce((sum, p) => sum + p.areaSqft, 0)),
    validProductCount: validProducts.length,
  };
}

export function buildMaterialDetailsForJob(input: {
  job: WorkshopJob;
  profileRates: ProfileRateSettings;
  doorHardwareMaster: DoorHardwareMasterSettings;
  cuttingJobMeta?: CuttingJobMeta;
}): MaterialDetailsJobResult {
  const { job, profileRates, doorHardwareMaster } = input;
  const cuttingJobMeta: CuttingJobMeta = input.cuttingJobMeta ?? {
    jobName: job.projectName,
    jobNotes: job.notes ?? "",
    windowLocation: "",
  };

  const quoteRows = loadSimpleQuoteRows(job.id).filter(rowHasDimensions);
  const useQuickQuote = quoteRows.length > 0;

  const products: MaterialDetailsProduct[] = useQuickQuote
    ? buildProductsFromQuoteRows(
        quoteRows,
        profileRates,
        doorHardwareMaster,
        cuttingJobMeta,
        job.id,
      )
    : job.products.map((product) =>
        buildFromJobProduct(product, profileRates, doorHardwareMaster, cuttingJobMeta),
      );

  const validProducts = products.filter((product) => product.isValid);

  return {
    jobId: job.id,
    projectName: job.projectName,
    customerName: job.customerName,
    generatedAt: new Date().toISOString(),
    source: useQuickQuote ? "quick-quote" : "job-products",
    products,
    grandMaterialTotal: round2(validProducts.reduce((sum, p) => sum + p.materialTotal, 0)),
    grandLabourTotal: round2(validProducts.reduce((sum, p) => sum + p.labourTotal, 0)),
    grandOverheadTotal: round2(validProducts.reduce((sum, p) => sum + p.overheadTotal, 0)),
    grandWorkshopTotal: round2(validProducts.reduce((sum, p) => sum + p.workshopTotal, 0)),
    totalAreaSqft: round2(validProducts.reduce((sum, p) => sum + p.areaSqft, 0)),
    validProductCount: validProducts.length,
  };
}
