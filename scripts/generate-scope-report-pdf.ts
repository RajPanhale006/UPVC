/**
 * Generate Shivshakti ProERP Application Scope Report PDF.
 *
 * Usage: npm run generate:scope-report
 * Output: docs/Shivshakti-ProERP-Scope-Report.pdf
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { buildScopeReportPdf } from "../lib/documents/scope-report-pdf";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const outDir = join(root, "docs");
const outPath = join(outDir, "Shivshakti-ProERP-Scope-Report.pdf");

mkdirSync(outDir, { recursive: true });

const doc = buildScopeReportPdf();
const buffer = Buffer.from(doc.output("arraybuffer"));

writeFileSync(outPath, buffer);

console.log(`Scope report generated: ${outPath}`);
console.log(`Pages: ${doc.getNumberOfPages()}`);
console.log(`Size: ${(buffer.length / 1024).toFixed(1)} KB`);
