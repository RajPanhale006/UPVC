import { createDefaultCuttingOptions } from "../lib/cutting";
import { createDefaultDoorCuttingOptions } from "../lib/cutting/door";
import { calculateProduct } from "../lib/calculations/calculate-product";
import { computeDoorHardwareCost, getDefaultDoorHardwareMasterSettings } from "../lib/door-hardware";
import { getDefaultEstimationInputs } from "../lib/estimation/defaults";
import { getDefaultProfileRateSettings } from "../lib/profiles/catalog";

function assertClose(actual: number, expected: number, label: string) {
  if (Math.abs(actual - expected) > 0.02) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

const master = getDefaultDoorHardwareMasterSettings();
const singleDoor = createDefaultDoorCuttingOptions("single");
const doubleDoor = createDefaultDoorCuttingOptions("double");

const singleResult = computeDoorHardwareCost(singleDoor, master);
assertClose(singleResult.totalDoorHardwareCost, 850 + 480 + 180 + 720, "single door hardware total");
if (singleResult.items.length !== 4) {
  throw new Error(`single door expected 4 items, got ${singleResult.items.length}`);
}

const doubleResult = computeDoorHardwareCost(doubleDoor, master);
assertClose(doubleResult.totalDoorHardwareCost, 850 + 180 + 1440 + 500, "double door hardware total");
if (doubleResult.items.length !== 4) {
  throw new Error(`double door expected 4 items, got ${doubleResult.items.length}`);
}

const missingMaster = {
  items: master.items.map((item) =>
    item.id === "casement-espag" ? { ...item, rate: undefined } : item,
  ),
};
const missing = computeDoorHardwareCost(singleDoor, missingMaster);
if (!missing.hasMissingDoorHardwareRates) {
  throw new Error("missing espag rate should flag missing hardware");
}

const inputs = {
  ...getDefaultEstimationInputs(),
  productKind: "door" as const,
  doorSettings: singleDoor,
  widthFeet: 3,
  widthInches: 0,
  heightFeet: 7,
  heightInches: 0,
};

const cuttingOptions = createDefaultCuttingOptions("2-track-t60", "sarik");

const product = calculateProduct({
  estimationInputs: inputs,
  cuttingOptions,
  profileRates: getDefaultProfileRateSettings(),
  cuttingJobMeta: { jobName: "Door", jobNotes: "", windowLocation: "" },
  doorHardwareMaster: master,
});

if (!product.estimation) {
  throw new Error("door product estimation missing");
}

assertClose(product.estimation.totalDoorHardwareCost ?? 0, 2230, "workshop door hardware in estimation");
if (product.estimation.hasMissingDoorHardwareRates) {
  throw new Error("configured master should not block pricing");
}
if (!product.estimation.customerBasePriceAvailable) {
  throw new Error("customer base price should be available with configured hardware");
}

const qtyInputs = { ...inputs, numberOfWindows: 2 };
const qtyProduct = calculateProduct({
  estimationInputs: qtyInputs,
  cuttingOptions,
  profileRates: getDefaultProfileRateSettings(),
  cuttingJobMeta: { jobName: "Door", jobNotes: "", windowLocation: "" },
  doorHardwareMaster: master,
});

const perUnitWorkshop = product.estimation.workshopTotal;
const orderWorkshop = qtyProduct.estimation?.orderWorkshopTotal ?? 0;
assertClose(orderWorkshop, perUnitWorkshop * 2, "quantity should not double-count hardware");

console.log("Door hardware verification passed.");
