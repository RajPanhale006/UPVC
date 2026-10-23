import type { FixedFrameSettings } from "@/lib/cutting/fixed-frame";
import { calculateFixedFrameCutting } from "@/lib/cutting/fixed-frame";
import type { ProfileRateSettings } from "@/lib/profiles/types";

import { computeCustomerBasePriceFields } from "./customer-base-price";
import type { EstimationBreakdown, EstimationInputs, MaterialLineItem } from "./types";
import { calculateAreaSqft, calculatePerimeterFt, feetInchesToMm } from "./defaults";

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function buildFixedFrameEstimation(
  inputs: EstimationInputs,
  profileRates: ProfileRateSettings,
  fixedFrameSettings: FixedFrameSettings,
): EstimationBreakdown | null {
  void profileRates;
  const widthMm = feetInchesToMm(inputs.widthFeet, inputs.widthInches);
  const heightMm = feetInchesToMm(inputs.heightFeet, inputs.heightInches);
  const quantity = Math.max(1, inputs.numberOfWindows);
  const areaSqft = calculateAreaSqft(
    inputs.widthFeet,
    inputs.widthInches,
    inputs.heightFeet,
    inputs.heightInches,
  );

  const cutting = calculateFixedFrameCutting({
    openingWidthMm: widthMm,
    openingHeightMm: heightMm,
    quantity,
    settings: fixedFrameSettings,
    profileRatePerKg: inputs.profileRatePerKg,
  });

  if (!cutting) return null;

  const summary = cutting.summary;
  const wc = summary.workshopCost;

  const materials: MaterialLineItem[] = summary.materials.map((m) => ({
    key: m.id,
    label: m.itemName,
    amount: m.amount,
    note: m.category,
  }));

  const materialTotal = round2(
    wc.profileCost +
      wc.reinforcementCost +
      wc.glassCost +
      wc.beadCost +
      wc.mullionCost +
      wc.hardwareCost,
  );
  const labourTotal = wc.labourCost;
  const overheadTotal = round2(
    Object.values(inputs.overheads).reduce((s, v) => s + v, 0),
  );
  const workshopTotal = round2(
    materialTotal + labourTotal + overheadTotal + wc.transportation,
  );
  const costPerSqft = areaSqft > 0 ? round2(workshopTotal / areaSqft) : 0;
  const profitAmount = round2(workshopTotal * (inputs.profitMarginPercent / 100));
  const baseRatePerSqftAfterProfit =
    areaSqft > 0 ? round2((workshopTotal + profitAmount) / areaSqft) : 0;
  const gstPerSqft = round2(baseRatePerSqftAfterProfit * (inputs.gstPercent / 100));
  const totalGstAmount = round2(gstPerSqft * areaSqft);
  const ratePerSqftWithGst = round2(baseRatePerSqftAfterProfit + gstPerSqft);
  const ratePerSqftWithoutGst = round2(
    baseRatePerSqftAfterProfit * (1 + inputs.withoutGstLoadingPercent / 100),
  );
  const finalAmountWithGst = round2(ratePerSqftWithGst * areaSqft);
  const finalAmountWithoutGst = round2(ratePerSqftWithoutGst * areaSqft);

  const customerBase = computeCustomerBasePriceFields(
    workshopTotal,
    quantity,
    inputs.profitMarginPercent,
    areaSqft,
  );

  return {
    trackLabel: "Fixed UPVC Partition Frame",
    areaSqft,
    widthMm,
    heightMm,
    numberOfWindows: quantity,
    runningFeet: {
      perimeterFt: calculatePerimeterFt(
        inputs.widthFeet,
        inputs.widthInches,
        inputs.heightFeet,
        inputs.heightInches,
      ),
      frameFt: round2(summary.totalFrameLengthMm / 304.8),
      sashFt: 0,
      screenSashFt: 0,
      interlockFt: 0,
      beadingFt: round2(summary.totalBeadLengthMm / 304.8),
      steelFt: round2(summary.totalReinforcementLengthMm / 304.8),
      bearingSteelTrackFt: 0,
      totalUpvcFt: round2((summary.totalFrameLengthMm + summary.totalBeadLengthMm) / 304.8),
      frameFtWithWastage: round2(
        (summary.totalFrameLengthMm / 304.8) * (1 + inputs.wastagePercent / 100),
      ),
      sashFtWithWastage: 0,
      screenSashFtWithWastage: 0,
      interlockFtWithWastage: 0,
      beadingFtWithWastage: round2(
        (summary.totalBeadLengthMm / 304.8) * (1 + inputs.wastagePercent / 100),
      ),
      totalUpvcFtWithWastage: round2(
        ((summary.totalFrameLengthMm + summary.totalBeadLengthMm) / 304.8) *
          (1 + inputs.wastagePercent / 100),
      ),
    },
    materials,
    materialTotal,
    labourTotal,
    overheadTotal,
    workshopTotal,
    costPerSqft,
    profitAmount,
    profitPerSqft: areaSqft > 0 ? round2(profitAmount / areaSqft) : 0,
    baseRatePerSqftAfterProfit,
    gstPerSqft,
    totalGstAmount,
    ratePerSqftWithGst,
    ratePerSqftWithoutGst,
    finalAmountWithGst,
    finalAmountWithoutGst,
    orderWorkshopTotal: round2(workshopTotal * quantity),
    orderFinalAmountWithGst: round2(finalAmountWithGst * quantity),
    orderFinalAmountWithoutGst: round2(finalAmountWithoutGst * quantity),
    orderGstAmount: round2(totalGstAmount * quantity),
    ...customerBase,
  };
}
