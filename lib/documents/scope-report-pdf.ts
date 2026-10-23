import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import {
  APP_TITLE,
  COMPANY_ADDRESS,
  COMPANY_EMAIL,
  COMPANY_NAME,
  COMPANY_PHONES,
  COMPANY_WEBSITE,
  PRODUCT_NAME,
  PRODUCT_TAGLINE,
} from "@/lib/brand";
import {
  brandTableBodyStyles,
  brandTableHeadStyles,
  drawBrandFooter,
  drawBrandHeader,
  drawSectionTitle,
  formatPdfDate,
  PDF_MARGIN,
} from "@/lib/pdf/theme";

function getFinalY(doc: jsPDF, fallback: number): number {
  const table = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable;
  return table?.finalY ?? fallback;
}

function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + needed > pageHeight - 20) {
    doc.addPage();
    return PDF_MARGIN + 4;
  }
  return y;
}

function bodyText(
  doc: jsPDF,
  text: string,
  y: number,
  margin = PDF_MARGIN,
  maxWidth?: number,
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  const lines = doc.splitTextToSize(text, maxWidth ?? pageWidth - margin * 2);
  doc.text(lines, margin, y);
  return y + lines.length * 4.2 + 2;
}

function bulletList(doc: jsPDF, items: string[], y: number, margin = PDF_MARGIN): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  for (const item of items) {
    y = ensureSpace(doc, y, 8);
    const lines = doc.splitTextToSize(`• ${item}`, pageWidth - margin * 2 - 4);
    doc.text(lines, margin + 2, y);
    y += lines.length * 4.2 + 1.5;
  }
  return y + 2;
}

/** Build the Shivshakti ProERP application scope report PDF. */
export function buildScopeReportPdf(): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = PDF_MARGIN;
  const reportDate = formatPdfDate();

  let y = drawBrandHeader(doc, {
    docTitle: "Application Scope Report",
    docSubtitle: PRODUCT_NAME,
    rightLabel: reportDate,
    margin,
  });

  y = bodyText(
    doc,
    `${PRODUCT_NAME} is an offline-first UPVC workshop ERP for Shivshakti Enterprises. It covers measurement entry, Sarik-method cutting calculations, internal workshop costing, customer estimates, quotations, labour PDFs, and job document management — on web and Android.`,
    y,
  );

  y = drawSectionTitle(doc, "1. Executive Summary", y + 2, margin);
  y = bulletList(doc, [
    "Single application for sales, workshop, and management workflows",
    "Centralized calculation engine — one source of truth for cutting, costing, and quotation",
    "Offline-capable: data stored locally (localStorage + IndexedDB); no server required for core use",
    "Mobile-ready via Capacitor (Android APK build supported)",
    "Role-based module access: Admin, Manager, Sales, Workshop",
  ], y);

  y = drawSectionTitle(doc, "2. Product Types & Calculation Methods", ensureSpace(doc, y, 40), margin);

  autoTable(doc, {
    startY: y,
    head: [["Product", "Method / Engine", "Key Outputs"]],
    body: [
      [
        "UPVC Sliding Window",
        "Sarik Method · Standard · Workshop Confirmed",
        "Sash cuts, glass, interlock, running feet, profile cost, labour PDF",
      ],
      [
        "Single Door (Casement)",
        "Sarik Door Method v2.0",
        "Frame, sash, beading, glass, flat mullion (double), door hardware",
      ],
      [
        "Double Door (Casement)",
        "Sarik Door Method v2.0",
        "Two-leaf sash, shared flat mullion formula, per-leaf glass/beading",
      ],
      [
        "Fixed UPVC Partition Frame",
        "Fixed Frame Engine v1.0",
        "Single frame / separate modules / internal partitions; glass sheet; bar optimization",
      ],
    ],
    styles: brandTableBodyStyles(),
    headStyles: brandTableHeadStyles(),
    margin: { left: margin, right: margin },
    columnStyles: {
      0: { cellWidth: 38 },
      1: { cellWidth: 52 },
      2: { cellWidth: pageWidth - margin * 2 - 90 },
    },
  });
  y = getFinalY(doc, y + 40) + 6;

  y = drawSectionTitle(doc, "3. Home Dashboard Modules", ensureSpace(doc, y, 30), margin);
  y = bodyText(
    doc,
    "Eight role-filtered modules accessible from the Home screen. Smart Estimation Center is the primary entry point for Partner/Manager roles.",
    y,
  );

  autoTable(doc, {
    startY: y + 2,
    head: [["Module", "Purpose", "Typical Roles"]],
    body: [
      ["Smart Estimation Center", "Measure → calculate → save → quote in one flow", "All except restricted"],
      ["Cutting Sheet", "Labour cutting sizes & technical production details", "Admin, Manager, Workshop"],
      ["Workshop Cost", "Internal manufacturing cost, margin, customer pricing", "Admin, Manager"],
      ["Estimate", "Multi-product preliminary customer estimates", "Admin, Manager, Sales"],
      ["Quotation", "Create, revise, share customer quotations", "Admin, Manager, Sales"],
      ["Documents", "PDF history, revisions, downloads", "All roles"],
      ["Profiles & Rates", "Profile catalog, kg rates, hardware master", "Admin, Manager"],
      ["Settings", "Company letterhead, taxes, diagnostics", "Admin, Manager"],
    ],
    styles: { ...brandTableBodyStyles(), fontSize: 9 },
    headStyles: brandTableHeadStyles(),
    margin: { left: margin, right: margin },
  });
  y = getFinalY(doc, y + 50) + 6;

  y = drawSectionTitle(doc, "4. Smart Estimation Center", ensureSpace(doc, y, 30), margin);
  y = bulletList(doc, [
    "Product selector: Window · Single Door · Double Door · Fixed Frame",
    "Measurement entry in mm or ft/in with live validation",
    "Cutting summary, profile cost, workshop cost, and product preview",
    "Save product to job, add to quotation, export labour cutting PDF",
    "AI Assistant: text and voice commands for calculate, navigate, and read results",
    "Add to Estimate for multi-opening project estimates",
  ], y);

  y = drawSectionTitle(doc, "5. Job & Workflow Management", ensureSpace(doc, y, 30), margin);
  y = bulletList(doc, [
    "Structured job IDs (JOB-YYYY-NNNN) with multi-product support (W-001, D-001, F-001)",
    "Job statuses: draft → measured → estimation-ready → quotation-sent → approved → production → completed",
    "Activity audit trail per job (product edits, documents, quotation revisions)",
    "Quotation revision workflow with superseded/approved states",
    "Document registry with blob storage (IndexedDB) and revision numbering",
  ], y);

  y = drawSectionTitle(doc, "6. Documents & PDF Outputs", ensureSpace(doc, y, 30), margin);
  y = bulletList(doc, [
    "Labour Cutting PDF — component sizes, cut tables, optional preview diagrams",
    "Quotation PDF — Shivshakti letterhead, GST modes, grouped line items",
    "Estimation / proposal PDFs (premium proposal module)",
    "Summary profile weight PDF",
    "Company settings flow into quotation headers and footers dynamically",
  ], y);

  y = drawSectionTitle(doc, "7. Fixed Frame Module (Latest)", ensureSpace(doc, y, 30), margin);
  y = bulletList(doc, [
    "Construction modes: SINGLE_FRAME · SEPARATE_MODULES · INTERNAL_PARTITIONS",
    "Division modes: NONE · AUTO · EQUAL · MANUAL with joint gaps and clearances",
    "Profile-specific glass deductions (frame + bead + thickness)",
    "Reinforcement rules: full perimeter, horizontal, vertical, custom",
    "Bar optimization (5800 mm standard, kerf, reusable leftover tracking)",
    "Workshop cost: profiles, glass, hardware/consumables, labour, transportation",
    "No sliding track, sash, roller, handle, lock, or mesh logic",
  ], y);

  y = drawSectionTitle(doc, "8. User Roles & Permissions", ensureSpace(doc, y, 30), margin);

  autoTable(doc, {
    startY: y + 2,
    head: [["Role", "Access Highlights"]],
    body: [
      ["Admin", "Full access; company settings; finalize documents; legacy Summary tab"],
      ["Manager", "Smart Estimation-first; jobs, documents, quotations; internal rates"],
      ["Sales", "Customer quotations and estimates; no internal workshop rates"],
      ["Workshop", "Labour sheets and cutting; no internal costing or sales tools"],
    ],
    styles: brandTableBodyStyles(),
    headStyles: brandTableHeadStyles(),
    margin: { left: margin, right: margin },
  });
  y = getFinalY(doc, y + 40) + 6;

  y = drawSectionTitle(doc, "9. Technical Architecture", ensureSpace(doc, y, 30), margin);
  y = bulletList(doc, [
    "Frontend: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS",
    "Mobile: Capacitor 7 — Android APK (debug/release build scripts included)",
    "PDF: jsPDF + jspdf-autotable; pdf-lib for document assembly",
    "Storage: localStorage (jobs, settings, counters); IndexedDB (PDF blobs)",
    "Calculation libs: lib/calculations, lib/cutting, lib/estimation, lib/summary",
    "Verification: 10+ automated scripts (verify:all) for cutting, doors, fixed frame, consistency",
  ], y);

  y = drawSectionTitle(doc, "10. Verification & Quality Assurance", ensureSpace(doc, y, 30), margin);
  y = bulletList(doc, [
    "verify:cutting — Sarik window acceptance samples",
    "verify:door-cutting — Sarik door v2 sash height (+3 mm correction)",
    "verify:fixed-frame — partition frame, Ahilyanagar 385 sq.ft regression",
    "verify:calculations — end-to-end product → summary → quotation",
    "verify:consistency — cross-module parity for all product types",
    "verify:workflow — job IDs, quotation revisions, product lifecycle",
    "verify:assistant — AI command parser regression",
  ], y);

  y = drawSectionTitle(doc, "11. Known Limitations & Roadmap Notes", ensureSpace(doc, y, 30), margin);
  y = bulletList(doc, [
    "Roles are device-local (localStorage) — not server-enforced multi-user auth",
    "Optional OpenAI assistant API unavailable in static APK export (local parser used offline)",
    "Fixed frame manual module drag-resize UI not yet implemented",
    "Email API route optional — WhatsApp/share uses local PDF when server unconfigured",
  ], y);

  y = ensureSpace(doc, y, 30);
  y = drawSectionTitle(doc, "Contact & Product Information", y, margin);
  autoTable(doc, {
    startY: y + 2,
    theme: "plain",
    styles: { ...brandTableBodyStyles(), fontSize: 9 },
    body: [
      ["Product", `${PRODUCT_NAME} — ${PRODUCT_TAGLINE}`],
      ["Application", APP_TITLE],
      ["Company", COMPANY_NAME],
      ["Address", COMPANY_ADDRESS],
      ["Phone", COMPANY_PHONES],
      ["Email", COMPANY_EMAIL],
      ["Website", COMPANY_WEBSITE],
      ["Report date", reportDate],
      ["Document", "Application Scope Report — internal / stakeholder use"],
    ],
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 32, fillColor: [238, 242, 255] },
    },
    margin: { left: margin, right: margin },
  });

  drawBrandFooter(doc, `${PRODUCT_NAME} · Application Scope Report · ${reportDate}`);

  return doc;
}

export function buildScopeReportPdfBlob(): Blob {
  return buildScopeReportPdf().output("blob");
}

export function buildScopeReportPdfArrayBuffer(): ArrayBuffer {
  const buf = buildScopeReportPdf().output("arraybuffer");
  return buf instanceof ArrayBuffer ? buf : new ArrayBuffer(0);
}
