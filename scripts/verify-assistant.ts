import assert from "node:assert/strict";

import { parseAssistantCommandLocal } from "../lib/assistant/parse-local";
import { validateCommandPermission } from "../lib/assistant/permissions";
import { intentRequiresConfirmation } from "../lib/assistant/permissions";

function testCreateWindow() {
  const cmd = parseAssistantCommandLocal("Create a window of 1600 by 1200 millimetres");
  assert.equal(cmd.intent, "create-product");
  assert.equal(cmd.productType, "window");
  assert.equal(cmd.measurements?.width, 1600);
  assert.equal(cmd.measurements?.height, 1200);
  assert.ok(cmd.confidence >= 0.8);
}

function testTrackAndGlass() {
  const cmd = parseAssistantCommandLocal("Make it three track with three glass");
  assert.equal(cmd.intent, "update-configuration");
  assert.equal(cmd.configuration?.trackSystemId, "3-track-t109");
  assert.equal(cmd.configuration?.glassPanelQty, 3);
}

function testCalculate() {
  const cmd = parseAssistantCommandLocal("Calculate the cutting sizes");
  assert.equal(cmd.intent, "calculate-estimation");
}

function testWorkshopCostQuery() {
  const cmd = parseAssistantCommandLocal("What is the workshop cost?");
  assert.equal(cmd.intent, "get-result");
  assert.equal(cmd.resultQuery, "workshop-cost");
}

function testSaveRequiresConfirmation() {
  const cmd = parseAssistantCommandLocal("Save this product to the job");
  assert.equal(cmd.intent, "save-product");
  assert.ok(cmd.requiresConfirmation || intentRequiresConfirmation(cmd.intent));
}

function testPermissions() {
  const workshopDenied = validateCommandPermission(
    { intent: "get-result", resultQuery: "workshop-cost", requiresConfirmation: false, confidence: 0.9 },
    "workshop",
  );
  assert.equal(workshopDenied.allowed, false);

  const managerAllowed = validateCommandPermission(
    { intent: "get-result", resultQuery: "workshop-cost", requiresConfirmation: false, confidence: 0.9 },
    "manager",
  );
  assert.equal(managerAllowed.allowed, true);
}

function testOpenModule() {
  const cmd = parseAssistantCommandLocal("Open Documents");
  assert.equal(cmd.intent, "open-module");
  assert.equal(cmd.targetModule, "documents");
}

testCreateWindow();
testTrackAndGlass();
testCalculate();
testWorkshopCostQuery();
testSaveRequiresConfirmation();
testPermissions();
testOpenModule();

console.log("verify-assistant: all tests passed");
