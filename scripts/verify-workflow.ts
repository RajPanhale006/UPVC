/**
 * Phase 4 workflow verification — job IDs, quotation bridge, documents, compatibility.
 */
import assert from "node:assert/strict";

import {
  addCurrentProductToQuotation,
  resolveDuplicateProductAdd,
} from "../lib/calculations/bridge/quotation-from-job";
import { buildSourceSnapshot, snapshotsMatch } from "../lib/documents/snapshot";
import {
  ensureJobId,
  ensureProductId,
  ensureQuotationId,
  formatQuotationIdWithRevision,
  generateJobId,
} from "../lib/jobs/id-generator";
import { createEmptyJob, duplicateProduct, removeProduct } from "../lib/jobs/products";
import { normalizeJob } from "../lib/jobs/storage";
import { validateBeforeDocument } from "../lib/jobs/validation";
import { getDefaultQuotationForm } from "../lib/quotation/defaults";
import { calculateQuotation } from "../lib/quotation/calculate";
import {
  duplicateQuotationAsRevision,
  getQuotationDisplayId,
  setQuotationStatus,
} from "../lib/quotation/workflow";
import { getDefaultEstimationInputs } from "../lib/estimation/defaults";
import { createDefaultCuttingOptions } from "../lib/cutting/presets";
import { getDefaultProfileRateSettings } from "../lib/profiles/catalog";
import { blockInternalDocumentShare, sanitizeIndianPhone } from "../lib/sharing/whatsapp";
import { validateCompanySettings, getDefaultCompanySettings } from "../lib/company-settings";

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}

test("structured job id format", () => {
  const id = ensureJobId();
  assert.match(id, /^JOB-\d{4}-\d{4}$/);
});

test("quotation revision display", () => {
  assert.equal(formatQuotationIdWithRevision("QTN-2026-0001", 1), "QTN-2026-0001");
  assert.equal(formatQuotationIdWithRevision("QTN-2026-0001", 2), "QTN-2026-0001-R2");
});

test("create job with product", () => {
  const job = createEmptyJob("Tester");
  assert.ok(job.products.length >= 1);
  assert.match(job.products[0]!.id, /^W-/);
  assert.ok(job.quotation.quotationId?.startsWith("QTN-"));
});

test("duplicate and remove product", () => {
  let job = createEmptyJob("Tester");
  const firstId = job.products[0]!.id;
  job = duplicateProduct(job, firstId, "Tester");
  assert.equal(job.products.length, 2);
  job = removeProduct(job, job.products[1]!.id, "Tester");
  assert.equal(job.products.length, 1);
});

test("quotation revision workflow", () => {
  let job = createEmptyJob("Tester");
  job = setQuotationStatus(job, "sent");
  assert.equal(job.quotation.status, "sent");
  job = duplicateQuotationAsRevision(job);
  assert.equal(job.quotation.revision, 2);
  assert.equal(job.quotation.status, "draft");
});

test("add current product uses real dimensions", () => {
  const estimation = getDefaultEstimationInputs();
  estimation.widthFeet = 3;
  estimation.widthInches = 11;
  estimation.heightFeet = 4;
  estimation.heightInches = 0;
  estimation.numberOfWindows = 2;

  const result = addCurrentProductToQuotation({
    estimationInputs: estimation,
    cuttingOptions: createDefaultCuttingOptions(estimation.trackSystemId, "sarik"),
    profileRates: getDefaultProfileRateSettings(),
    cuttingJobMeta: { jobName: "Test Window", jobNotes: "", windowLocation: "Hall" },
    quotationForm: getDefaultQuotationForm(),
    productId: "W-001",
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.row.unit, "mm");
    assert.ok(result.row.length > 1000);
    assert.equal(result.row.quantity, 2);
    assert.equal(result.row.productId, "W-001");
    assert.match(result.message, /added to quotation/i);
  }
});

test("duplicate product prompt resolution", () => {
  const estimation = getDefaultEstimationInputs();
  const base = {
    estimationInputs: estimation,
    cuttingOptions: createDefaultCuttingOptions(estimation.trackSystemId, "sarik"),
    profileRates: getDefaultProfileRateSettings(),
    cuttingJobMeta: { jobName: "Test", jobNotes: "", windowLocation: "" },
    quotationForm: getDefaultQuotationForm(),
    productId: "W-001",
  };
  const first = addCurrentProductToQuotation(base);
  assert.equal(first.ok, true);
  if (!first.ok) return;

  const dup = addCurrentProductToQuotation({ ...base, quotationForm: first.form });
  assert.equal(dup.ok, false);
  assert.equal(dup.duplicate, true);
  if (!dup.duplicate) return;

  const resolved = resolveDuplicateProductAdd(base, "separate", dup.existingRow, dup.pendingRow);
  assert.equal(resolved.ok, true);
  if (resolved.ok) {
    assert.equal(resolved.form.windows.length, 2);
  }
});

test("document snapshot detects unchanged source", () => {
  const a = buildSourceSnapshot("test", { grandTotal: 1000, dimensions: "1187x1208" });
  const b = buildSourceSnapshot("test", { grandTotal: 1000, dimensions: "1187x1208" });
  assert.equal(snapshotsMatch(a, b), true);
});

test("internal documents blocked from customer share", () => {
  assert.equal(blockInternalDocumentShare("labour-cutting-sheet"), true);
  assert.equal(blockInternalDocumentShare("standard-quotation"), false);
});

test("whatsapp phone sanitization", () => {
  assert.equal(sanitizeIndianPhone("9665123238"), "919665123238");
  assert.equal(sanitizeIndianPhone("+91 96651 23238"), "919665123238");
});

test("quotation validation requires customer rate", () => {
  const form = getDefaultQuotationForm();
  form.customerName = "Test Customer";
  form.windows[0]!.ratePerSqFt = 0;
  const result = calculateQuotation(form);
  const validation = validateBeforeDocument({
    documentType: "standard-quotation",
    job: {
      customerName: form.customerName,
      customerPhone: "",
      billingAddress: "",
      projectName: "Project",
    },
    quotationResult: result,
    companyName: "Shivshakti Enterprises",
  });
  assert.equal(validation.ok, false);
});

test("legacy job normalization assigns ids", () => {
  const legacy = createEmptyJob("Legacy");
  legacy.id = "legacy-id";
  legacy.products[0]!.id = "legacy-product";
  legacy.quotation.quotationId = undefined;
  const normalized = normalizeJob(legacy);
  assert.match(normalized.id, /^JOB-/);
  assert.match(normalized.products[0]!.id, /^W-/);
  assert.ok(normalized.quotation.quotationId?.startsWith("QTN-"));
});

test("company settings validation accepts defaults", () => {
  const result = validateCompanySettings(getDefaultCompanySettings());
  assert.equal(result.ok, true);
});

console.log("\nAll workflow verification tests passed.");
