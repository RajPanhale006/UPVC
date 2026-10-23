"use client";

import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { Download, Eye, Ruler, Upload } from "lucide-react";

import { CalculationValidationBanner } from "@/components/calculations/calculation-validation-banner";
import {
  buildPreviewDataFromEstimation,
  ProductPreview,
} from "@/components/product-preview";

import {
  createDefaultCuttingOptions,
  ensureCuttingPresetApplied,
  ensureWorkshopPresetApplied,
  STANDARD_ACCEPTANCE_SAMPLES,
  createJobDocument,
  CUTTING_METHOD_LABELS,
  buildCuttingPdfAsync,
  exportCuttingPdf,
  getMethodLabel,
  getProfileCodeForOptions,
  importCuttingPdf,
  migrateCuttingOptions,
  TRACK_SYSTEM_LIST,
  syncCuttingOptionsForTrack,
  TRACK_SYSTEM_PRESETS,
  WORKSHOP_PRESET_LIST,
  WORKSHOP_PRESETS,
  type CuttingMethod,
  type CuttingOptions,
  type ProfileCuttingSettings,
  type TrackSystemId,
  applyThreeTrackSashConfiguration,
  applyTwoGlassOneNetSashConfiguration,
  THREE_TRACK_SASH_CONFIGURATION_LABELS,
  type ThreeTrackSashConfiguration,
} from "@/lib/cutting";
import {
  areaFromFeetInchesFields,
  calculateWindowProduct,
} from "@/lib/calculations";
import {
  feetInchesToMm,
  mmToFeetInches,
  normalizeMm,
  type EstimationInputs,
} from "@/lib/estimation";
import { pdfToBlobUrl, revokePdfBlobUrl } from "@/lib/pdf/preview";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AccentCard,
  AccentCardContent,
  AccentCardDescription,
  AccentCardHeader,
  AccentCardTitle,
  DataTable,
  DataTableHead,
  MessageBanner,
  PageHero,
  PageShell,
  SectionLabel,
  StatCard,
} from "@/components/workshop/workshop-ui";
import { PdfPreviewModal } from "@/components/pdf/pdf-preview-modal";
import { PdfFeedback } from "@/components/pdf/pdf-feedback";
import type { CuttingJobMeta } from "@/lib/summary";
import type { CuttingContentMode } from "@/lib/module-menu";

type CuttingCalculatorProps = {
  estimationInputs: EstimationInputs;
  onEstimationInputsChange: (inputs: EstimationInputs) => void;
  profileCuttingSettings: ProfileCuttingSettings;
  cuttingOptions: CuttingOptions;
  onCuttingOptionsChange: Dispatch<SetStateAction<CuttingOptions>>;
  cuttingJobMeta: CuttingJobMeta;
  onCuttingJobMetaChange: Dispatch<SetStateAction<CuttingJobMeta>>;
  contentMode?: CuttingContentMode;
};

function parseNumber(value: string, fallback = 0): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatMm(value: number): string {
  return String(Math.round(value));
}

function formatJobName(widthMm: number, heightMm: number): string {
  if (widthMm <= 0 || heightMm <= 0) {
    return "Window Job";
  }
  return `${formatMm(widthMm)} × ${formatMm(heightMm)} mm`;
}

export function CuttingCalculator({
  estimationInputs,
  onEstimationInputsChange,
  profileCuttingSettings,
  cuttingOptions: options,
  onCuttingOptionsChange: setOptions,
  cuttingJobMeta,
  onCuttingJobMetaChange,
  contentMode = "full",
}: CuttingCalculatorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const jobNameManualRef = useRef(false);
  const { jobName, jobNotes, windowLocation } = cuttingJobMeta;
  const setJobName = (value: string) =>
    onCuttingJobMetaChange((current) => ({ ...current, jobName: value }));
  const setJobNotes = (value: string) =>
    onCuttingJobMetaChange((current) => ({ ...current, jobNotes: value }));
  const setWindowLocation = (value: string) =>
    onCuttingJobMetaChange((current) => ({ ...current, windowLocation: value }));
  const [pdfMessage, setPdfMessage] = useState<string | null>(null);
  const [isPdfBusy, setIsPdfBusy] = useState(false);
  const [pdfPreview, setPdfPreview] = useState<{ url: string; title: string } | null>(null);

  const systemId = estimationInputs.trackSystemId;
  const qty = Math.max(1, estimationInputs.numberOfWindows || 1);

  const trackWorkshopPresets = useMemo(
    () => WORKSHOP_PRESET_LIST.filter((preset) => preset.trackSystemId === systemId),
    [systemId],
  );

  const glassHeightBlockMm = useMemo(
    () => options.profileSectionMm * 2 - options.glassHeightStandardLessMm,
    [options.profileSectionMm, options.glassHeightStandardLessMm],
  );

  const widthMm = feetInchesToMm(
    estimationInputs.widthFeet,
    estimationInputs.widthInches,
  );
  const heightMm = feetInchesToMm(
    estimationInputs.heightFeet,
    estimationInputs.heightInches,
  );

  useEffect(() => {
    if (options.cuttingMethod === "workshop-confirmed") {
      const fixed = ensureWorkshopPresetApplied(options, systemId);
      if (
        fixed.workshopPresetId !== options.workshopPresetId ||
        fixed.sashWidthTotalDeductionMm !== options.sashWidthTotalDeductionMm ||
        fixed.sashHeightDeductionMm !== options.sashHeightDeductionMm
      ) {
        setOptions(fixed);
      }
    }
  }, [options.cuttingMethod, systemId, options, setOptions]);

  useEffect(() => {
    if (!jobNameManualRef.current) {
      setJobName(formatJobName(widthMm, heightMm));
    }
  }, [widthMm, heightMm]);

  const windowCalc = useMemo(
    () =>
      calculateWindowProduct({
        widthMm,
        heightMm,
        quantity: qty,
        areaSqFt: areaFromFeetInchesFields(
          estimationInputs.widthFeet,
          estimationInputs.widthInches,
          estimationInputs.heightFeet,
          estimationInputs.heightInches,
        ),
        trackSystemId: systemId,
        cuttingOptions: options,
      }),
    [
      widthMm,
      heightMm,
      qty,
      estimationInputs.widthFeet,
      estimationInputs.widthInches,
      estimationInputs.heightFeet,
      estimationInputs.heightInches,
      systemId,
      options,
    ],
  );

  const result = windowCalc.cutting;

  function updateEstimation(patch: Partial<EstimationInputs>) {
    onEstimationInputsChange({ ...estimationInputs, ...patch });
  }

  function updateFeetInches(
    axis: "width" | "height",
    part: "feet" | "inches",
    raw: string,
  ) {
    const value = parseNumber(raw, 0);
    const key =
      axis === "width"
        ? part === "feet"
          ? "widthFeet"
          : "widthInches"
        : part === "feet"
          ? "heightFeet"
          : "heightInches";
    updateEstimation({ [key]: value } as Partial<EstimationInputs>);
  }

  function updateMm(axis: "width" | "height", raw: string) {
    const mm = normalizeMm(parseNumber(raw, 0));
    const { feet, inches } = mmToFeetInches(mm);
    if (axis === "width") {
      updateEstimation({ widthFeet: feet, widthInches: inches });
    } else {
      updateEstimation({ heightFeet: feet, heightInches: inches });
    }
  }

  function handleSystemChange(nextSystemId: TrackSystemId) {
    updateEstimation({ trackSystemId: nextSystemId });
    setOptions((current) => {
      let next = syncCuttingOptionsForTrack(current, nextSystemId);
      if (nextSystemId === "2.5-track-t60" && next.cuttingMethod === "sarik") {
        next = applyTwoGlassOneNetSashConfiguration(next, nextSystemId);
      }
      return next;
    });
  }

  function handleSashConfigurationChange(configuration: ThreeTrackSashConfiguration) {
    setOptions((current) =>
      applyThreeTrackSashConfiguration(current, systemId, configuration),
    );
  }

  function handleMethodChange(method: CuttingMethod) {
    const next = createDefaultCuttingOptions(systemId, method);
    setOptions(ensureCuttingPresetApplied(next, systemId));
  }

  function loadSarikSample() {
    handleMethodChange("sarik");
    updateEstimation({ numberOfWindows: 1 });
    updateMm("width", "1187");
    updateMm("height", "1208");
  }

  function formatSarikSize(width: number, height: number): string {
    return `${formatMm(width)} × ${formatMm(height)} mm`;
  }

  function applyWorkshopPreset(presetId: string) {
    const preset = WORKSHOP_PRESETS[presetId];
    if (!preset) return;
    setOptions((current) => ({
      ...createDefaultCuttingOptions(preset.trackSystemId, "workshop-confirmed"),
      ...preset.defaults,
      cuttingMethod: "workshop-confirmed",
      workshopPresetId: presetId,
      customInterlockDeductionEnabled: current.customInterlockDeductionEnabled,
      customInterlockDeductionMm: current.customInterlockDeductionMm,
    }));
    if (preset.trackSystemId !== systemId) {
      updateEstimation({ trackSystemId: preset.trackSystemId });
    }
  }

  function updateOption<K extends keyof CuttingOptions>(
    key: K,
    value: string | boolean | null,
  ) {
    setOptions((current) => {
      if (key === "interlockHeightDeductionMm") {
        return {
          ...current,
          interlockHeightDeductionMm:
            value === "" || value === null ? null : parseNumber(String(value), 0),
        };
      }
      if (typeof value === "boolean") {
        return { ...current, [key]: value };
      }
      return {
        ...current,
        [key]: parseNumber(String(value), current[key] as number),
      };
    });
  }

  function applyFeetPreset(feet: number) {
    updateEstimation({
      widthFeet: feet,
      widthInches: 0,
      heightFeet: feet,
      heightInches: 0,
    });
  }

  function loadStandardSample(sampleId: (typeof STANDARD_ACCEPTANCE_SAMPLES)[number]["id"]) {
    const sample = STANDARD_ACCEPTANCE_SAMPLES.find((s) => s.id === sampleId);
    if (!sample) return;
    const { feet: wFt, inches: wIn } = mmToFeetInches(sample.widthMm);
    const { feet: hFt, inches: hIn } = mmToFeetInches(sample.heightMm);
    updateEstimation({
      trackSystemId: sample.trackSystemId,
      widthFeet: wFt,
      widthInches: wIn,
      heightFeet: hFt,
      heightInches: hIn,
      numberOfWindows: 1,
    });
    setOptions(createDefaultCuttingOptions(sample.trackSystemId, "standard"));
  }

  function loadSampleVerification() {
    const preset = WORKSHOP_PRESETS["workshop-confirmed-60-2track"];
    if (!preset?.sample) return;
    applyWorkshopPreset(preset.id);
    const { feet: wFt, inches: wIn } = mmToFeetInches(preset.sample.openingWidthMm);
    const { feet: hFt, inches: hIn } = mmToFeetInches(preset.sample.openingHeightMm);
    updateEstimation({
      widthFeet: wFt,
      widthInches: wIn,
      heightFeet: hFt,
      heightInches: hIn,
      numberOfWindows: 1,
    });
  }

  function buildCuttingJob() {
    if (!result) return null;
    return createJobDocument({
      jobName,
      jobNotes,
      customerName: estimationInputs.customerName,
      location: estimationInputs.location,
      windowLocation,
      systemId,
      systemLabel: TRACK_SYSTEM_PRESETS[systemId].label,
      profileCode: getProfileCodeForOptions(systemId, options),
      widthMm,
      heightMm,
      numberOfWindows: qty,
      options,
    });
  }

  function closePdfPreview() {
    setPdfPreview((prev) => {
      revokePdfBlobUrl(prev?.url ?? null);
      return null;
    });
  }

  async function handleViewPdf() {
    if (!windowCalc.validation.isValid || !result) {
      setPdfMessage(
        windowCalc.validation.blockingMessage ??
          "Enter valid dimensions before viewing PDF.",
      );
      return;
    }

    const job = buildCuttingJob();
    if (!job) {
      setPdfMessage("Enter valid dimensions before viewing PDF.");
      return;
    }

    setPdfMessage(null);
    setIsPdfBusy(true);
    try {
      const doc = await buildCuttingPdfAsync({ ...job, result: result! });
      const url = pdfToBlobUrl(doc);
      setPdfPreview((prev) => {
        revokePdfBlobUrl(prev?.url ?? null);
        return { url, title: `${job.jobName} — Labour Cutting Sheet` };
      });
    } catch {
      setPdfMessage("Could not generate cutting sheet preview.");
    } finally {
      setIsPdfBusy(false);
    }
  }

  async function handleExportPdf() {
    if (!windowCalc.validation.isValid || !result) {
      setPdfMessage(
        windowCalc.validation.blockingMessage ??
          "Enter valid dimensions before exporting.",
      );
      return;
    }

    const job = buildCuttingJob();
    if (!job) {
      setPdfMessage("Enter valid dimensions before exporting.");
      return;
    }

    setIsPdfBusy(true);
    setPdfMessage(null);

    try {
      await exportCuttingPdf({ ...job, result: result! });
      setPdfMessage("Labour cutting PDF downloaded.");
    } catch {
      setPdfMessage("Could not export PDF. Please try again.");
    } finally {
      setIsPdfBusy(false);
    }
  }

  async function handleImportPdf(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setIsPdfBusy(true);
    setPdfMessage(null);

    try {
      const job = await importCuttingPdf(file);
      const { feet: wFt, inches: wIn } = mmToFeetInches(job.widthMm);
      const { feet: hFt, inches: hIn } = mmToFeetInches(job.heightMm);

      updateEstimation({
        trackSystemId: job.systemId,
        widthFeet: wFt,
        widthInches: wIn,
        heightFeet: hFt,
        heightInches: hIn,
        numberOfWindows: job.numberOfWindows,
        customerName: job.customerName || estimationInputs.customerName,
        location: job.location || estimationInputs.location,
      });
      setJobName(job.jobName);
      jobNameManualRef.current = true;
      setJobNotes(job.jobNotes);
      setWindowLocation(job.windowLocation);
      setOptions(migrateCuttingOptions(job.options));
      setPdfMessage(`Imported "${job.jobName}" from PDF.`);
    } catch (error) {
      setPdfMessage(
        error instanceof Error
          ? error.message
          : "Could not import PDF. Please try again.",
      );
    } finally {
      setIsPdfBusy(false);
    }
  }

  type OptionField = {
    key: keyof CuttingOptions;
    label: string;
    blank?: boolean;
  };

  const standardFields: OptionField[] = [
    { key: "profileSectionMm", label: "Profile Section mm" },
    { key: "standardHeightMinusMm", label: "Standard Height Minus mm" },
    { key: "standardWidthMinusMm", label: "Standard Width Minus mm" },
    { key: "divider", label: "Divider" },
    { key: "shutterQty", label: "Shutter Qty" },
    { key: "interlockQty", label: "Interlock Qty" },
    { key: "glassPanelQty", label: "Glass Panel Qty" },
    { key: "glassWidthDeductionMm", label: "Glass Width Deduction mm" },
    { key: "glassHeightDeductionMm", label: "Glass Height Deduction mm" },
    { key: "beadingAddMm", label: "Beading Add mm" },
    { key: "steelDeductionMm", label: "Steel Deduction mm" },
  ];

  const workshopFields: OptionField[] = [
    { key: "profileSectionMm", label: "Profile Section mm" },
    { key: "frameAddWidthMm", label: "Frame Add Width mm (input + this = frame cut)" },
    { key: "frameAddHeightMm", label: "Frame Add Height mm (input + this = frame cut)" },
    { key: "sashWidthTotalDeductionMm", label: "Sash Width Total Deduction mm (from frame cut)" },
    { key: "sashHeightDeductionMm", label: "Sash Height Deduction mm (from frame cut)" },
    { key: "weldingAllowanceMm", label: "Welding Allowance mm (sash cut − this = welded)" },
    { key: "interlockHeightDeductionMm", label: "Interlock Height Deduction mm", blank: true },
    { key: "divider", label: "Divider" },
    { key: "shutterQty", label: "Shutter Qty" },
    { key: "interlockQty", label: "Interlock Qty" },
    { key: "glassPanelQty", label: "Glass Panel Qty" },
    { key: "glassWidthLessMm", label: "Glass Width Less mm (Sash Top − this)" },
    { key: "glassHeightStandardLessMm", label: "Glass Height Standard Less mm" },
    { key: "beadingAddMm", label: "Beading Add mm" },
    { key: "steelDeductionMm", label: "Steel Deduction mm" },
  ];

  const activeFields =
    options.cuttingMethod === "standard"
      ? standardFields
      : workshopFields;

  const methodValuesTitle =
    options.cuttingMethod === "standard"
      ? "Standard Method values"
      : options.cuttingMethod === "workshop-confirmed"
        ? "Workshop Confirmed values"
        : "Sarik Method";

  const showEntry = contentMode === "full" || contentMode === "entry";
  const showTable = contentMode === "full" || contentMode === "table";
  const showPreviewPanel = contentMode === "full";
  const sectionMode = contentMode !== "full";

  if (contentMode === "preview") {
    return (
      <PageShell className="flex flex-col gap-6">
        <ProductPreview
          data={buildPreviewDataFromEstimation(
            estimationInputs,
            options,
            getProfileCodeForOptions(systemId, options),
          )}
        />
      </PageShell>
    );
  }

  return (
    <PageShell className="flex flex-col gap-6">
      {!sectionMode ? (
      <PageHero
        icon={Ruler}
        accent="cyan"
        title="UPVC Cutting Calculator"
        description="Standard Method for estimates. Workshop Confirmed for production. Sarik Method — enter final window size after welding; shows cutting and after-welding sizes."
        actions={
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={handleImportPdf}
            />
            <Button
              type="button"
              variant="outline"
              disabled={isPdfBusy}
              className="hero-action-light"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload />
              Import PDF
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isPdfBusy || !result}
              className="hero-action-light"
              onClick={handleViewPdf}
            >
              <Eye />
              View PDF
            </Button>
            <Button
              type="button"
              disabled={isPdfBusy || !result}
              onClick={handleExportPdf}
            >
              <Download />
              Export Labour PDF
            </Button>
          </>
        }
      />
      ) : null}

      <PdfPreviewModal
        open={pdfPreview != null}
        title={pdfPreview?.title ?? "PDF Preview"}
        blobUrl={pdfPreview?.url ?? null}
        onClose={closePdfPreview}
        onExport={handleExportPdf}
        isExporting={isPdfBusy}
        exportLabel="Export Labour PDF"
      />

      {pdfMessage || (isPdfBusy && !pdfPreview) ? (
        <PdfFeedback
          message={pdfMessage}
          isBusy={isPdfBusy && !pdfPreview}
          busyLabel="Preparing labour cutting PDF…"
        />
      ) : null}

      {showEntry ? (
      <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          accent="violet"
          label="Cutting method"
          value={getMethodLabel(options.cuttingMethod)}
        />
        <StatCard
          accent="cyan"
          label={options.cuttingMethod === "sarik" ? "Final window W × H" : "Frame W × H"}
          value={
            result
              ? options.cuttingMethod === "sarik"
                ? `${formatMm(widthMm)} × ${formatMm(heightMm)} mm`
                : `${formatMm(result.cuts.frameWidth)} × ${formatMm(result.cuts.frameHeight)} mm`
              : "—"
          }
        />
        <StatCard
          accent="blue"
          label="Sash Top"
          value={
            result
              ? options.cuttingMethod === "standard"
                ? `${formatMm(result.cuts.sashTop)} mm`
                : `${formatMm(result.cuts.sashTop)} → ${formatMm(result.cuts.sashTopWelded)} mm`
              : "—"
          }
        />
        <StatCard
          accent="emerald"
          label="Glass W × H"
          value={
            result
              ? `${formatMm(result.cuts.glassWidth)} × ${formatMm(result.cuts.glassHeight)}`
              : "—"
          }
          sublabel={
            result
              ? `${options.glassPanelQty || options.divider} panel(s) per window`
              : undefined
          }
        />
        <StatCard accent="amber" label="Qty" value={String(qty)} sublabel={TRACK_SYSTEM_PRESETS[systemId].label} />
      </div>

      <AccentCard accent="violet">
        <AccentCardHeader>
          <AccentCardTitle>Job details</AccentCardTitle>
          <AccentCardDescription>
            Shown on the labour cutting PDF. No cost or pricing on this sheet.
          </AccentCardDescription>
        </AccentCardHeader>
        <AccentCardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="job-name">Job name (window size)</Label>
            <Input
              id="job-name"
              value={jobName}
              onChange={(e) => {
                jobNameManualRef.current = true;
                setJobName(e.target.value);
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="window-location">Window location</Label>
            <Input
              id="window-location"
              value={windowLocation}
              onChange={(e) => setWindowLocation(e.target.value)}
              placeholder="e.g. Bedroom 1, Hall front"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="job-notes">Notes for labours</Label>
            <Input id="job-notes" value={jobNotes} onChange={(e) => setJobNotes(e.target.value)} />
          </div>
        </AccentCardContent>
      </AccentCard>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(300px,360px)]">
        <div className="grid gap-6 lg:grid-cols-2">
        <AccentCard accent="cyan">
          <AccentCardHeader>
            <AccentCardTitle>Window size</AccentCardTitle>
          </AccentCardHeader>
          <AccentCardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Track system</Label>
              <Select value={systemId} onValueChange={(v) => handleSystemChange(v as TrackSystemId)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRACK_SYSTEM_LIST.map((preset) => (
                    <SelectItem key={preset.id} value={preset.id}>{preset.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Cutting method</Label>
              <Select
                value={options.cuttingMethod}
                onValueChange={(v) => handleMethodChange(v as CuttingMethod)}
              >
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(CUTTING_METHOD_LABELS) as CuttingMethod[]).map((m) => (
                    <SelectItem key={m} value={m}>{CUTTING_METHOD_LABELS[m]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {systemId === "3-track-t109" ? (
              <div className="space-y-2">
                <Label>Sash configuration</Label>
                <Select
                  value={options.threeTrackSashConfiguration ?? "two-glass-one-net"}
                  onValueChange={(v) =>
                    handleSashConfigurationChange(v as ThreeTrackSashConfiguration)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(
                      Object.keys(
                        THREE_TRACK_SASH_CONFIGURATION_LABELS,
                      ) as ThreeTrackSashConfiguration[]
                    ).map((key) => (
                      <SelectItem key={key} value={key}>
                        {THREE_TRACK_SASH_CONFIGURATION_LABELS[key]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            {options.cuttingMethod === "workshop-confirmed" ? (
              <div className="space-y-2">
                <Label>Workshop preset</Label>
                <Select
                  value={options.workshopPresetId ?? ""}
                  onValueChange={(v) => {
                    if (v) applyWorkshopPreset(v);
                  }}
                >
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select preset" /></SelectTrigger>
                  <SelectContent>
                    {trackWorkshopPresets.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" size="sm" onClick={loadSampleVerification}>
                  Load sample verification (2380 × 2048)
                </Button>
              </div>
            ) : options.cuttingMethod === "sarik" ? (
              <div className="space-y-2">
                <Label>Sarik sample</Label>
                <Button type="button" variant="outline" size="sm" onClick={loadSarikSample}>
                  Load sample (1187 × 1208 mm)
                </Button>
                <p className="text-xs text-muted-foreground">
                  Enter final window size after welding. Two-sash sliding window formulas apply.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Standard samples</Label>
                <div className="flex flex-wrap gap-2">
                  {STANDARD_ACCEPTANCE_SAMPLES.map((sample) => (
                    <Button
                      key={sample.id}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => loadStandardSample(sample.id)}
                    >
                      Load {sample.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Width — ft / in</Label>
                <div className="flex gap-2">
                  <Input inputMode="decimal" value={String(estimationInputs.widthFeet)} onChange={(e) => updateFeetInches("width", "feet", e.target.value)} />
                  <Input inputMode="decimal" value={String(estimationInputs.widthInches)} onChange={(e) => updateFeetInches("width", "inches", e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Height — ft / in</Label>
                <div className="flex gap-2">
                  <Input inputMode="decimal" value={String(estimationInputs.heightFeet)} onChange={(e) => updateFeetInches("height", "feet", e.target.value)} />
                  <Input inputMode="decimal" value={String(estimationInputs.heightInches)} onChange={(e) => updateFeetInches("height", "inches", e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Width — mm</Label>
                <Input inputMode="decimal" value={String(widthMm)} onChange={(e) => updateMm("width", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Height — mm</Label>
                <Input inputMode="decimal" value={String(heightMm)} onChange={(e) => updateMm("height", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>No. of windows</Label>
                <Input
                  inputMode="numeric"
                  value={String(qty)}
                  onChange={(e) => updateEstimation({ numberOfWindows: parseNumber(e.target.value, 1) })}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {[3, 4, 5].map((ft) => (
                <Button key={ft} type="button" variant="outline" size="sm" onClick={() => applyFeetPreset(ft)}>
                  {ft} ft × {ft} ft
                </Button>
              ))}
            </div>
          </AccentCardContent>
        </AccentCard>

        <AccentCard accent="amber">
          <AccentCardHeader>
            <AccentCardTitle>{methodValuesTitle}</AccentCardTitle>
            <AccentCardDescription>
              {options.cuttingMethod === "sarik"
                ? "Fixed production formulas for two-sash sliding windows."
                : "All deduction values are editable."}
            </AccentCardDescription>
          </AccentCardHeader>
          <AccentCardContent className="grid gap-3 sm:grid-cols-2">
            {options.cuttingMethod === "sarik" ? (
              <div className="space-y-2 text-sm sm:col-span-2">
                <p>Outer frame cutting = final size + 5 mm</p>
                <p>Sash after-weld W = round(((W − 1) / 2) − 5); H = round(H − 82)</p>
                <p>Sash cutting = after-weld + 5 mm</p>
                <p>Glass W = sash after-weld W − 111; Glass H = sash after-weld H − 112</p>
              </div>
            ) : (
              <>
                {activeFields.map(({ key, label, blank }) => (
                  <div key={String(key)} className="space-y-2">
                    <Label>{label}</Label>
                    <Input
                      inputMode="decimal"
                      placeholder={blank ? "Blank = use sash side" : undefined}
                      value={
                        key === "interlockHeightDeductionMm"
                          ? options.interlockHeightDeductionMm == null
                            ? ""
                            : String(options.interlockHeightDeductionMm)
                          : String(options[key])
                      }
                      onChange={(e) => updateOption(key, e.target.value)}
                    />
                  </div>
                ))}

                {options.cuttingMethod === "standard" ? (
                  <div className="space-y-3 sm:col-span-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="custom-interlock"
                        checked={options.customInterlockDeductionEnabled}
                        onCheckedChange={(checked) =>
                          updateOption("customInterlockDeductionEnabled", checked === true)
                        }
                      />
                      <Label htmlFor="custom-interlock">Custom interlock deduction</Label>
                    </div>
                    {options.customInterlockDeductionEnabled ? (
                      <Input
                        inputMode="decimal"
                        value={String(options.customInterlockDeductionMm)}
                        onChange={(e) => updateOption("customInterlockDeductionMm", e.target.value)}
                      />
                    ) : null}
                  </div>
                ) : null}
              </>
            )}
          </AccentCardContent>
        </AccentCard>
        </div>

        {showPreviewPanel ? (
        <ProductPreview
          data={buildPreviewDataFromEstimation(
            estimationInputs,
            options,
            getProfileCodeForOptions(systemId, options),
          )}
          className="xl:sticky xl:top-28 xl:self-start"
        />
        ) : null}
      </div>

      {options.cuttingMethod === "workshop-confirmed" ? (
        <MessageBanner tone="info">
          Input 2385 × 2053 → Frame cut <strong>2390 × 2058</strong>.
          Sash cut (long-point) <strong>1077 / 1955</strong>, after welding{" "}
          <strong>1072 / 1950</strong>. Glass from sash cut:{" "}
          <strong>1072 × 1845</strong> (Top − 5 mm; Side − ((60×2) − 10) mm).
        </MessageBanner>
      ) : options.cuttingMethod === "sarik" ? (
        <MessageBanner tone="info">
          Sarik Method: enter <strong>final window size after welding</strong>.
          Example 1187 × 1208 → Outer frame cut <strong>1192 × 1213</strong>, after weld{" "}
          <strong>1187 × 1208</strong>. Sash cut <strong>593 × 1131</strong>, after weld{" "}
          <strong>588 × 1126</strong>. Glass <strong>477 × 1014</strong>.
        </MessageBanner>
      ) : (
        <MessageBanner tone="info">
          Standard Method: Sash Side = Height − ((Profile × 2) − 20). Sash Top =
          (Width − (Profile − 18)) ÷ Divider. Example 3 ft × 3 ft T60 → Sash Top/Bottom{" "}
          <strong>436.2</strong>, Sash Side/Interlock <strong>814.4</strong>.
        </MessageBanner>
      )}

      <CalculationValidationBanner validation={windowCalc.validation} />
      </>
      ) : null}

      {showTable ? (
      <AccentCard accent="indigo">
        <AccentCardHeader>
          <AccentCardTitle>Cutting table</AccentCardTitle>
          <AccentCardDescription>
            45° profile sizes are long point to long point. Glass & steel are 90° straight.
          </AccentCardDescription>
        </AccentCardHeader>
        <AccentCardContent>
          {result ? (
            <div className="space-y-8">
              <section className="space-y-3">
                <SectionLabel accent="cyan">Frame & sash (mm)</SectionLabel>
                <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {(
                    [
                      ["Frame W", result.cuts.frameWidth, "violet"],
                      ["Frame H", result.cuts.frameHeight, "violet"],
                      ["Sash Side cut", result.cuts.sashSide, "cyan"],
                      ["Sash Side welded", result.cuts.sashSideWelded, "cyan"],
                      ["Sash Top cut", result.cuts.sashTop, "blue"],
                      ["Sash Top welded", result.cuts.sashTopWelded, "blue"],
                      ["Interlock cut", result.cuts.interlock, "amber"],
                      ["Interlock welded", result.cuts.interlockWelded, "amber"],
                      ["Steel Frame H", result.cuts.steelFrameH, "orange"],
                      ["Steel Sash H", result.cuts.steelSashH, "rose"],
                    ] as const
                  ).map(([label, value, accent]) => (
                    <StatCard key={label} accent={accent} label={label} value={`${formatMm(value)} mm`} />
                  ))}
                </dl>
              </section>

              {(options.cuttingMethod === "workshop-confirmed") && result ? (
                <section className="space-y-3">
                  <SectionLabel accent="emerald">Glass cutting (per panel)</SectionLabel>
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 text-sm">
                    <p className="font-semibold text-emerald-900">
                      Glass Size = {formatMm(result.cuts.glassWidth)} mm ×{" "}
                      {formatMm(result.cuts.glassHeight)} mm
                      {" · "}
                      {options.glassPanelQty || options.divider} panels / window
                    </p>
                    <ul className="mt-2 space-y-1 text-emerald-900/90">
                      <li>
                        Glass Width = Sash Top ({formatMm(result.cuts.sashTop)} mm) −{" "}
                        {options.glassWidthLessMm} mm = {formatMm(result.cuts.glassWidth)} mm
                      </li>
                      <li>
                        Glass Height = Sash Side ({formatMm(result.cuts.sashSide)} mm) − ((
                        {options.profileSectionMm} × 2) − {options.glassHeightStandardLessMm} mm) =
                        Sash Side − {formatMm(glassHeightBlockMm)} mm ={" "}
                        {formatMm(result.cuts.glassHeight)} mm
                      </li>
                    </ul>
                  </div>
                </section>
              ) : null}

              <DataTable className="min-w-[64rem]">
                <DataTableHead>
                  <th className="px-2 py-3">Sr</th>
                  <th className="px-2 py-3">Item</th>
                  <th className="px-2 py-3">Profile</th>
                  <th className="px-2 py-3">Qty/Win</th>
                  {options.cuttingMethod === "sarik" ? (
                    <>
                      <th className="px-2 py-3">Cut Before Weld mm</th>
                      <th className="px-2 py-3">After Weld mm</th>
                    </>
                  ) : (
                    <th className="px-2 py-3">Cut mm</th>
                  )}
                  <th className="px-2 py-3">Inch</th>
                  <th className="px-2 py-3">Ft-in</th>
                  <th className="px-2 py-3">Angle</th>
                  <th className="px-2 py-3">Total Qty</th>
                  <th className="px-2 py-3">Run ft</th>
                  <th className="px-2 py-3">Notes</th>
                </DataTableHead>
                <tbody>
                  {result.tableRows.map((row) => (
                    <tr key={row.srNo} className="border-b border-indigo-50 text-xs">
                      <td className="px-2 py-2">{row.srNo}</td>
                      <td className="px-2 py-2 font-medium">{row.item}</td>
                      <td className="px-2 py-2">{row.profileCode}</td>
                      <td className="px-2 py-2 font-mono">{row.qtyPerWindow}</td>
                      {options.cuttingMethod === "sarik" ? (
                        <>
                          <td className="px-2 py-2 font-mono">
                            {row.cutSizeCrossMm != null
                              ? formatSarikSize(row.cutSizeMm, row.cutSizeCrossMm)
                              : formatMm(row.cutSizeMm)}
                          </td>
                          <td className="px-2 py-2 font-mono">
                            {row.afterWeldingMm != null && row.afterWeldingCrossMm != null
                              ? formatSarikSize(row.afterWeldingMm, row.afterWeldingCrossMm)
                              : row.afterWeldingMm != null
                                ? formatMm(row.afterWeldingMm)
                                : "N/A"}
                          </td>
                        </>
                      ) : (
                        <td className="px-2 py-2 font-mono">
                          {row.cutSizeCrossMm != null
                            ? `${formatMm(row.cutSizeMm)} × ${formatMm(row.cutSizeCrossMm)}`
                            : formatMm(row.cutSizeMm)}
                        </td>
                      )}
                      <td className="px-2 py-2 font-mono">{row.cutSizeInch}</td>
                      <td className="px-2 py-2 font-mono">{row.cutSizeFtInch}</td>
                      <td className="px-2 py-2">{row.cutAngle}</td>
                      <td className="px-2 py-2 font-mono font-semibold">{row.totalQty}</td>
                      <td className="px-2 py-2 font-mono">{row.totalRunningFt.toFixed(2)}</td>
                      <td className="px-2 py-2 text-muted-foreground">{row.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>

              <section>
                <SectionLabel accent="emerald">Running feet summary</SectionLabel>
                <dl className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
                  {result.runningFeetSummary.map((line) => (
                    <div key={line.label} className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                      <dt className="text-muted-foreground">{line.label}</dt>
                      <dd className="font-mono font-semibold">{line.feet.toFixed(2)} ft</dd>
                    </div>
                  ))}
                </dl>
              </section>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Enter valid dimensions to calculate cuts.</p>
          )}
        </AccentCardContent>
      </AccentCard>
      ) : null}
    </PageShell>
  );
}
