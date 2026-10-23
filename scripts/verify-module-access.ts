import assert from "node:assert/strict";

import {
  canAccessAppTab,
  canAccessHomeModule,
  HOME_MODULE_ORDER,
} from "../lib/dashboard/module-access";

function testAdminSeesAllModules() {
  for (const id of HOME_MODULE_ORDER) {
    assert.equal(canAccessHomeModule(id, "admin"), true, id);
  }
}

function testWorkshopRestrictions() {
  assert.equal(canAccessHomeModule("workshop-cost", "workshop"), false);
  assert.equal(canAccessHomeModule("estimate", "workshop"), false);
  assert.equal(canAccessHomeModule("quotation", "workshop"), false);
  assert.equal(canAccessHomeModule("cutting-sheet", "workshop"), true);
  assert.equal(canAccessHomeModule("documents", "workshop"), true);
}

function testSalesRestrictions() {
  assert.equal(canAccessHomeModule("workshop-cost", "sales"), false);
  assert.equal(canAccessHomeModule("profiles-rates", "sales"), false);
  assert.equal(canAccessHomeModule("estimate", "sales"), true);
  assert.equal(canAccessHomeModule("quotation", "sales"), true);
}

function testTabGuards() {
  assert.equal(canAccessAppTab("estimation", "workshop"), false);
  assert.equal(canAccessAppTab("estimate", "sales"), true);
  assert.equal(canAccessAppTab("summary", "admin"), true);
  assert.equal(canAccessAppTab("summary", "manager"), false);
}

testAdminSeesAllModules();
testWorkshopRestrictions();
testSalesRestrictions();
testTabGuards();
console.log("verify-module-access: all tests passed");
