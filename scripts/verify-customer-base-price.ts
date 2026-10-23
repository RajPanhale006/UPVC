import { computeCustomerBasePriceFields } from "../lib/estimation/customer-base-price";

function assertClose(actual: number, expected: number, label: string) {
  if (Math.abs(actual - expected) > 0.01) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

const workshopTotal = 6626.45;
const fields = computeCustomerBasePriceFields(workshopTotal, 1, 20, 15.5);

assertClose(fields.customerBaseMarginPercent, 20, "margin percent");
assertClose(fields.customerBaseMarginAmount, 1325.29, "margin amount");
assertClose(fields.suggestedCustomerBasePrice, 7951.74, "suggested base price");

const orderFields = computeCustomerBasePriceFields(workshopTotal, 3, 20, 15.5);
assertClose(orderFields.orderCustomerBaseMarginAmount, 3975.87, "order margin qty 3");
assertClose(orderFields.orderSuggestedCustomerBasePrice, 23855.22, "order base price qty 3");
assertClose(orderFields.suggestedCustomerRatePerSqFt, 513.02, "order rate qty 3");

const acceptance = computeCustomerBasePriceFields(8004.67, 1, 20, 20.67);
assertClose(acceptance.customerBaseMarginAmount, 1600.93, "acceptance margin");
assertClose(acceptance.suggestedCustomerBasePrice, 9605.6, "acceptance base price");
assertClose(acceptance.suggestedCustomerRatePerSqFt, 464.71, "acceptance rate per sqft");

const blocked = computeCustomerBasePriceFields(0, 1, 20, 10);
if (blocked.customerBasePriceAvailable) {
  throw new Error("zero workshop cost should block base price");
}

if (blocked.customerRateAvailable) {
  throw new Error("zero area should block customer rate");
}

console.log("Customer base price verification passed.");
