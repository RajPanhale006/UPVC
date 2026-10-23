import {
  calculateDoorCutting,
  DOOR_PROFILE_CODES,
  type DoorCuttingOptions,
} from "@/lib/cutting/door";
import type { EnhancedCutRow } from "@/lib/cutting/types";
import { computeDoorHardwareCost } from "@/lib/door-hardware";
import type { DoorHardwareMasterSettings } from "@/lib/door-hardware";
import type { ProfileRateSettings } from "@/lib/profiles/types";

import {
  calculateAreaSqft,
  calculatePerimeterFt,
  feetInchesToMm,
  getSelectedGlassRate,
} from "./defaults";
import { computeCustomerBasePriceFields } from "./customer-base-price";
import { calculateProfileMaterialCostBreakdown } from "./running-feet";
import type {
  EstimationBreakdown,
  EstimationInputs,
  MaterialLineItem,
  RunningFeetBreakdown,
} from "./types";

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function sumRunFt(rows: EnhancedCutRow[], predicate: (row: EnhancedCutRow) => boolean): number {
  return round2(
    rows.filter(predicate).reduce((sum, row) => sum + row.totalRunningFt, 0),
  );
}

function buildDoorRunningFeetPerDoor(
  tableRows: EnhancedCutRow[],
  inputs: EstimationInputs,
): RunningFeetBreakdown {
  const wastageFactor = 1 + inputs.wastagePercent / 100;
  const frameFt = sumRunFt(tableRows, (row) => row.item.startsWith("Frame"));
  const sashFt = sumRunFt(tableRows, (row) => row.item.startsWith("Sash"));
  const mullionFt = sumRunFt(tableRows, (row) => row.item === "Flat Mullion");
  const beadingFt = sumRunFt(tableRows, (row) => row.item.startsWith("Beading"));
  const totalFrameFt = round2(frameFt + mullionFt);
  const perimeterFt = calculatePerimeterFt(
    inputs.widthFeet,
    inputs.widthInches,
    inputs.heightFeet,
    inputs.heightInches,
  );

  return {
    perimeterFt,
    frameFt: totalFrameFt,
    sashFt,
    screenSashFt: 0,
    interlockFt: 0,
    beadingFt,
    steelFt: 0,
    bearingSteelTrackFt: 0,
    totalUpvcFt: round2(totalFrameFt + sashFt + beadingFt),
    frameFtWithWastage: round2(totalFrameFt * wastageFactor),
    sashFtWithWastage: round2(sashFt * wastageFactor),
    screenSashFtWithWastage: 0,
    interlockFtWithWastage: 0,
    beadingFtWithWastage: round2(beadingFt * wastageFactor),
    totalUpvcFtWithWastage: round2((totalFrameFt + sashFt + beadingFt) * wastageFactor),
  };
}

function emptyDoorRunningFeet(inputs: EstimationInputs): RunningFeetBreakdown {
  const perimeterFt = calculatePerimeterFt(
    inputs.widthFeet,
    inputs.widthInches,
    inputs.heightFeet,
    inputs.heightInches,
  );
  return {
    perimeterFt,
    frameFt: 0,
    sashFt: 0,
    screenSashFt: 0,
    interlockFt: 0,
    beadingFt: 0,
    steelFt: 0,
    bearingSteelTrackFt: 0,
    totalUpvcFt: 0,
    frameFtWithWastage: 0,
    sashFtWithWastage: 0,
    screenSashFtWithWastage: 0,
    interlockFtWithWastage: 0,
    beadingFtWithWastage: 0,
    totalUpvcFtWithWastage: 0,
  };
}

export function buildDoorEstimation(
  inputs: EstimationInputs,
  profileRates: ProfileRateSettings,
  doorSettings: DoorCuttingOptions,
  doorHardwareMaster: DoorHardwareMasterSettings,
): EstimationBreakdown {
  const widthMm = feetInchesToMm(inputs.widthFeet, inputs.widthInches);
  const heightMm = feetInchesToMm(inputs.heightFeet, inputs.heightInches);
  const areaSqft = calculateAreaSqft(
    inputs.widthFeet,
    inputs.widthInches,
    inputs.heightFeet,
    inputs.heightInches,
  );
  const qty = Math.max(1, inputs.numberOfWindows || 1);
  const doorResult = calculateDoorCutting(
    { widthMm, heightMm },
    doorSettings,
    qty,
  );
  const runningFeet = doorResult
    ? buildDoorRunningFeetPerDoor(doorResult.tableRows, inputs)
    : emptyDoorRunningFeet(inputs);
  const profileBreakdown = doorResult
    ? calculateProfileMaterialCostBreakdown(
        runningFeet,
        "2-track-t60",
        inputs,
        profileRates,
        {
          tableRows: doorResult.tableRows,
          productKind: "door",
        },
      )
    : {
        upvcProfilesCost: 0,
        beadingCost: 0,
        steelCost: 0,
        totalCost: 0,
        beadingRunFt: 0,
        usesBarOptimization: false,
      };
  const glassCost = round2(areaSqft * getSelectedGlassRate(inputs));
  const doorHardware = computeDoorHardwareCost(
    doorSettings,
    doorHardwareMaster,
    inputs.doorHardwareOverrides,
  );
  const ancillaryHardwareCost = round2(
    inputs.screwRatePerWindow + inputs.otherHardwareCostPerWindow,
  );
  const hardwareCost = round2(doorHardware.totalDoorHardwareCost + ancillaryHardwareCost);
  const brushRubberCost = round2(runningFeet.perimeterFt * inputs.brushRubberRatePerFt);
  const labourTotal = round2(areaSqft * inputs.labourRatePerSqft);
  const overheadTotal = round2(
    Object.values(inputs.overheads).reduce((sum, value) => sum + value, 0),
  );
  const materialTotal = round2(
    profileBreakdown.upvcProfilesCost +
      profileBreakdown.beadingCost +
      glassCost +
      hardwareCost +
      brushRubberCost,
  );
  const workshopTotal = round2(materialTotal + labourTotal + overheadTotal);
  const costPerSqft = areaSqft > 0 ? round2(workshopTotal / areaSqft) : 0;
  const profitAmount = round2(workshopTotal * (inputs.profitMarginPercent / 100));
  const baseRatePerSqftAfterProfit =
    areaSqft > 0 ? round2((workshopTotal + profitAmount) / areaSqft) : 0;
  const gstPerSqft = round2(baseRatePerSqftAfterProfit * (inputs.gstPercent / 100));
  const totalGstAmount = round2(profitAmount * 0 + gstPerSqft * areaSqft);
  const ratePerSqftWithGst = round2(baseRatePerSqftAfterProfit + gstPerSqft);
  const ratePerSqftWithoutGst = round2(
    baseRatePerSqftAfterProfit * (1 + inputs.withoutGstLoadingPercent / 100),
  );
  const finalAmountWithGst = round2(ratePerSqftWithGst * areaSqft);
  const finalAmountWithoutGst = round2(ratePerSqftWithoutGst * areaSqft);

  const materials: MaterialLineItem[] = [
    {
      key: "upvc-profiles",
      label: "UPVC door profiles (frame + sash)",
      amount: profileBreakdown.upvcProfilesCost,
      note: profileBreakdown.usesBarOptimization
        ? "Purchase cost from optimized 5800 mm bars"
        : `${DOOR_PROFILE_CODES.frame} frame · ${DOOR_PROFILE_CODES.sash} sash`,
    },
    {
      key: "beading",
      label: "Beading profile",
      amount: profileBreakdown.beadingCost,
      note: profileBreakdown.usesBarOptimization
        ? "Purchase cost from optimized 5800 mm bars"
        : `${profileBreakdown.beadingRunFt.toFixed(2)} ft with wastage`,
    },
    {
      key: "glass",
      label: "Glass / panel",
      amount: glassCost,
      note: `Area ${areaSqft} sqft × ₹${getSelectedGlassRate(inputs)}/sqft`,
    },
    {
      key: "door-hardware",
      label: "Door hardware",
      amount: doorHardware.totalDoorHardwareCost,
      note: doorHardware.hasMissingDoorHardwareRates
        ? "Door hardware rate not configured"
        : "Espag, hinges, handle, keeps / shoot bolts",
    },
    ...(ancillaryHardwareCost > 0
      ? [
          {
            key: "door-ancillary-hardware",
            label: "Screws and other hardware",
            amount: ancillaryHardwareCost,
            note: "Flat per-door ancillary hardware",
          } satisfies MaterialLineItem,
        ]
      : []),
    {
      key: "brush-rubber",
      label: "Brush rubber / gasket",
      amount: brushRubberCost,
      note: `${runningFeet.perimeterFt.toFixed(2)} ft perimeter`,
    },
  ];

  const customerBase = computeCustomerBasePriceFields(
    workshopTotal,
    qty,
    inputs.profitMarginPercent,
    areaSqft,
  );

  const pricingBlocked = doorHardware.hasMissingDoorHardwareRates;

  return {
    trackLabel: "UPVC Door",
    areaSqft,
    widthMm,
    heightMm,
    numberOfWindows: qty,
    runningFeet,
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
    orderWorkshopTotal: round2(workshopTotal * qty),
    orderFinalAmountWithGst: round2(finalAmountWithGst * qty),
    orderFinalAmountWithoutGst: round2(finalAmountWithoutGst * qty),
    orderGstAmount: round2(totalGstAmount * qty),
    ...customerBase,
    customerBasePriceAvailable:
      customerBase.customerBasePriceAvailable && !pricingBlocked,
    customerRateAvailable:
      customerBase.customerRateAvailable && !pricingBlocked,
    doorHardwareItems: doorHardware.items,
    totalDoorHardwareCost: doorHardware.totalDoorHardwareCost,
    hasMissingDoorHardwareRates: doorHardware.hasMissingDoorHardwareRates,
    missingDoorHardwareRateItems: doorHardware.missingDoorHardwareRateItems,
  };
}
