"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { Calculator, Pencil, Plus, RefreshCw } from "lucide-react";

import { AssistantSheet } from "@/components/assistant/assistant-sheet";
import { FloatingAssistantButton } from "@/components/assistant/floating-assistant-button";

import { CalculationValidationBanner } from "@/components/calculations/calculation-validation-banner";
import { PdfFeedback } from "@/components/pdf/pdf-feedback";
import { PdfPreviewModal } from "@/components/pdf/pdf-preview-modal";
import { buildPreviewDataFromEstimation } from "@/components/product-preview";
import { Button } from "@/components/ui/button";
import { MessageBanner } from "@/components/workshop/workshop-ui";
import { addCurrentProductToQuotation } from "@/lib/calculations/bridge/quotation-from-job";
import {
  calculateProduct,
  canExportPdf,
  getProductProfileCode,
} from "@/lib/calculations";
import { applyDoorConfigurationDefaults, createDefaultDoorCuttingOptions } from "@/lib/cutting/door";
import { createDefaultFixedFrameSettings } from "@/lib/cutting/fixed-frame";
import { syncCuttingOptionsForTrack } from "@/lib/cutting";
import type { CuttingOptions } from "@/lib/cutting/types";
import type { DoorCuttingOptions } from "@/lib/cutting/door";
import type { EstimationInputs } from "@/lib/estimation";
import {
  addProductToJob,
  applyActiveProductToState,
  getCurrentUserName,
  type JobProductKind,
  type WorkshopJob,
} from "@/lib/jobs";
import type { ProfileRateSettings } from "@/lib/profiles";
import type { DoorHardwareMasterSettings } from "@/lib/door-hardware";
import { canApplyDoorHardwareJobOverride } from "@/lib/door-hardware";
import type { QuotationForm } from "@/lib/quotation";
import {
  applyPartnerProductType,
  clearPartnerDraft,
  createCalculationSnapshot,
  loadPartnerProductType,
  loadPartnerUnitMode,
  partnerProductTypeFromInputs,
  savePartnerDraft,
  savePartnerProductToJob,
  savePartnerProductType,
  savePartnerUnitMode,
  snapshotsMatch,
  type PartnerCalculationSnapshot,
  type PartnerProductType,
  type PartnerUnitMode,
} from "@/lib/partner-workspace";
import {
  buildSummaryForProduct,
  buildSummaryLabourPdfAsync,
  exportSummaryLabourPdf,
  type CuttingJobMeta,
} from "@/lib/summary";
import { pdfToBlobUrl, revokePdfBlobUrl } from "@/lib/pdf/preview";
import { useOnlineStatus } from "@/components/dashboard/dashboard-utils";
import type { AssistantExecutionCallbacks } from "@/lib/assistant";

import { DoorOptions } from "./door-options";
import { FixedFrameOptions } from "./fixed-frame-options";
import { FixedFrameResults } from "./fixed-frame-results";
import { MeasurementEntryCard } from "./measurement-entry-card";
import { PartnerActiveJobStrip } from "./partner-active-job-strip";
import { PartnerCalculationStatus } from "./partner-calculation-status";
import { PartnerCuttingSummary } from "./partner-cutting-summary";
import { PartnerDoorHardwareCost } from "./partner-door-hardware-cost";
import { PartnerProductPreview } from "./partner-product-preview";
import { PartnerProfileCost } from "./partner-profile-cost";
import { PartnerQuickActions } from "./partner-quick-actions";
import { PartnerWorkshopCost } from "./partner-workshop-cost";
import { PartnerWorkspaceHeader } from "./partner-workspace-header";
import { ProductTypeSelector } from "./product-type-selector";
import { WindowOptions } from "./window-options";

type PartnerWorkspaceScreenProps = {
  job: WorkshopJob;
  estimationInputs: EstimationInputs;
  cuttingOptions: CuttingOptions;
  cuttingJobMeta: CuttingJobMeta;
  profileRates: ProfileRateSettings;
  doorHardwareMaster: DoorHardwareMasterSettings;
  quotationForm: QuotationForm;
  onEstimationChange: (inputs: EstimationInputs) => void;
  onCuttingOptionsChange: Dispatch<SetStateAction<CuttingOptions>>;
  onCuttingJobMetaChange: Dispatch<SetStateAction<CuttingJobMeta>>;
  onJobChange: (job: WorkshopJob) => void;
  onQuotationChange: (form: QuotationForm) => void;
  onBack?: () => void;
  backLabel?: string;
  onOpenJob: () => void;
  onOpenDocuments: () => void;
  onOpenHardwareRates?: () => void;
  onNavigate?: (module: string) => void;
  initialAssistantOpen?: boolean;
  onAssistantOpenChange?: (open: boolean) => void;
};

export function PartnerWorkspaceScreen({
  job,
  estimationInputs,
  cuttingOptions,
  cuttingJobMeta,
  profileRates,
  doorHardwareMaster,
  quotationForm,
  onEstimationChange,
  onCuttingOptionsChange,
  onCuttingJobMetaChange,
  onJobChange,
  onQuotationChange,
  onBack,
  backLabel = "Back",
  onOpenJob,
  onOpenDocuments,
  onOpenHardwareRates,
  onNavigate,
  initialAssistantOpen = false,
  onAssistantOpenChange,
}: PartnerWorkspaceScreenProps) {
  const isOnline = useOnlineStatus();
  const [assistantOpen, setAssistantOpen] = useState(initialAssistantOpen);

  useEffect(() => {
    if (initialAssistantOpen) {
      setAssistantOpen(true);
      onAssistantOpenChange?.(false);
    }
  }, [initialAssistantOpen, onAssistantOpenChange]);
  const [productType, setProductType] = useState<PartnerProductType>(() =>
    loadPartnerProductType(),
  );
  const [unitMode, setUnitMode] = useState<PartnerUnitMode>(() => loadPartnerUnitMode());
  const [calculatedSnapshot, setCalculatedSnapshot] =
    useState<PartnerCalculationSnapshot | null>(null);
  const [lastCalculatedAt, setLastCalculatedAt] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPdfBusy, setIsPdfBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [pendingSync, setPendingSync] = useState(false);
  const [unsavedDialog, setUnsavedDialog] = useState(false);
  const [hasSavedSinceEdit, setHasSavedSinceEdit] = useState(true);
  const autoCalcTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const formSectionRef = useRef<HTMLDivElement>(null);

  const doorOptions =
    estimationInputs.doorSettings ?? createDefaultDoorCuttingOptions("single");

  const currentSnapshot = useMemo(
    () =>
      createCalculationSnapshot(
        estimationInputs,
        cuttingOptions,
        cuttingJobMeta,
        productType,
      ),
    [estimationInputs, cuttingOptions, cuttingJobMeta, productType],
  );

  const isStale =
    calculatedSnapshot != null && !snapshotsMatch(calculatedSnapshot, currentSnapshot);

  const calcInput = useMemo(
    () => ({
      estimationInputs,
      cuttingOptions,
      profileRates,
      cuttingJobMeta,
      doorHardwareMaster,
    }),
    [estimationInputs, cuttingOptions, profileRates, cuttingJobMeta, doorHardwareMaster],
  );

  const product = useMemo(
    () => (calculatedSnapshot ? calculateProduct(calcInput) : null),
    [calcInput, calculatedSnapshot],
  );

  const summary = useMemo(
    () => (calculatedSnapshot ? buildSummaryForProduct(calcInput) : null),
    [calcInput, calculatedSnapshot],
  );

  const previewData = useMemo(() => {
    if (!product?.validation.isValid) return null;
    return buildPreviewDataFromEstimation(
      estimationInputs,
      cuttingOptions,
      getProductProfileCode(product),
    );
  }, [product, estimationInputs, cuttingOptions]);

  const primaryWindow = summary?.windows[0];
  const primaryDoor = summary?.doors?.[0];
  const primaryFixedFrame = summary?.fixedFrames?.[0];
  const components =
    primaryWindow?.components ??
    primaryDoor?.components ??
    primaryFixedFrame?.components ??
    product?.fixedFrame?.components ??
    [];
  const details =
    primaryWindow?.details ??
    primaryDoor?.details ??
    primaryFixedFrame?.details ??
    product?.fixedFrame?.details ??
    [];
  const qty = Math.max(1, estimationInputs.numberOfWindows || 1);
  const estimation = product?.estimation;
  const displayWorkshopTotal =
    qty > 1 && estimation
      ? estimation.orderWorkshopTotal
      : (summary?.totalWorkshopCost ?? estimation?.workshopTotal ?? 0);
  const displayMarginAmount =
    qty > 1 && estimation
      ? estimation.orderCustomerBaseMarginAmount
      : (estimation?.customerBaseMarginAmount ?? 0);
  const displaySuggestedBasePrice =
    qty > 1 && estimation
      ? estimation.orderSuggestedCustomerBasePrice
      : (estimation?.suggestedCustomerBasePrice ?? 0);
  const displaySuggestedRate =
    estimation?.suggestedCustomerRatePerSqFt ?? 0;
  const hasValidResults =
    calculatedSnapshot != null && product?.validation.isValid === true;
  const showFormCalculate = !hasValidResults;

  function syncProductEditorFromJob(nextJob: WorkshopJob) {
    const state = applyActiveProductToState(nextJob);
    const pt = partnerProductTypeFromInputs(state.estimationInputs);
    setProductType(pt);
    onEstimationChange({
      ...state.estimationInputs,
      profileRatePerKg: profileRates.marketRatePerKg,
    });
    onCuttingOptionsChange(state.cuttingOptions);
    onCuttingJobMetaChange(state.cuttingJobMeta);

    const probe = calculateProduct({
      estimationInputs: state.estimationInputs,
      cuttingOptions: state.cuttingOptions,
      profileRates,
      cuttingJobMeta: state.cuttingJobMeta,
      doorHardwareMaster,
    });

    if (probe.validation.isValid) {
      setCalculatedSnapshot(
        createCalculationSnapshot(
          state.estimationInputs,
          state.cuttingOptions,
          state.cuttingJobMeta,
          pt,
        ),
      );
      setLastCalculatedAt(new Date().toISOString());
      setHasSavedSinceEdit(true);
    } else {
      setCalculatedSnapshot(null);
      setLastCalculatedAt(null);
      setHasSavedSinceEdit(false);
    }
  }

  function handleAddProduct(kind: JobProductKind) {
    const nextJob = addProductToJob(job, kind, getCurrentUserName());
    onJobChange(nextJob);
    syncProductEditorFromJob(nextJob);
    clearPartnerDraft();
    setMessage(
      `New ${kind === "door" ? "door" : kind === "fixed-frame" ? "fixed frame" : "window"} ready — enter measurements below.`,
    );
  }

  function scrollToForm() {
    formSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const runCalculate = useCallback(() => {
    setIsCalculating(true);
    setMessage(null);
    const result = calculateProduct(calcInput);
    if (!result.validation.isValid) {
      setMessage(
        result.validation.blockingMessage ?? "Fix the highlighted fields and try again.",
      );
      setIsCalculating(false);
      return;
    }
    setCalculatedSnapshot(currentSnapshot);
    setLastCalculatedAt(new Date().toISOString());
    setHasSavedSinceEdit(false);
    setIsCalculating(false);
  }, [calcInput, currentSnapshot]);

  useEffect(() => {
    if (autoCalcTimer.current) clearTimeout(autoCalcTimer.current);
    autoCalcTimer.current = setTimeout(() => {
      const probe = calculateProduct(calcInput);
      if (probe.validation.isValid) {
        setCalculatedSnapshot(currentSnapshot);
        setLastCalculatedAt(new Date().toISOString());
        setHasSavedSinceEdit(false);
      }
    }, 800);
    return () => {
      if (autoCalcTimer.current) clearTimeout(autoCalcTimer.current);
    };
  }, [calcInput, currentSnapshot]);

  useEffect(() => {
    savePartnerUnitMode(unitMode);
  }, [unitMode]);

  useEffect(() => {
    savePartnerProductType(productType);
  }, [productType]);

  function handleProductTypeChange(next: PartnerProductType) {
    setProductType(next);
    let nextInputs = applyPartnerProductType(next, estimationInputs);
    onEstimationChange(nextInputs);
    if (next === "window") {
      onCuttingOptionsChange(syncCuttingOptionsForTrack(cuttingOptions, nextInputs.trackSystemId));
    } else if (next === "fixed-frame") {
      nextInputs = {
        ...nextInputs,
        fixedFrameSettings:
          nextInputs.fixedFrameSettings ?? createDefaultFixedFrameSettings(),
      };
      onEstimationChange(nextInputs);
    } else {
      const config = next === "double-door" ? "double" : "single";
      const door = applyDoorConfigurationDefaults(
        nextInputs.doorSettings ?? createDefaultDoorCuttingOptions(config),
        config,
      );
      nextInputs = { ...nextInputs, doorSettings: door };
      onEstimationChange(nextInputs);
    }
  }

  function handleDoorOptionsChange(next: DoorCuttingOptions) {
    onEstimationChange({ ...estimationInputs, doorSettings: next });
  }

  function handleSaveToJob() {
    if (!product || !canExportPdf(product)) {
      setMessage("Calculate valid results before saving.");
      return;
    }
    setIsSaving(true);
    setMessage(null);
    const result = savePartnerProductToJob(
      job,
      estimationInputs,
      cuttingOptions,
      cuttingJobMeta,
      profileRates,
      getCurrentUserName(),
    );
    setIsSaving(false);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    onJobChange(result.job);
    setHasSavedSinceEdit(true);
    setPendingSync(!isOnline);
    clearPartnerDraft();
    setMessage(result.message);
  }

  function handleSaveDraft() {
    savePartnerDraft({
      estimationInputs,
      cuttingOptions,
      cuttingJobMeta,
      productType,
      unitMode,
      savedAt: new Date().toISOString(),
      pendingSync: !isOnline,
    });
    setPendingSync(!isOnline);
    setMessage(isOnline ? "Draft saved locally." : "Draft saved — pending sync when online.");
  }

  async function handlePreviewPdf() {
    if (!summary || !product?.validation.isValid) {
      setMessage("Calculate valid results before previewing PDF.");
      return;
    }
    setIsPdfBusy(true);
    setMessage(null);
    try {
      const doc = await buildSummaryLabourPdfAsync(summary);
      const url = pdfToBlobUrl(doc);
      setPdfPreviewUrl((prev) => {
        revokePdfBlobUrl(prev);
        return url;
      });
    } catch {
      setMessage("Could not generate labour PDF preview.");
    } finally {
      setIsPdfBusy(false);
    }
  }

  async function handleExportPdf() {
    if (!summary || !product?.validation.isValid) {
      setMessage("Calculate valid results before exporting PDF.");
      return;
    }
    setIsPdfBusy(true);
    setMessage(null);
    try {
      await exportSummaryLabourPdf(summary);
      setMessage("Labour cutting PDF downloaded.");
    } catch {
      setMessage("Could not export labour PDF.");
    } finally {
      setIsPdfBusy(false);
    }
  }

  function handleAddToQuotation() {
    const result = addCurrentProductToQuotation({
      estimationInputs,
      cuttingOptions,
      profileRates,
      cuttingJobMeta,
      quotationForm,
      productId: job.activeProductId ?? undefined,
    });
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    onQuotationChange(result.form);
    setMessage(result.message);
  }

  function handleStartNewProduct() {
    if (!hasSavedSinceEdit && isStale) {
      setUnsavedDialog(true);
      return;
    }
    const kind: JobProductKind =
      productType === "fixed-frame"
        ? "fixed-frame"
        : productType === "window"
          ? "window"
          : "door";
    handleAddProduct(kind);
  }

  function requestBack() {
    if (!hasSavedSinceEdit) {
      setUnsavedDialog(true);
      return;
    }
    onBack?.();
  }

  const assistantContext = useMemo(
    () => ({
      jobId: job.id,
      productId: job.activeProductId ?? job.products[0]?.id,
      productType,
      estimationInputs,
      cuttingOptions,
      hasValidResults,
      isOnline,
      calculated: hasValidResults
        ? {
            workshopTotal: displayWorkshopTotal,
            suggestedCustomerBasePrice: displaySuggestedBasePrice,
            suggestedCustomerRatePerSqFt: displaySuggestedRate,
            customerBaseMarginPercent: estimation?.customerBaseMarginPercent,
            customerBaseMarginAmount: displayMarginAmount,
            totalProfileWeightKg: product?.profileCostSummary?.totalUpvcWeight,
            hasMissingHardwareRates: estimation?.hasMissingDoorHardwareRates,
            missingHardwareItems: estimation?.missingDoorHardwareRateItems,
            hardwareItemLabels: estimation?.doorHardwareItems?.map((i) => i.name),
            widthMm: estimation?.widthMm,
            heightMm: estimation?.heightMm,
            areaSqft: primaryWindow?.areaSqft ?? primaryDoor?.areaSqft,
          }
        : undefined,
    }),
    [
      job.id,
      job.activeProductId,
      productType,
      estimationInputs,
      cuttingOptions,
      hasValidResults,
      isOnline,
      displayWorkshopTotal,
      displaySuggestedBasePrice,
      displaySuggestedRate,
      estimation,
      displayMarginAmount,
      product,
      primaryWindow,
      primaryDoor,
    ],
  );

  const assistantCallbacks = useMemo<AssistantExecutionCallbacks>(
    () => ({
      onProductTypeChange: handleProductTypeChange,
      onEstimationChange,
      onCuttingOptionsChange: (options) => {
        onCuttingOptionsChange(() => options);
      },
      onCalculate: runCalculate,
      onSaveProduct: async () => {
        if (!product || !canExportPdf(product)) {
          return { ok: false, message: "Calculate valid results before saving." };
        }
        setIsSaving(true);
        const result = savePartnerProductToJob(
          job,
          estimationInputs,
          cuttingOptions,
          cuttingJobMeta,
          profileRates,
          getCurrentUserName(),
        );
        setIsSaving(false);
        if (result.ok) {
          onJobChange(result.job);
          setHasSavedSinceEdit(true);
          clearPartnerDraft();
        }
        return { ok: result.ok, message: result.message };
      },
      onAddToQuotation: async () => {
        const result = addCurrentProductToQuotation({
          estimationInputs,
          cuttingOptions,
          profileRates,
          cuttingJobMeta,
          quotationForm,
        });
        if (result.ok) onQuotationChange(result.form);
        return { ok: result.ok, message: result.message };
      },
      onGenerateLabourPdf: async () => {
        if (!summary || !product?.validation.isValid) {
          return { ok: false, message: "Calculate valid results before exporting PDF." };
        }
        try {
          await exportSummaryLabourPdf(summary);
          return { ok: true, message: "Labour cutting PDF downloaded." };
        } catch {
          return { ok: false, message: "Could not export labour PDF." };
        }
      },
      onPreviewLabourPdf: async () => {
        if (!summary || !product?.validation.isValid) {
          return { ok: false, message: "Calculate valid results before previewing PDF." };
        }
        try {
          const doc = await buildSummaryLabourPdfAsync(summary);
          const url = pdfToBlobUrl(doc);
          setPdfPreviewUrl((prev) => {
            revokePdfBlobUrl(prev);
            return url;
          });
          return { ok: true, message: "Labour PDF preview opened." };
        } catch {
          return { ok: false, message: "Could not generate labour PDF preview." };
        }
      },
      onStartNewProduct: handleStartNewProduct,
      onNavigate: (module) => {
        if (module === "smart-estimation") return;
        onNavigate?.(module);
      },
    }),
    [
      handleProductTypeChange,
      onEstimationChange,
      onCuttingOptionsChange,
      runCalculate,
      product,
      job,
      estimationInputs,
      cuttingOptions,
      cuttingJobMeta,
      profileRates,
      onJobChange,
      quotationForm,
      onQuotationChange,
      summary,
      handleStartNewProduct,
      onNavigate,
    ],
  );

  function handleAssistantCardAction(actionId: string) {
    if (actionId === "calculate") runCalculate();
    if (actionId === "edit") scrollToForm();
    if (actionId === "view-breakdown") scrollToForm();
  }

  return (
    <div className="min-h-full bg-[#f4f7fc] pb-[calc(7rem+env(safe-area-inset-bottom))]">
      <div className="md:hidden">
        <PartnerWorkspaceHeader
          onBack={onBack ? requestBack : undefined}
          onOpenDocuments={onOpenDocuments}
          onOpenAssistant={() => setAssistantOpen(true)}
          compact
        />
        <PartnerActiveJobStrip
          jobId={job.id}
          projectName={job.projectName}
          productCount={job.products.length}
          isOnline={isOnline}
          pendingSync={pendingSync}
          onOpenJob={onOpenJob}
          compact
        />
      </div>

      <div className="hidden md:block">
        <PartnerWorkspaceHeader
          onBack={onBack ? requestBack : undefined}
          onOpenDocuments={onOpenDocuments}
          onOpenAssistant={() => setAssistantOpen(true)}
          compact={false}
        />
        <div className="mx-auto max-w-3xl px-4 pb-2">
          <PartnerActiveJobStrip
            jobId={job.id}
            projectName={job.projectName}
            productCount={job.products.length}
            updatedAt={job.updatedAt}
            isOnline={isOnline}
            pendingSync={pendingSync}
            onOpenJob={onOpenJob}
          />
        </div>
      </div>

      <div ref={formSectionRef} className="mx-auto max-w-3xl space-y-4 px-4 py-3">
        {(isCalculating || isStale || !isOnline || pendingSync) && (
          <PartnerCalculationStatus
            isCalculating={isCalculating}
            isStale={isStale}
            isCalculated={calculatedSnapshot != null}
            lastCalculatedAt={lastCalculatedAt}
            isOnline={isOnline}
            pendingSync={pendingSync}
          />
        )}
        {message ? (
          <MessageBanner tone={message.includes("saved") ? "success" : "warning"}>
            {message}
          </MessageBanner>
        ) : null}

        {pdfPreviewUrl || isPdfBusy ? (
          <PdfFeedback
            message={null}
            isBusy={isPdfBusy}
            busyLabel="Preparing labour PDF…"
          />
        ) : null}

        <PdfPreviewModal
          open={pdfPreviewUrl != null}
          title="Labour Cutting PDF Preview"
          blobUrl={pdfPreviewUrl}
          onClose={() => {
            revokePdfBlobUrl(pdfPreviewUrl);
            setPdfPreviewUrl(null);
          }}
          onExport={handleExportPdf}
          isExporting={isPdfBusy}
          exportLabel="Export Labour Cutting PDF"
        />

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-bold text-slate-900">Product Entry</h2>
          <div className="mt-3">
            <ProductTypeSelector value={productType} onChange={handleProductTypeChange} />
          </div>
        </section>

        <MeasurementEntryCard
          estimationInputs={estimationInputs}
          unitMode={unitMode}
          onUnitModeChange={setUnitMode}
          onEstimationChange={onEstimationChange}
        />

        {productType === "window" ? (
          <WindowOptions
            estimationInputs={estimationInputs}
            cuttingOptions={cuttingOptions}
            cuttingJobMeta={cuttingJobMeta}
            onEstimationChange={onEstimationChange}
            onCuttingOptionsChange={onCuttingOptionsChange}
            onCuttingJobMetaChange={onCuttingJobMetaChange}
          />
        ) : productType === "fixed-frame" ? (
          <FixedFrameOptions
            estimationInputs={{
              ...estimationInputs,
              fixedFrameSettings:
                estimationInputs.fixedFrameSettings ?? createDefaultFixedFrameSettings(),
            }}
            cuttingJobMeta={cuttingJobMeta}
            onEstimationChange={onEstimationChange}
            onCuttingJobMetaChange={onCuttingJobMetaChange}
          />
        ) : (
          <DoorOptions
            productType={productType}
            estimationInputs={estimationInputs}
            doorOptions={doorOptions}
            cuttingJobMeta={cuttingJobMeta}
            onEstimationChange={onEstimationChange}
            onDoorOptionsChange={handleDoorOptionsChange}
            onCuttingJobMetaChange={onCuttingJobMetaChange}
          />
        )}

        {showFormCalculate ? (
          <div className="pt-1">
            <Button
              type="button"
              size="lg"
              className="h-14 w-full text-base shadow-sm"
              onClick={runCalculate}
              disabled={isCalculating}
            >
              <Calculator className="size-5" />
              Calculate Summary
            </Button>
          </div>
        ) : null}

        {product ? <CalculationValidationBanner validation={product.validation} /> : null}

        {hasValidResults ? (
          <>
            <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11"
                  onClick={runCalculate}
                  disabled={isCalculating}
                >
                  <RefreshCw className="size-4" />
                  Recalculate
                </Button>
                <Button type="button" variant="outline" className="h-11" onClick={scrollToForm}>
                  <Pencil className="size-4" />
                  Edit Measurements
                </Button>
                <Button type="button" variant="outline" className="h-11" onClick={handleStartNewProduct}>
                  <Plus className="size-4" />
                  Start New Product
                </Button>
              </div>
            </section>

            <PartnerProductPreview data={previewData} />

            <PartnerCuttingSummary
              components={components}
              details={details}
              quantity={qty}
            />

            <PartnerProfileCost profileCostSummary={product.profileCostSummary} />

            {productType !== "window" && productType !== "fixed-frame" && estimation?.doorHardwareItems?.length ? (
              <PartnerDoorHardwareCost
                items={estimation.doorHardwareItems}
                totalDoorHardwareCost={estimation.totalDoorHardwareCost ?? 0}
                hasMissingRates={estimation.hasMissingDoorHardwareRates ?? false}
                missingItems={estimation.missingDoorHardwareRateItems ?? []}
                canEditOverrides={canApplyDoorHardwareJobOverride()}
                onOpenHardwareRates={onOpenHardwareRates}
              />
            ) : null}

            <PartnerWorkshopCost
              areaSqft={
                primaryWindow?.areaSqft ??
                primaryDoor?.areaSqft ??
                primaryFixedFrame?.areaSqft ??
                0
              }
              quantity={qty}
              totalAreaSqft={summary?.totalAreaSqft ?? 0}
              workshopRatePerSqft={summary?.workshopRatePerSqft ?? 0}
              totalWorkshopCost={displayWorkshopTotal}
              customerBaseMarginPercent={estimation?.customerBaseMarginPercent ?? 20}
              customerBaseMarginAmount={displayMarginAmount}
              suggestedCustomerBasePrice={displaySuggestedBasePrice}
              suggestedCustomerRatePerSqFt={displaySuggestedRate}
              customerBasePriceAvailable={estimation?.customerBasePriceAvailable ?? false}
              customerRateAvailable={estimation?.customerRateAvailable ?? false}
            />

            {product?.fixedFrame?.cutting ? (
              <FixedFrameResults cutting={product.fixedFrame.cutting} />
            ) : null}

            <PartnerQuickActions
              canExportPdf={canExportPdf(product)}
              isPdfBusy={isPdfBusy}
              isSaving={isSaving}
              onSaveToJob={handleSaveToJob}
              onExportLabourPdf={handleExportPdf}
              onPreviewLabourPdf={handlePreviewPdf}
              onAddToEstimate={() => onNavigate?.("estimate")}
              onAddToQuotation={handleAddToQuotation}
              onStartNewProduct={handleStartNewProduct}
              onOpenDocuments={onOpenDocuments}
            />
          </>
        ) : null}
      </div>

      <FloatingAssistantButton onClick={() => setAssistantOpen(true)} />

      <AssistantSheet
        open={assistantOpen}
        onClose={() => setAssistantOpen(false)}
        isOnline={isOnline}
        context={assistantContext}
        callbacks={assistantCallbacks}
        onCardAction={handleAssistantCardAction}
      />

      {unsavedDialog ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">Unsaved product details</h3>
            <p className="mt-1 text-sm text-slate-600">
              You have unsaved product details. What would you like to do?
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <Button type="button" onClick={() => { handleSaveDraft(); setUnsavedDialog(false); }}>
                Save Draft
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setHasSavedSinceEdit(true);
                  setUnsavedDialog(false);
                  onBack?.();
                }}
              >
                Discard
              </Button>
              <Button type="button" variant="ghost" onClick={() => setUnsavedDialog(false)}>
                Stay Here
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
