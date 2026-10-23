"use client";

import { Calculator, Eye, FileImage, FileText, ListTree, Plus, Printer, Trash2, Upload } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PdfFeedback } from "@/components/pdf/pdf-feedback";
import { PdfPreviewModal } from "@/components/pdf/pdf-preview-modal";
import { MessageBanner } from "@/components/workshop/workshop-ui";
import { formatCurrency } from "@/lib/calculations/format";
import type { DoorHardwareMasterSettings } from "@/lib/door-hardware";
import type { WorkshopJob } from "@/lib/jobs";
import { getCurrentUserName, canViewInternalRates, getCurrentUserRole } from "@/lib/jobs/permissions";
import {
  loadPartnerUnitMode,
  savePartnerUnitMode,
  type PartnerUnitMode,
} from "@/lib/partner-workspace";
import { pdfToBlobUrl, revokePdfBlobUrl } from "@/lib/pdf/preview";
import { updateMarketRatePerKg, type ProfileRateSettings } from "@/lib/profiles";
import {
  loadProjectEstimateSettings,
} from "@/lib/project-estimate";
import type { QuotationForm } from "@/lib/quotation";
import { saveQuotationRevision } from "@/lib/quotation/workflow";
import { isNativeApp } from "@/lib/capacitor/platform";
import { calculateQuotation, exportQuotationPdf } from "@/lib/quotation";
import {
  applyImportedFileToRows,
  calculateSimpleQuoteRows,
  applyMmToRow,
  applyFeetInchesToRow,
  displayRowMm,
  getRowHeightMm,
  getRowWidthMm,
  mmToFeetInchesExact,
  createEmptyQuoteRow,
  convertSimpleQuoteToQuotation,
  exportSimpleQuotePdf,
  exportSimpleQuoteSpecSheetPdf,
  buildSimpleQuotePdf,
  buildSimpleQuoteSpecSheetPdfAsync,
  loadSimpleQuoteRows,
  saveSimpleQuoteRows,
  loadSimpleQuoteRateSettings,
  saveSimpleQuoteRateSettings,
  getDefaultSimpleQuoteRateSettings,
  LOWERS_MIN_WIDTH_FT,
  LOWERS_MIN_HEIGHT_FT,
  LOWERS_MATERIALS,
  SIMPLE_QUOTE_PRODUCT_OPTIONS,
  getSimpleQuoteProductLabel,
  syncSimpleQuoteRowsToJob,
  applyCustomerQuotationRates,
  buildPerRowOverridesFromTotals,
  loadCustomerQuotationRateSettings,
  saveCustomerQuotationRateSettings,
  type CustomerQuotationRateSettings,
  type SimpleQuoteRateSettings,
  type SimpleQuoteRow,
  type SimpleQuoteRowResult,
  type SimpleQuoteTotals,
  type SimpleQuotePdfInput,
  type SimpleQuoteSpecSheetInput,
} from "@/lib/simple-quote";
import { cn } from "@/lib/utils";

type SimpleQuoteSheetProps = {
  job: WorkshopJob;
  profileRates: ProfileRateSettings;
  doorHardwareMaster: DoorHardwareMasterSettings;
  quotationForm: QuotationForm;
  onJobChange: (job: WorkshopJob) => void;
  onQuotationChange: (form: QuotationForm) => void;
  onProfileRatesChange: (settings: ProfileRateSettings) => void;
  onOpenQuotation: () => void;
  onOpenMaterialDetails?: () => void;
};

function parseNumber(value: string, fallback = 0): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** Wide rectangular inputs so mm decimals (e.g. 1717.7) stay fully visible. */
const DIMENSION_INPUT_CLASS =
  "h-11 w-full min-w-[10.5rem] max-w-none !rounded-md border-2 border-slate-300 bg-white px-3 py-2 text-base font-semibold tabular-nums tracking-tight shadow-none hover:border-slate-400 focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-200";

const QTY_INPUT_CLASS =
  "h-11 w-24 min-w-[5rem] !rounded-md border-2 border-slate-300 bg-white px-2 text-center text-base font-semibold tabular-nums shadow-none";

function resultForRow(
  totals: SimpleQuoteTotals | null,
  rowId: string,
): SimpleQuoteRowResult | null {
  return totals?.rows.find((row) => row.rowId === rowId) ?? null;
}

export function SimpleQuoteSheet({
  job,
  profileRates,
  doorHardwareMaster,
  quotationForm,
  onJobChange,
  onQuotationChange,
  onProfileRatesChange,
  onOpenQuotation,
  onOpenMaterialDetails,
}: SimpleQuoteSheetProps) {
  const showWorkshopCost = canViewInternalRates(getCurrentUserRole());
  const [rows, setRows] = useState<SimpleQuoteRow[]>(() => loadSimpleQuoteRows(job.id));
  const [rateSettings, setRateSettings] = useState<SimpleQuoteRateSettings>(() =>
    loadSimpleQuoteRateSettings(job.id),
  );
  const [unitMode, setUnitMode] = useState<PartnerUnitMode>(() => loadPartnerUnitMode());
  const [totals, setTotals] = useState<SimpleQuoteTotals | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"info" | "success" | "warning" | "error">("info");
  const [isCalculating, setIsCalculating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPdfBusy, setIsPdfBusy] = useState(false);
  const [isSpecPdfBusy, setIsSpecPdfBusy] = useState(false);
  const [isQuotationPdfBusy, setIsQuotationPdfBusy] = useState(false);
  const [generatedQuotation, setGeneratedQuotation] = useState<QuotationForm | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [replaceOnImport, setReplaceOnImport] = useState(true);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [customerQuotationRates, setCustomerQuotationRates] = useState<CustomerQuotationRateSettings>(
    () => loadCustomerQuotationRateSettings(job.id),
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (quotationForm.customerName.trim()) return;
    if (!job.customerName.trim() && !job.billingAddress.trim() && !job.customerPhone?.trim()) {
      return;
    }
    onQuotationChange({
      ...quotationForm,
      customerName: job.customerName,
      customerAddress: quotationForm.customerAddress || job.billingAddress,
      customerPhone: quotationForm.customerPhone || job.customerPhone || "",
    });
    // Seed once when the active job loads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job.id]);

  useEffect(() => {
    setCustomerQuotationRates(loadCustomerQuotationRateSettings(job.id));
  }, [job.id]);

  function updateQuotationField<K extends keyof QuotationForm>(
    key: K,
    value: QuotationForm[K],
  ) {
    onQuotationChange({ ...quotationForm, [key]: value });
  }

  function buildPdfInput(activeTotals: SimpleQuoteTotals): SimpleQuotePdfInput {
    return {
      jobId: job.id,
      projectName: job.projectName,
      customerName: quotationForm.customerName || job.customerName,
      unitMode,
      showWorkshopCost,
      rows,
      totals: activeTotals,
      profitMarginPercent: rateSettings.profitMarginPercent,
      generatedAt: new Date().toISOString(),
    };
  }

  function buildSpecSheetInput(activeTotals: SimpleQuoteTotals): SimpleQuoteSpecSheetInput {
    return {
      jobId: job.id,
      projectName: job.projectName,
      customerName: quotationForm.customerName || job.customerName,
      rows,
      totals: activeTotals,
      profitMarginPercent: rateSettings.profitMarginPercent,
      generatedAt: new Date().toISOString(),
      profileRates,
      doorHardwareMaster,
      cuttingJobMeta: job.cuttingJobMeta,
      rateSettings,
      showPrices: true,
    };
  }

  function getActiveTotals(): SimpleQuoteTotals | null {
    if (totals && totals.validRowCount > 0) return totals;
    const computed = calculateSimpleQuoteRows(
      rows,
      profileRates,
      doorHardwareMaster,
      job.cuttingJobMeta,
      rateSettings,
    );
    return computed.validRowCount > 0 ? computed : null;
  }

  const quotationTotals = useMemo(() => {
    const base = getActiveTotals();
    if (!base) return null;
    return applyCustomerQuotationRates(base, customerQuotationRates);
  }, [
    totals,
    rows,
    profileRates,
    doorHardwareMaster,
    job.cuttingJobMeta,
    rateSettings,
    customerQuotationRates,
  ]);

  function updateCustomerQuotationRates(patch: Partial<CustomerQuotationRateSettings>) {
    setCustomerQuotationRates((prev) => {
      const next = { ...prev, ...patch };
      saveCustomerQuotationRateSettings(job.id, next);
      return next;
    });
  }

  async function handlePreviewPdf() {
    const activeTotals = getActiveTotals();
    if (!activeTotals) {
      setMessage("Calculate at least one valid row before previewing PDF.");
      return;
    }
    setIsPdfBusy(true);
    setMessage(null);
    try {
      const doc = buildSimpleQuotePdf(buildPdfInput(activeTotals));
      const url = pdfToBlobUrl(doc);
      setPdfPreviewUrl((prev) => {
        revokePdfBlobUrl(prev);
        return url;
      });
    } catch {
      setMessage("Could not generate PDF preview.");
    } finally {
      setIsPdfBusy(false);
    }
  }

  async function handleExportSpecSheetPdf() {
    const activeTotals = getActiveTotals();
    if (!activeTotals) {
      setMessage("Calculate at least one valid row before exporting spec sheet.");
      return;
    }
    setIsSpecPdfBusy(true);
    setMessage(null);
    try {
      await exportSimpleQuoteSpecSheetPdf(buildSpecSheetInput(activeTotals));
      setMessage("Window specification sheet exported.");
      setMessageTone("success");
    } catch {
      setMessage("Could not export specification sheet.");
      setMessageTone("error");
    } finally {
      setIsSpecPdfBusy(false);
    }
  }

  async function handlePreviewSpecSheetPdf() {
    const activeTotals = getActiveTotals();
    if (!activeTotals) {
      setMessage("Calculate at least one valid row before previewing spec sheet.");
      return;
    }
    setIsSpecPdfBusy(true);
    setMessage(null);
    try {
      const doc = await buildSimpleQuoteSpecSheetPdfAsync(buildSpecSheetInput(activeTotals));
      const url = pdfToBlobUrl(doc);
      setPdfPreviewUrl((prev) => {
        revokePdfBlobUrl(prev);
        return url;
      });
    } catch {
      setMessage("Could not generate spec sheet preview.");
      setMessageTone("error");
    } finally {
      setIsSpecPdfBusy(false);
    }
  }

  async function handleExportPdf() {
    const activeTotals = getActiveTotals();
    if (!activeTotals) {
      setMessage("Calculate at least one valid row before exporting PDF.");
      return;
    }
    setIsPdfBusy(true);
    setMessage(null);
    try {
      await exportSimpleQuotePdf(buildPdfInput(activeTotals));
      setMessage("Quick Quote PDF exported.");
    } catch {
      setMessage("Could not export PDF.");
    } finally {
      setIsPdfBusy(false);
    }
  }

  useEffect(() => {
    saveSimpleQuoteRows(job.id, rows);
  }, [job.id, rows]);

  useEffect(() => {
    saveSimpleQuoteRateSettings(job.id, rateSettings);
  }, [job.id, rateSettings]);

  useEffect(() => {
    savePartnerUnitMode(unitMode);
  }, [unitMode]);

  const groupedOptions = useMemo(() => {
    const groups = new Map<string, typeof SIMPLE_QUOTE_PRODUCT_OPTIONS>();
    for (const option of SIMPLE_QUOTE_PRODUCT_OPTIONS) {
      const list = groups.get(option.group) ?? [];
      list.push(option);
      groups.set(option.group, list);
    }
    return groups;
  }, []);

  const updateRow = useCallback((rowId: string, patch: Partial<SimpleQuoteRow>) => {
    setRows((current) =>
      current.map((row) => (row.id === rowId ? { ...row, ...patch } : row)),
    );
    setTotals(null);
  }, []);

  const updateRowFeetInches = useCallback(
    (
      rowId: string,
      patch: Partial<Pick<SimpleQuoteRow, "widthFeet" | "widthInches" | "heightFeet" | "heightInches">>,
    ) => {
      setRows((current) =>
        current.map((row) =>
          row.id === rowId ? applyFeetInchesToRow(row, patch) : row,
        ),
      );
      setTotals(null);
    },
    [],
  );

  function switchUnitMode(mode: PartnerUnitMode) {
    if (mode === unitMode) return;
    setRows((current) =>
      current.map((row) => {
        if (mode === "mm") {
          const widthMm = getRowWidthMm(row);
          const heightMm = getRowHeightMm(row);
          let next = { ...row };
          if (widthMm > 0) {
            next = applyMmToRow(next, "width", String(widthMm));
          }
          if (heightMm > 0) {
            next = applyMmToRow(next, "height", String(heightMm));
          }
          return next;
        }
        const widthMm = getRowWidthMm(row);
        const heightMm = getRowHeightMm(row);
        const widthFi = mmToFeetInchesExact(widthMm);
        const heightFi = mmToFeetInchesExact(heightMm);
        return {
          ...row,
          widthFeet: widthFi.feet,
          widthInches: widthFi.inches,
          heightFeet: heightFi.feet,
          heightInches: heightFi.inches,
          widthMm: null,
          heightMm: null,
          widthMmStr: "",
          heightMmStr: "",
        };
      }),
    );
    setUnitMode(mode);
    setTotals(null);
  }

  function addRow() {
    setRows((current) => [...current, createEmptyQuoteRow()]);
    setTotals(null);
  }

  function removeRow(rowId: string) {
    setRows((current) => {
      if (current.length <= 1) return current;
      return current.filter((row) => row.id !== rowId);
    });
    setTotals(null);
  }

  function clearAllRows() {
    const hasData = rows.some(
      (row) =>
        row.widthMmStr ||
        row.heightMmStr ||
        row.widthMm ||
        row.heightMm ||
        row.widthFeet ||
        row.widthInches ||
        row.heightFeet ||
        row.heightInches,
    );
    if (hasData && !window.confirm("Delete all rows and start with a blank sheet?")) {
      return;
    }
    setRows([createEmptyQuoteRow()]);
    setRateSettings(getDefaultSimpleQuoteRateSettings());
    setTotals(null);
    setMessage("Sheet cleared. Add sizes and lowers rates manually or import a new file.");
    setMessageTone("info");
  }

  function applyTypeToAllRows(productType: SimpleQuoteRow["productType"]) {
    setRows((current) => current.map((row) => ({ ...row, productType })));
    setTotals(null);
    setMessage(`Applied "${getSimpleQuoteProductLabel(productType)}" to all rows. Tap Calculate All.`);
    setMessageTone("success");
  }

  function updateRowMm(rowId: string, axis: "width" | "height", raw: string) {
    setRows((current) =>
      current.map((row) =>
        row.id === rowId ? applyMmToRow(row, axis, raw) : row,
      ),
    );
    setTotals(null);
  }

  function updateRateSetting<K extends keyof SimpleQuoteRateSettings>(
    key: K,
    value: SimpleQuoteRateSettings[K],
  ) {
    setRateSettings((current) => ({ ...current, [key]: value }));
    setTotals(null);
  }

  function updateRateNumber(key: keyof SimpleQuoteRateSettings, raw: string) {
    updateRateSetting(key, parseNumber(raw) as SimpleQuoteRateSettings[typeof key]);
  }

  function updateGlassRate(raw: string) {
    const value = parseNumber(raw, rateSettings.glassRates[rateSettings.glassSize]);
    setRateSettings((current) => ({
      ...current,
      glassRates: {
        ...current.glassRates,
        [current.glassSize]: value,
      },
    }));
    setTotals(null);
  }

  function handleCalculateAll(nextRows: SimpleQuoteRow[] = rows) {
    setIsCalculating(true);
    setMessage(null);
    const nextTotals = calculateSimpleQuoteRows(
      nextRows,
      profileRates,
      doorHardwareMaster,
      job.cuttingJobMeta,
      rateSettings,
    );
    setTotals(nextTotals);
    setIsCalculating(false);
    if (nextTotals.validRowCount === 0) {
      setMessage("Fix row sizes or types — no valid quotation lines.");
      return;
    }
    setMessage(
      `Calculated ${nextTotals.validRowCount} line(s). Customer total ${formatCurrency(nextTotals.totalCustomerAmount)}.`,
    );
    return nextTotals;
  }

  async function handleImportFile(file: File) {
    setIsImporting(true);
    setMessage("Starting import…");
    setMessageTone("info");
    try {
      const result = await applyImportedFileToRows(
        file,
        rows,
        (progress) => {
          setMessage(progress);
          setMessageTone("info");
        },
        replaceOnImport,
      );
      if (!result.ok) {
        setMessage(result.message);
        setMessageTone("error");
        return;
      }

      setRows(result.rows);
      const nextTotals = handleCalculateAll(result.rows);
      if (!nextTotals || nextTotals.validRowCount === 0) {
        setMessage(
          `Imported ${result.importedCount} line(s) but could not calculate. Check sizes and track type, then tap Calculate All.`,
        );
        setMessageTone("warning");
        return;
      }

      setMessage(
        replaceOnImport
          ? `Replaced sheet with ${result.importedCount} imported line(s). Customer total ${formatCurrency(nextTotals.totalCustomerAmount)}.`
          : `Imported ${result.importedCount} line(s). Customer total ${formatCurrency(nextTotals.totalCustomerAmount)}.`,
      );
      setMessageTone("success");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Import failed. Try Excel (.xlsx), a clearer photo, or enter sizes manually.",
      );
      setMessageTone("error");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleGenerateQuotation() {
    const activeTotals = quotationTotals ?? getActiveTotals();

    if (!activeTotals || activeTotals.validRowCount === 0) {
      setMessage("Calculate at least one valid row before generating quotation.");
      return;
    }

    if (
      !customerQuotationRates.useCalculatedRates &&
      !customerQuotationRates.usePerRowRates &&
      (customerQuotationRates.manualRatePerSqFt ?? 0) <= 0
    ) {
      setMessage("Enter the customer quotation rate (₹/sq.ft) before generating quotation.");
      setMessageTone("error");
      return;
    }

    setIsGenerating(true);
    setMessage(null);

    const quoteResult = convertSimpleQuoteToQuotation({
      job,
      rows,
      totals: activeTotals,
      quotationForm,
      profileRates,
      doorHardwareMaster,
      rateSettings,
      settings: loadProjectEstimateSettings(job.id),
      replaceExisting: true,
    });

    setIsGenerating(false);

    if (!quoteResult.ok) {
      setMessage(quoteResult.message);
      setMessageTone("error");
      return;
    }

    onQuotationChange(quoteResult.form);
    setGeneratedQuotation(quoteResult.form);

    const syncResult = syncSimpleQuoteRowsToJob(
      job,
      rows,
      profileRates,
      doorHardwareMaster,
      getCurrentUserName(),
      rateSettings,
    );
    const baseJob = syncResult.ok ? syncResult.job : job;
    onJobChange(
      saveQuotationRevision(
        {
          ...baseJob,
          customerName: quoteResult.form.customerName,
          billingAddress: quoteResult.form.customerAddress,
          customerPhone: quoteResult.form.customerPhone ?? baseJob.customerPhone,
          quotation: quoteResult.form,
        },
        quoteResult.form,
      ),
    );

    setMessage(
      customerQuotationRates.useCalculatedRates
        ? `Quotation ready with ${quoteResult.addedCount} line(s) — calculated customer rates applied.`
        : `Quotation ready with ${quoteResult.addedCount} line(s) — your entered customer rates applied.`,
    );
    setMessageTone("success");

    if (isNativeApp()) {
      return;
    }
    onOpenQuotation();
  }

  async function handleExportQuotationPdf() {
    const form =
      generatedQuotation ??
      (() => {
        const activeTotals = quotationTotals ?? getActiveTotals();
        if (!activeTotals || activeTotals.validRowCount === 0) return null;
        const result = convertSimpleQuoteToQuotation({
          job,
          rows,
          totals: activeTotals,
          quotationForm,
          profileRates,
          doorHardwareMaster,
          rateSettings,
          settings: loadProjectEstimateSettings(job.id),
          replaceExisting: true,
        });
        return result.ok ? result.form : null;
      })();

    if (!form || form.windows.length === 0) {
      setMessage("Generate quotation from Quick Quote first.");
      setMessageTone("error");
      return;
    }

    if (
      !customerQuotationRates.useCalculatedRates &&
      !customerQuotationRates.usePerRowRates &&
      (customerQuotationRates.manualRatePerSqFt ?? 0) <= 0
    ) {
      setMessage("Enter the customer quotation rate (₹/sq.ft) before exporting.");
      setMessageTone("error");
      return;
    }

    setIsQuotationPdfBusy(true);
    setMessage(
      form.windows.length > 12
        ? "Building quotation PDF (large quote — table only, no previews)…"
        : "Building quotation PDF…",
    );
    setMessageTone("info");
    try {
      await exportQuotationPdf(calculateQuotation(form));
      setMessage(`Quotation PDF downloaded with ${form.windows.length} line(s).`);
      setMessageTone("success");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not export quotation PDF.",
      );
      setMessageTone("error");
    } finally {
      setIsQuotationPdfBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Quick Quote Sheet</h2>
            <p className="mt-0.5 text-sm text-slate-600">
              Add sizes manually, import Excel/PDF/image, then calculate workshop &amp; customer rates.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,.pdf,.png,.jpg,.jpeg,.webp,image/*,application/pdf"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleImportFile(file);
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isImporting}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="size-4" />
              {isImporting ? "Importing…" : "Import File"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={clearAllRows}
              disabled={isImporting}
            >
              <Trash2 className="size-4" />
              Clear All
            </Button>
            <div className="flex rounded-lg border border-slate-200 p-0.5">
            <button
              type="button"
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-semibold transition",
                unitMode === "mm" ? "bg-slate-900 text-white" : "text-slate-600",
              )}
              onClick={() => switchUnitMode("mm")}
            >
              mm
            </button>
            <button
              type="button"
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-semibold transition",
                unitMode === "ft-in" ? "bg-slate-900 text-white" : "text-slate-600",
              )}
              onClick={() => switchUnitMode("ft-in")}
            >
              ft / in
            </button>
          </div>
          </div>
        </div>
        <label className="mt-3 flex cursor-pointer items-start gap-2 text-sm text-slate-700">
          <Checkbox
            checked={replaceOnImport}
            onCheckedChange={(checked) => setReplaceOnImport(checked === true)}
            className="mt-0.5"
          />
          <span>
            <strong>Replace previous data on import</strong>
            <span className="mt-0.5 block text-xs text-slate-500">
              When checked, importing a file clears old rows and uses only the new measurements.
              Uncheck to add imported rows below existing sizes.
            </span>
          </span>
        </label>
        <p className="mt-2 text-xs text-slate-500">
          Import supports <strong>Excel</strong>, <strong>PDF</strong>, and <strong>photos</strong>.
          On mobile, attached photos are scanned on the device (allow 20–40 seconds) — use a clear,
          straight photo of the handwritten size list.
        </p>
      </section>

      {message ? <MessageBanner tone={messageTone}>{message}</MessageBanner> : null}

      <section className="rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">Type for all rows</p>
            <p className="text-xs text-slate-500">Select once — same track/door type applied to every line</p>
          </div>
          <div className="min-w-[220px] sm:max-w-xs">
            <GroupedTypeSelect
              groupedOptions={groupedOptions}
              placeholder="Select type for all…"
              onValueChange={applyTypeToAllRows}
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-indigo-200 bg-indigo-50/60 px-4 py-4 shadow-sm">
        <div className="mb-3">
          <p className="text-sm font-semibold text-slate-900">Rates &amp; margin</p>
          <p className="text-xs text-slate-600">
            Set glass, hardware rates and profit % before Calculate All.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-600">Profile rate / kg (₹)</Label>
            <Input
              inputMode="decimal"
              className="h-10 bg-white"
              value={String(profileRates.marketRatePerKg)}
              onChange={(event) =>
                onProfileRatesChange(
                  updateMarketRatePerKg(
                    profileRates,
                    parseNumber(event.target.value, profileRates.marketRatePerKg),
                  ),
                )
              }
            />
            <p className="text-[11px] text-slate-500">
              Market ₹/kg — recalculates all profile ₹/ft in workshop cost.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-600">Lock type</Label>
            <Select
              value={rateSettings.lockType}
              onValueChange={(value) =>
                updateRateSetting(
                  "lockType",
                  value as SimpleQuoteRateSettings["lockType"],
                )
              }
            >
              <SelectTrigger className="h-10 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Handle Lock">Handle Lock</SelectItem>
                <SelectItem value="Button Lock">Button Lock</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-600">Handle lock (₹)</Label>
            <Input
              inputMode="decimal"
              className="h-10 bg-white"
              value={String(rateSettings.handleLockRate)}
              onChange={(event) => updateRateNumber("handleLockRate", event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-600">Button lock (₹)</Label>
            <Input
              inputMode="decimal"
              className="h-10 bg-white"
              value={String(rateSettings.buttonLockRate)}
              onChange={(event) => updateRateNumber("buttonLockRate", event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-600">Bearing / piece (₹)</Label>
            <Input
              inputMode="decimal"
              className="h-10 bg-white"
              value={String(rateSettings.bearingRatePerPiece)}
              onChange={(event) => updateRateNumber("bearingRatePerPiece", event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-600">Glass size</Label>
            <Select
              value={rateSettings.glassSize}
              onValueChange={(value) =>
                updateRateSetting("glassSize", value as SimpleQuoteRateSettings["glassSize"])
              }
            >
              <SelectTrigger className="h-10 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3mm">3 mm</SelectItem>
                <SelectItem value="3.5mm">3.5 mm</SelectItem>
                <SelectItem value="5mm">5 mm</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-slate-500">Thickness used for glass costing on all rows.</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-600">
              Glass {rateSettings.glassSize} / sq.ft (₹)
            </Label>
            <Input
              inputMode="decimal"
              className="h-10 bg-white"
              value={String(rateSettings.glassRates[rateSettings.glassSize])}
              onChange={(event) => updateGlassRate(event.target.value)}
            />
            <p className="text-[11px] text-slate-500">
              Area × this rate for {rateSettings.glassSize} glass in workshop cost.
            </p>
          </div>
          <div className="space-y-1.5 sm:col-span-2 lg:col-span-1 xl:col-span-2">
            <Label className="text-xs text-slate-600">Steel track / ft (₹)</Label>
            <Input
              inputMode="decimal"
              className="h-10 bg-white"
              value={String(rateSettings.bearingSteelTrackRatePerFt)}
              onChange={(event) =>
                updateRateNumber("bearingSteelTrackRatePerFt", event.target.value)
              }
            />
            <p className="text-[11px] text-slate-500">
              Bottom track length × this rate (width × sliding sash count).
            </p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-600">Profit margin (%)</Label>
            <Input
              inputMode="decimal"
              className="h-10 bg-white"
              value={String(rateSettings.profitMarginPercent)}
              onChange={(event) => updateRateNumber("profitMarginPercent", event.target.value)}
            />
            <p className="text-[11px] text-slate-500">
              Customer price = workshop cost + this %.
            </p>
          </div>
        </div>
        <div className="mt-3 grid gap-3 border-t border-indigo-200/80 pt-3 sm:grid-cols-3">
          {(["3mm", "3.5mm", "5mm"] as const).map((size) => (
            <div key={size} className="space-y-1.5">
              <Label className="text-xs text-slate-600">Glass {size} / sq.ft (₹)</Label>
              <Input
                inputMode="decimal"
                className="h-10 bg-white"
                value={String(rateSettings.glassRates[size])}
                onChange={(event) => {
                  const value = parseNumber(event.target.value, rateSettings.glassRates[size]);
                  setRateSettings((current) => ({
                    ...current,
                    glassRates: { ...current.glassRates, [size]: value },
                  }));
                  setTotals(null);
                }}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-4 shadow-sm">
        <div className="mb-3">
          <p className="text-sm font-semibold text-slate-900">Lowers — lumpsum per piece</p>
          <p className="text-xs text-slate-600">
            Casement frame + lowers blade + lowers glass. Customer rate per pc (not sq.ft).
          </p>
          <p className="mt-1 text-[11px] text-amber-900/80">
            Materials: {LOWERS_MATERIALS.join(" · ")}
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-600">
              Below {LOWERS_MIN_WIDTH_FT}×{LOWERS_MIN_HEIGHT_FT} ft (₹/pc)
            </Label>
            <Input
              inputMode="decimal"
              className="h-10 bg-white"
              value={String(rateSettings.lowersRateBelowMinimum)}
              onChange={(event) => updateRateNumber("lowersRateBelowMinimum", event.target.value)}
            />
            <p className="text-[11px] text-slate-500">
              When width &lt; 2 ft or height &lt; 2.5 ft (e.g. ₹3,000/pc).
            </p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-600">
              At/above {LOWERS_MIN_WIDTH_FT}×{LOWERS_MIN_HEIGHT_FT} ft (₹/pc)
            </Label>
            <Input
              inputMode="decimal"
              className="h-10 bg-white"
              value={String(rateSettings.lowersRateAboveMinimum)}
              onChange={(event) => updateRateNumber("lowersRateAboveMinimum", event.target.value)}
            />
            <p className="text-[11px] text-slate-500">
              For at/above minimum size — enter your rate per pc.
            </p>
          </div>
        </div>
      </section>

      <div className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0">
        <div className="hidden min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm lg:block">
        <table className="w-full min-w-[1200px] table-fixed text-sm">
          <colgroup>
            <col className="w-10" />
            <col style={{ width: "210px" }} />
            <col style={{ width: "210px" }} />
            <col className="w-[220px]" />
            <col className="w-[80px]" />
            <col className="w-[88px]" />
            {showWorkshopCost ? (
              <>
                <col className="w-[108px]" />
                <col className="w-[96px]" />
              </>
            ) : null}
            <col className="w-[96px]" />
            <col className="w-[108px]" />
            {showWorkshopCost ? <col className="w-[100px]" /> : null}
            <col className="w-12" />
          </colgroup>
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-3">#</th>
              <th className="whitespace-nowrap px-3 py-3">
                {unitMode === "mm" ? "Width (mm)" : "Width"}
              </th>
              <th className="whitespace-nowrap px-3 py-3">
                {unitMode === "mm" ? "Height (mm)" : "Height"}
              </th>
              <th className="px-3 py-3">Type</th>
              <th className="px-3 py-3">Qty</th>
              <th className="px-3 py-3">Sq.ft</th>
              {showWorkshopCost ? (
                <>
                  <th className="px-3 py-3">Workshop</th>
                  <th className="px-3 py-3">W/S Rate</th>
                </>
              ) : null}
              <th className="px-3 py-3">Cust Rate</th>
              <th className="px-3 py-3">Customer</th>
              {showWorkshopCost ? <th className="px-3 py-3">Profit</th> : null}
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <QuoteRowDesktop
                key={row.id}
                index={index}
                row={row}
                unitMode={unitMode}
                groupedOptions={groupedOptions}
                result={resultForRow(totals, row.id)}
                showWorkshopCost={showWorkshopCost}
                onUpdate={updateRow}
                onUpdateFeetInches={updateRowFeetInches}
                onUpdateMm={updateRowMm}
                onRemove={() => removeRow(row.id)}
                canRemove={rows.length > 1}
              />
            ))}
          </tbody>
          {totals && totals.validRowCount > 0 ? (
            <tfoot className="border-t-2 border-slate-200 bg-slate-50 text-sm font-semibold">
              <tr>
                <td className="px-3 py-3" colSpan={5}>
                  Total
                </td>
                <td className="px-3 py-3">{totals.totalAreaSqft.toFixed(2)}</td>
                {showWorkshopCost ? (
                  <>
                    <td className="px-3 py-3">{formatCurrency(totals.totalWorkshopCost)}</td>
                    <td className="px-3 py-3">
                      {formatCurrency(totals.averageWorkshopRatePerSqFt)}
                    </td>
                  </>
                ) : null}
                <td className="px-3 py-3">
                  {formatCurrency(totals.averageCustomerRatePerSqFt)}
                </td>
                <td className="px-3 py-3">{formatCurrency(totals.totalCustomerAmount)}</td>
                {showWorkshopCost ? (
                  <td className="px-3 py-3 text-emerald-700">
                    {formatCurrency(totals.totalProfitAmount)}
                  </td>
                ) : null}
                <td className="px-3 py-3" />
              </tr>
            </tfoot>
          ) : null}
        </table>
        </div>
      </div>

      <div className="space-y-3 lg:hidden">
        {rows.map((row, index) => (
          <QuoteRowMobile
            key={row.id}
            index={index}
            row={row}
            unitMode={unitMode}
            groupedOptions={groupedOptions}
            result={resultForRow(totals, row.id)}
            showWorkshopCost={showWorkshopCost}
            onUpdate={updateRow}
            onUpdateFeetInches={updateRowFeetInches}
            onUpdateMm={updateRowMm}
            onRemove={() => removeRow(row.id)}
            canRemove={rows.length > 1}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={addRow}>
          <Plus className="size-4" />
          Add Row
        </Button>
        <Button type="button" onClick={() => handleCalculateAll()} disabled={isCalculating}>
          <Calculator className="size-4" />
          {isCalculating ? "Calculating…" : "Calculate All"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => void handlePreviewPdf()}
          disabled={isPdfBusy}
        >
          <Eye className="size-4" />
          Preview PDF
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => void handleExportPdf()}
          disabled={isPdfBusy || isSpecPdfBusy}
        >
          <Printer className="size-4" />
          Export PDF
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => void handlePreviewSpecSheetPdf()}
          disabled={isPdfBusy || isSpecPdfBusy}
        >
          <FileImage className="size-4" />
          Spec Sheet
        </Button>
      </div>

      {pdfPreviewUrl || isPdfBusy || isSpecPdfBusy ? (
        <PdfFeedback
          message={null}
          isBusy={isPdfBusy || isSpecPdfBusy}
          busyLabel={isSpecPdfBusy ? "Preparing specification sheet…" : "Preparing Quick Quote PDF…"}
        />
      ) : null}

      <PdfPreviewModal
        open={pdfPreviewUrl != null}
        title="PDF Preview"
        blobUrl={pdfPreviewUrl}
        onClose={() => {
          revokePdfBlobUrl(pdfPreviewUrl);
          setPdfPreviewUrl(null);
        }}
        onExport={() => void handleExportPdf()}
        isExporting={isPdfBusy}
        exportLabel="Export PDF"
      />

      <section className="rounded-xl border border-violet-200 bg-violet-50/60 px-4 py-4 shadow-sm">
        <div className="mb-3">
          <p className="text-sm font-semibold text-slate-900">Customer details for quotation</p>
          <p className="text-xs text-slate-600">
            Name and address appear on the quotation PDF — fill before Generate Quotation.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-600">Customer name</Label>
            <Input
              className="h-10 bg-white"
              value={quotationForm.customerName}
              placeholder={job.customerName || "Customer name"}
              onChange={(event) => updateQuotationField("customerName", event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-600">Phone</Label>
            <Input
              inputMode="tel"
              className="h-10 bg-white"
              value={quotationForm.customerPhone ?? ""}
              placeholder={job.customerPhone || "Mobile number"}
              onChange={(event) => updateQuotationField("customerPhone", event.target.value)}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs text-slate-600">Address / site location</Label>
            <Input
              className="h-10 bg-white"
              value={quotationForm.customerAddress}
              placeholder={job.billingAddress || "Site address or location"}
              onChange={(event) => updateQuotationField("customerAddress", event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-600">Quotation date</Label>
            <Input
              type="date"
              className="h-10 bg-white"
              value={quotationForm.quotationDate}
              onChange={(event) => updateQuotationField("quotationDate", event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-600">Subject</Label>
            <Input
              className="h-10 bg-white"
              value={quotationForm.subject}
              placeholder="Quotation subject"
              onChange={(event) => updateQuotationField("subject", event.target.value)}
            />
          </div>
        </div>

        {totals && totals.validRowCount > 0 ? (
          <div className="mt-4 space-y-3 border-t border-violet-200 pt-4">
            <div>
              <p className="text-sm font-semibold text-slate-900">Rate for customer quotation</p>
              <p className="text-xs text-slate-600">
                Enter the rate you want on the quotation PDF sent to the customer.
              </p>
            </div>

            <label className="flex cursor-pointer items-start gap-2 text-sm text-slate-800">
              <Checkbox
                checked={customerQuotationRates.useCalculatedRates}
                onCheckedChange={(checked) => {
                  const useCalculated = checked === true;
                  if (useCalculated) {
                    updateCustomerQuotationRates({
                      useCalculatedRates: true,
                      usePerRowRates: false,
                    });
                    return;
                  }
                  updateCustomerQuotationRates({
                    useCalculatedRates: false,
                    manualRatePerSqFt:
                      customerQuotationRates.manualRatePerSqFt ??
                      totals.averageCustomerRatePerSqFt,
                  });
                }}
              />
              <span>
                Use calculated rate (+{rateSettings.profitMarginPercent}% margin) —{" "}
                {formatCurrency(totals.averageCustomerRatePerSqFt)}/sq.ft
              </span>
            </label>

            {!customerQuotationRates.useCalculatedRates ? (
              <div className="space-y-3 rounded-lg border border-violet-200 bg-white p-3">
                <label className="flex cursor-pointer items-start gap-2 text-sm text-slate-800">
                  <Checkbox
                    checked={customerQuotationRates.usePerRowRates}
                    onCheckedChange={(checked) => {
                      const usePerRow = checked === true;
                      if (usePerRow) {
                        updateCustomerQuotationRates({
                          usePerRowRates: true,
                          perRowOverrides: buildPerRowOverridesFromTotals(totals),
                        });
                        return;
                      }
                      updateCustomerQuotationRates({ usePerRowRates: false });
                    }}
                  />
                  <span>Set a different rate for each line</span>
                </label>

                {customerQuotationRates.usePerRowRates ? (
                  <ul className="space-y-2">
                    {totals.rows
                      .filter((row) => row.isValid)
                      .map((row, index) => (
                        <li
                          key={row.rowId}
                          className="grid gap-2 rounded-md border border-slate-200 bg-slate-50 p-2 sm:grid-cols-[1fr_auto]"
                        >
                          <div className="text-xs text-slate-700">
                            <span className="font-semibold">Line {index + 1}</span> · {row.label} ·{" "}
                            {row.areaSqft.toFixed(2)} sq.ft
                          </div>
                          <div className="flex items-center gap-2">
                            <Label className="shrink-0 text-xs text-slate-600">
                              {row.pricingMode === "lumpsum" ? "Rate/pc (₹)" : "Rate/sq.ft (₹)"}
                            </Label>
                            <Input
                              type="number"
                              min={0}
                              step="any"
                              className="h-9 w-28 bg-white"
                              value={
                                row.pricingMode === "lumpsum"
                                  ? (customerQuotationRates.perRowOverrides[row.rowId]?.ratePerPiece ??
                                    row.customerRatePerPiece ??
                                    "")
                                  : (customerQuotationRates.perRowOverrides[row.rowId]?.ratePerSqFt ??
                                    row.customerRatePerSqFt ??
                                    "")
                              }
                              onChange={(event) => {
                                const value = parseNumber(event.target.value, 0);
                                const existing =
                                  customerQuotationRates.perRowOverrides[row.rowId] ?? {};
                                updateCustomerQuotationRates({
                                  perRowOverrides: {
                                    ...customerQuotationRates.perRowOverrides,
                                    [row.rowId]:
                                      row.pricingMode === "lumpsum"
                                        ? { ...existing, ratePerPiece: value }
                                        : { ...existing, ratePerSqFt: value },
                                  },
                                });
                              }}
                            />
                          </div>
                        </li>
                      ))}
                  </ul>
                ) : (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-600">
                      Customer rate (₹/sq.ft) — applied to all window lines
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      className="h-10 bg-white"
                      placeholder={String(totals.averageCustomerRatePerSqFt)}
                      value={customerQuotationRates.manualRatePerSqFt ?? ""}
                      onChange={(event) =>
                        updateCustomerQuotationRates({
                          manualRatePerSqFt: parseNumber(event.target.value, 0) || null,
                        })
                      }
                    />
                    <p className="text-xs text-slate-500">
                      Calculated reference: {formatCurrency(totals.averageCustomerRatePerSqFt)}/sq.ft
                    </p>
                  </div>
                )}

                {quotationTotals ? (
                  <p className="text-sm font-semibold text-violet-950">
                    Quotation total: {formatCurrency(quotationTotals.totalCustomerAmount)}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      {totals && totals.validRowCount > 0 ? (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
          <h3 className="text-sm font-bold text-emerald-900">Project Totals</h3>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-emerald-700">Total area</dt>
              <dd className="font-semibold text-emerald-950">{totals.totalAreaSqft.toFixed(2)} sq.ft</dd>
            </div>
            {showWorkshopCost ? (
              <>
                <div>
                  <dt className="text-emerald-700">Workshop cost</dt>
                  <dd className="font-semibold text-emerald-950">
                    {formatCurrency(totals.totalWorkshopCost)}
                  </dd>
                </div>
                <div>
                  <dt className="text-emerald-700">Workshop rate</dt>
                  <dd className="font-semibold text-emerald-950">
                    {formatCurrency(totals.averageWorkshopRatePerSqFt)}/sq.ft
                  </dd>
                </div>
              </>
            ) : null}
            <div>
              <dt className="text-emerald-700">
                {customerQuotationRates.useCalculatedRates
                  ? `Customer rate (+${rateSettings.profitMarginPercent}%)`
                  : "Quotation rate (your rate)"}
              </dt>
              <dd className="font-semibold text-emerald-950">
                {formatCurrency(
                  (quotationTotals ?? totals).averageCustomerRatePerSqFt,
                )}
                /sq.ft
              </dd>
            </div>
            <div>
              <dt className="text-emerald-700">
                {customerQuotationRates.useCalculatedRates
                  ? `Customer total (+${rateSettings.profitMarginPercent}%)`
                  : "Quotation total"}
              </dt>
              <dd className="text-lg font-bold text-emerald-950">
                {formatCurrency((quotationTotals ?? totals).totalCustomerAmount)}
              </dd>
            </div>
            {showWorkshopCost ? (
              <div className="col-span-2">
                <dt className="text-emerald-700">Total profit</dt>
                <dd className="text-lg font-bold text-emerald-700">
                  {formatCurrency((quotationTotals ?? totals).totalProfitAmount)}
                </dd>
              </div>
            ) : null}
          </dl>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {showWorkshopCost && onOpenMaterialDetails ? (
              <Button type="button" variant="outline" onClick={onOpenMaterialDetails}>
                <ListTree className="size-4" />
                Material Details
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              onClick={() => void handlePreviewPdf()}
              disabled={isPdfBusy}
              className={showWorkshopCost && onOpenMaterialDetails ? "" : "sm:col-span-2"}
            >
              <Eye className="size-4" />
              Preview PDF
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleExportPdf()}
              disabled={isPdfBusy || isSpecPdfBusy}
            >
              <Printer className="size-4" />
              Export PDF
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleExportSpecSheetPdf()}
              disabled={isPdfBusy || isSpecPdfBusy}
            >
              <FileImage className="size-4" />
              {isSpecPdfBusy ? "Spec Sheet…" : "Spec Sheet PDF"}
            </Button>
            <Button
              type="button"
              className={showWorkshopCost && onOpenMaterialDetails ? "sm:col-span-2" : ""}
              onClick={handleGenerateQuotation}
              disabled={isGenerating}
            >
              <FileText className="size-4" />
              {isGenerating ? "Generating…" : "Generate Quotation"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleExportQuotationPdf()}
              disabled={isQuotationPdfBusy || isGenerating}
              className={showWorkshopCost && onOpenMaterialDetails ? "sm:col-span-2" : ""}
            >
              <FileText className="size-4" />
              {isQuotationPdfBusy ? "Quotation PDF…" : "Export Quotation PDF"}
            </Button>
          </div>
          {generatedQuotation && generatedQuotation.windows.length > 0 ? (
            <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-950">
              <p className="font-semibold">
                Quotation saved — {generatedQuotation.windows.length} line(s)
              </p>
              <ul className="mt-2 space-y-1 text-xs text-blue-900">
                {generatedQuotation.windows.map((line) => (
                  <li key={line.id}>
                    {line.length} × {line.height} mm · qty {line.quantity} ·{" "}
                    {formatCurrency(line.ratePerSqFt)}/sq.ft
                  </li>
                ))}
              </ul>
              {isNativeApp() ? (
                <p className="mt-2 text-xs text-blue-800">
                  Customer details above are included in Export Quotation PDF. Edit GST or extra
                  charges on the web quotation tab if needed.
                </p>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

type RowEditorProps = {
  index: number;
  row: SimpleQuoteRow;
  unitMode: PartnerUnitMode;
  groupedOptions: Map<string, typeof SIMPLE_QUOTE_PRODUCT_OPTIONS>;
  result: SimpleQuoteRowResult | null;
  showWorkshopCost: boolean;
  onUpdate: (rowId: string, patch: Partial<SimpleQuoteRow>) => void;
  onUpdateFeetInches: (
    rowId: string,
    patch: Partial<Pick<SimpleQuoteRow, "widthFeet" | "widthInches" | "heightFeet" | "heightInches">>,
  ) => void;
  onUpdateMm: (rowId: string, axis: "width" | "height", raw: string) => void;
  onRemove: () => void;
  canRemove: boolean;
};

function GroupedTypeSelect({
  value,
  groupedOptions,
  placeholder = "Select type…",
  onValueChange,
  className,
}: {
  value?: SimpleQuoteRow["productType"];
  groupedOptions: Map<string, typeof SIMPLE_QUOTE_PRODUCT_OPTIONS>;
  placeholder?: string;
  onValueChange: (value: SimpleQuoteRow["productType"]) => void;
  className?: string;
}) {
  return (
    <Select
      value={value}
      onValueChange={(next) => onValueChange(next as SimpleQuoteRow["productType"])}
    >
      <SelectTrigger className={cn("h-10 w-full", className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {[...groupedOptions.entries()].map(([group, options]) => (
          <SelectGroup key={group}>
            <SelectLabel>{group}</SelectLabel>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}

function TypeSelect({
  row,
  groupedOptions,
  onUpdate,
}: Pick<RowEditorProps, "row" | "groupedOptions" | "onUpdate">) {
  return (
    <GroupedTypeSelect
      value={row.productType}
      groupedOptions={groupedOptions}
      onValueChange={(productType) => onUpdate(row.id, { productType })}
    />
  );
}

function WidthInput({
  row,
  unitMode,
  onUpdateFeetInches,
  onUpdateMm,
}: Pick<RowEditorProps, "row" | "unitMode" | "onUpdateFeetInches" | "onUpdateMm">) {
  if (unitMode === "mm") {
    return (
      <Input
        type="text"
        inputMode="decimal"
        className={DIMENSION_INPUT_CLASS}
        value={displayRowMm(row, "width")}
        onChange={(event) => onUpdateMm(row.id, "width", event.target.value)}
        placeholder="e.g. 1717.7"
      />
    );
  }

  return (
    <div className="flex min-w-[9.5rem] gap-2">
      <Input
        type="number"
        className={cn(DIMENSION_INPUT_CLASS, "min-w-[4rem] flex-1")}
        value={row.widthFeet === 0 ? "" : row.widthFeet}
        onChange={(event) =>
          onUpdateFeetInches(row.id, {
            widthFeet: parseNumber(event.target.value, 0),
          })
        }
        placeholder="ft"
      />
      <Input
        type="number"
        className={cn(DIMENSION_INPUT_CLASS, "min-w-[4rem] flex-1")}
        value={row.widthInches === 0 ? "" : row.widthInches}
        onChange={(event) =>
          onUpdateFeetInches(row.id, {
            widthInches: parseNumber(event.target.value, 0),
          })
        }
        placeholder="in"
      />
    </div>
  );
}

function HeightInput({
  row,
  unitMode,
  onUpdateFeetInches,
  onUpdateMm,
}: Pick<RowEditorProps, "row" | "unitMode" | "onUpdateFeetInches" | "onUpdateMm">) {
  if (unitMode === "mm") {
    return (
      <Input
        type="text"
        inputMode="decimal"
        className={DIMENSION_INPUT_CLASS}
        value={displayRowMm(row, "height")}
        onChange={(event) => onUpdateMm(row.id, "height", event.target.value)}
        placeholder="e.g. 1387.5"
      />
    );
  }

  return (
    <div className="flex min-w-[9.5rem] gap-2">
      <Input
        type="number"
        className={cn(DIMENSION_INPUT_CLASS, "min-w-[4rem] flex-1")}
        value={row.heightFeet === 0 ? "" : row.heightFeet}
        onChange={(event) =>
          onUpdateFeetInches(row.id, {
            heightFeet: parseNumber(event.target.value, 0),
          })
        }
        placeholder="ft"
      />
      <Input
        type="number"
        className={cn(DIMENSION_INPUT_CLASS, "min-w-[4rem] flex-1")}
        value={row.heightInches === 0 ? "" : row.heightInches}
        onChange={(event) =>
          onUpdateFeetInches(row.id, {
            heightInches: parseNumber(event.target.value, 0),
          })
        }
        placeholder="in"
      />
    </div>
  );
}

function ResultCells({
  result,
  showWorkshopCost,
}: Pick<RowEditorProps, "result" | "showWorkshopCost">) {
  if (!result) {
    return (
      <>
        {showWorkshopCost ? (
          <>
            <td className="px-3 py-2 text-slate-400">—</td>
            <td className="px-3 py-2 text-slate-400">—</td>
          </>
        ) : null}
        <td className="px-3 py-2 text-slate-400">—</td>
        <td className="px-3 py-2 text-slate-400">—</td>
        {showWorkshopCost ? <td className="px-3 py-2 text-slate-400">—</td> : null}
      </>
    );
  }

  if (!result.isValid) {
    const span = showWorkshopCost ? 5 : 2;
    return (
      <td colSpan={span} className="px-3 py-2 text-xs text-red-600">
        {result.error}
      </td>
    );
  }

  return (
    <>
      {showWorkshopCost ? (
        <>
          <td className="px-3 py-2 font-medium">
            {result.pricingMode === "lumpsum" ? (
              <span className="text-slate-500">Lumpsum</span>
            ) : (
              formatCurrency(result.workshopTotal)
            )}
          </td>
          <td className="px-3 py-2">
            {result.pricingMode === "lumpsum" ? "—" : formatCurrency(result.workshopRatePerSqFt)}
          </td>
        </>
      ) : null}
      <td className="px-3 py-2">
        {result.pricingMode === "lumpsum" && result.customerRatePerPiece != null
          ? `${formatCurrency(result.customerRatePerPiece)}/pc`
          : formatCurrency(result.customerRatePerSqFt)}
      </td>
      <td className="px-3 py-2 font-semibold">{formatCurrency(result.customerTotal)}</td>
      {showWorkshopCost ? (
        <td className="px-3 py-2 font-semibold text-emerald-700">
          {result.pricingMode === "lumpsum" ? "—" : formatCurrency(result.profitAmount)}
        </td>
      ) : null}
    </>
  );
}

function SqFtCell({ result }: { result: SimpleQuoteRowResult | null }) {
  return (
    <td className="px-3 py-2 text-slate-700">
      {result?.isValid ? result.areaSqft.toFixed(2) : "—"}
    </td>
  );
}

function QuoteRowDesktop(props: RowEditorProps) {
  const { index, row, result, onUpdate, onRemove, canRemove } = props;

  return (
    <tr className="border-b border-slate-100 align-top">
      <td className="px-3 py-2 text-slate-500">{index + 1}</td>
      <td className="min-w-[10.5rem] px-2 py-2 align-middle">
        <WidthInput {...props} />
      </td>
      <td className="min-w-[10.5rem] px-2 py-2 align-middle">
        <HeightInput {...props} />
      </td>
      <td className="px-3 py-2 align-middle">
        <TypeSelect {...props} />
      </td>
      <td className="px-3 py-2 align-middle">
        <Input
          type="number"
          min={1}
          className={QTY_INPUT_CLASS}
          value={row.quantity}
          onChange={(event) =>
            onUpdate(row.id, { quantity: Math.max(1, parseNumber(event.target.value, 1)) })
          }
        />
      </td>
      <SqFtCell result={result} />
      <ResultCells {...props} />
      <td className="px-3 py-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={!canRemove}
          onClick={onRemove}
          aria-label="Remove row"
        >
          <Trash2 className="size-4 text-slate-500" />
        </Button>
      </td>
    </tr>
  );
}

function QuoteRowMobile(props: RowEditorProps) {
  const { index, row, unitMode, result, showWorkshopCost, onUpdate, onRemove, canRemove } = props;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900">Row {index + 1}</h3>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={!canRemove}
          onClick={onRemove}
          aria-label="Remove row"
        >
          <Trash2 className="size-4 text-slate-500" />
        </Button>
      </div>

      <div className="space-y-3">
        <TypeSelect {...props} />

        <div className="space-y-3">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
              {unitMode === "mm" ? "Width (mm)" : "Width"}
            </label>
            <WidthInput {...props} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
              {unitMode === "mm" ? "Height (mm)" : "Height"}
            </label>
            <HeightInput {...props} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Quantity</label>
            <Input
              type="number"
              min={1}
              className={QTY_INPUT_CLASS}
              value={row.quantity}
              onChange={(event) =>
                onUpdate(row.id, { quantity: Math.max(1, parseNumber(event.target.value, 1)) })
              }
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Total sq.ft</label>
            <div className="flex h-11 items-center rounded-md border-2 border-slate-300 bg-slate-50 px-3 text-base font-semibold tabular-nums text-slate-800">
              {result?.isValid ? result.areaSqft.toFixed(2) : "—"}
            </div>
          </div>
        </div>

        {result ? (
          result.isValid ? (
            <div className="rounded-xl bg-slate-50 p-3 text-sm">
              {result.pricingMode === "lumpsum" ? (
                <>
                  <p>
                    <span className="text-slate-600">Rate: </span>
                    <span className="font-semibold">
                      {formatCurrency(result.customerRatePerPiece ?? 0)}/pc
                    </span>
                  </p>
                  {result.pricingNote ? (
                    <p className="mt-1 text-xs text-slate-500">{result.pricingNote}</p>
                  ) : null}
                </>
              ) : showWorkshopCost ? (
                <>
                  <p>
                    <span className="text-slate-600">Workshop: </span>
                    <span className="font-semibold">{formatCurrency(result.workshopTotal)}</span>
                    <span className="text-slate-500">
                      {" "}
                      ({formatCurrency(result.workshopRatePerSqFt)}/sq.ft)
                    </span>
                  </p>
                </>
              ) : null}
              {result.pricingMode !== "lumpsum" ? (
                <p>
                  <span className="text-slate-600">Customer rate: </span>
                  <span>{formatCurrency(result.customerRatePerSqFt)}/sq.ft</span>
                </p>
              ) : null}
              <p className="mt-1 text-base font-bold text-slate-900">
                Customer: {formatCurrency(result.customerTotal)}
              </p>
              {showWorkshopCost && result.pricingMode !== "lumpsum" ? (
                <p className="mt-1 font-semibold text-emerald-700">
                  Profit: {formatCurrency(result.profitAmount)}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="text-xs text-red-600">{result.error}</p>
          )
        ) : null}
      </div>
    </section>
  );
}
