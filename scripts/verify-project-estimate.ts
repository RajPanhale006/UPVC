import assert from "node:assert/strict";

import { calculateQuotationTotals, round2 } from "../lib/quotation/calculate";

function testDiscountInQuotationTotals() {
  const totals = calculateQuotationTotals([], "apply", 500, 1000, 10);
  assert.equal(totals.windowsSubtotal, 0);
  assert.equal(totals.transportationCharge, 500);
  assert.equal(totals.customChargesTotal, 1000);
  assert.equal(totals.discountAmount, 150);
  assert.equal(totals.subtotalBeforeGst, 1350);
  assert.equal(totals.gstAmount, round2(1350 * 0.18));
  assert.equal(totals.grandTotal, round2(1350 + totals.gstAmount));
}

testDiscountInQuotationTotals();
console.log("verify-project-estimate: all tests passed");
