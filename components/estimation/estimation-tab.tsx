"use client";

import { useMemo, useRef, useState } from "react";
import { Calculator, Download, Eye, Upload } from "lucide-react";

import {
  buildPreviewDataFromEstimation,
  ProductPreview,
} from "@/components/product-preview";
import { CalculationValidationBanner } from "@/components/calculations/calculation-validation-banner";
import {
  buildEstimationCostBreakdownPdfAsync,
  buildEstimationPdf,
  exportEstimationCostBreakdownPdf,
  exportEstimationPdf,
  importEstimationPdf,
  TRACK_LABELS,
  type EstimationInputs,
  type EstimationResult,
  type OverheadKey,
} from "@/lib/estimation";
import {
  buildEstimationResultFromProduct,
  calculateProduct,
  canExportPdf,
  canExportWorkshopCostPdf,
} from "@/lib/calculations";
import { DoorHardwareRatesTab } from "@/components/door-hardware/door-hardware-rates-tab";
import type { DoorHardwareMasterSettings } from "@/lib/door-hardware";
import { isDoorProduct } from "@/lib/estimation/defaults";
import type { CuttingJobMeta } from "@/lib/summary";
import { formatInr, syncMarketRate, type ProfileRateSettings } from "@/lib/profiles";
import { pdfToBlobUrl, revokePdfBlobUrl } from "@/lib/pdf/preview";
import type { CuttingOptions } from "@/lib/cutting/types";
import type { TrackSystemId } from "@/lib/cutting/types";
import { Button } from "@/components/ui/button";
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
import { shouldShowEstimationBlock } from "@/lib/module-menu";

type EstimationTabProps = {
  inputs: EstimationInputs;
  profileRates: ProfileRateSettings;
  doorHardwareMaster: DoorHardwareMasterSettings;
  cuttingOptions: CuttingOptions;
  cuttingJobMeta: CuttingJobMeta;
  onInputsChange: (inputs: EstimationInputs) => void;
  onProfileRatesChange: (settings: ProfileRateSettings) => void;
  onDoorHardwareMasterChange: (settings: DoorHardwareMasterSettings) => void;
  onOpenDoorHardwareRates?: () => void;
  activeSection?: string;
};

const OVERHEAD_FIELDS: { key: OverheadKey; label: string }[] = [
  { key: "transportation", label: "Transportation" },
  { key: "electricity", label: "Electricity" },
  { key: "maintenance", label: "Maintenance" },
  { key: "depreciation", label: "Depreciation" },
  { key: "otherExp", label: "Other expenses" },
  { key: "rentFixedCost", label: "Rent (fixed)" },
];

function parseNumber(value: string, fallback: number): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function EstimationTab({
  inputs,
  profileRates,
  doorHardwareMaster,
  cuttingOptions,
  cuttingJobMeta,
  onInputsChange,
  onProfileRatesChange,
  onDoorHardwareMasterChange,
  onOpenDoorHardwareRates,
  activeSection,
}: EstimationTabProps) {
  const show = (block: string) => shouldShowEstimationBlock(activeSection, block);
  const sectionMode = Boolean(activeSection);

  if (activeSection === "hardware" && show("door-hardware-rates")) {
    return (
      <DoorHardwareRatesTab
        settings={doorHardwareMaster}
        onChange={onDoorHardwareMasterChange}
        activeSection={activeSection}
      />
    );
  }

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pdfMessage, setPdfMessage] = useState<string | null>(null);
  const [isPdfBusy, setIsPdfBusy] = useState(false);
  const [pdfPreview, setPdfPreview] = useState<{
    url: string;
    title: string;
    exportLabel: string;
    onExport: () => Promise<void>;
  } | null>(null);

  const syncedProfileRates = useMemo(
    () => syncMarketRate(profileRates, inputs.profileRatePerKg),
    [profileRates, inputs.profileRatePerKg],
  );

  const product = useMemo(
    () =>
      calculateProduct({
        estimationInputs: inputs,
        cuttingOptions,
        profileRates: syncedProfileRates,
        cuttingJobMeta,
        doorHardwareMaster,
      }),
    [inputs, cuttingOptions, syncedProfileRates, cuttingJobMeta, doorHardwareMaster],
  );

  const result = useMemo(
    (): EstimationResult =>
      buildEstimationResultFromProduct(
        product,
        inputs,
        syncedProfileRates,
        cuttingOptions,
      ),
    [product, inputs, syncedProfileRates, cuttingOptions],
  );

  const canExport = canExportPdf(product);
  const canExportWorkshopPdf = canExportWorkshopCostPdf(product);
  const missingDoorHardware = product.estimation?.hasMissingDoorHardwareRates ?? false;

  const previewData = useMemo(
    () =>
      buildPreviewDataFromEstimation(
        inputs,
        cuttingOptions,
        product.profileCode,
      ),
    [inputs, cuttingOptions, product.profileCode],
  );

  function updateInput<K extends keyof EstimationInputs>(
    key: K,
    value: EstimationInputs[K],
  ) {
    onInputsChange({ ...inputs, [key]: value });
  }

  function updateNumber(key: keyof EstimationInputs, value: string) {
    updateInput(key, parseNumber(value, inputs[key] as number) as EstimationInputs[typeof key]);
  }

  function updateOverhead(key: OverheadKey, value: string) {
    onInputsChange({
      ...inputs,
      overheads: {
        ...inputs.overheads,
        [key]: parseNumber(value, inputs.overheads[key]),
      },
    });
  }

  function updateGlassRate(size: keyof EstimationInputs["glassRates"], value: string) {
    onInputsChange({
      ...inputs,
      glassRates: {
        ...inputs.glassRates,
        [size]: parseNumber(value, inputs.glassRates[size]),
      },
    });
  }

  function handleProfileRateChange(value: string) {
    const rate = parseNumber(value, inputs.profileRatePerKg);
    updateInput("profileRatePerKg", rate);
    onProfileRatesChange(syncMarketRate(profileRates, rate));
  }

  function closePdfPreview() {
    setPdfPreview((prev) => {
      revokePdfBlobUrl(prev?.url ?? null);
      return null;
    });
  }

  function openPdfPreview(
    doc: ReturnType<typeof buildEstimationPdf>,
    title: string,
    exportLabel: string,
    onExport: () => Promise<void>,
  ) {
    setPdfMessage(null);
    const url = pdfToBlobUrl(doc);
    setPdfPreview((prev) => {
      revokePdfBlobUrl(prev?.url ?? null);
      return { url, title, exportLabel, onExport };
    });
  }

  async function handleViewCostBreakdownPdf() {
    if (!canExportWorkshopPdf) {
      setPdfMessage(
        missingDoorHardware
          ? "Door hardware rate not configured. Open Door Hardware Rates and set missing items before exporting workshop cost PDF."
          : product.validation.blockingMessage ??
              "Fix calculation errors before exporting the cost sheet.",
      );
      return;
    }
    setIsPdfBusy(true);
    try {
      const doc = await buildEstimationCostBreakdownPdfAsync(result, syncedProfileRates);
      openPdfPreview(
        doc,
        `${inputs.customerName || "Customer"} — Cost Calculation Sheet`,
        "Export Cost Sheet",
        handleExportCostBreakdownPdf,
      );
    } catch {
      setPdfMessage("Could not generate cost sheet preview.");
    } finally {
      setIsPdfBusy(false);
    }
  }

  async function handleExportQuotationPdf() {
    if (!canExport) {
      setPdfMessage(
        product.validation.blockingMessage ??
          "Fix calculation errors before exporting the estimation PDF.",
      );
      return;
    }
    setIsPdfBusy(true);
    setPdfMessage(null);
    try {
      await exportEstimationPdf(result);
      setPdfMessage("Quotation PDF downloaded.");
    } catch {
      setPdfMessage("Could not export quotation PDF. Please try again.");
    } finally {
      setIsPdfBusy(false);
    }
  }

  async function handleExportCostBreakdownPdf() {
    if (!canExportWorkshopPdf) {
      setPdfMessage(
        missingDoorHardware
          ? "Door hardware rate not configured. Configure Door Hardware Rates before exporting."
          : product.validation.blockingMessage ??
              "Fix calculation errors before exporting the cost sheet.",
      );
      return;
    }
    setIsPdfBusy(true);
    setPdfMessage(null);
    try {
      await exportEstimationCostBreakdownPdf(result, syncedProfileRates);
      setPdfMessage("Cost calculation PDF downloaded.");
    } catch {
      setPdfMessage("Could not export cost PDF. Please try again.");
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
      const imported = await importEstimationPdf(file);
      onInputsChange(imported);
      onProfileRatesChange(syncMarketRate(profileRates, imported.profileRatePerKg));
      setPdfMessage(
        `Imported estimation for "${imported.customerName || "customer"}".`,
      );
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

  const selected = result.selectedTrack;
  const qty = selected.numberOfWindows;
  const showPdfOnly = activeSection === "workshop-pdf";

  return (
    <PageShell className="flex flex-col gap-6">
      {(show("hero") || showPdfOnly) && !sectionMode ? (
      <PageHero
        icon={Calculator}
        accent="violet"
        title="Workshop Estimation"
        description="Material, labour, overheads, and customer rates with / without GST. Window size syncs with Cutting Calculator tab."
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
              disabled={isPdfBusy || !canExportWorkshopPdf}
              className="hero-action-light"
              onClick={handleViewCostBreakdownPdf}
            >
              <Eye />
              View Cost Sheet
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isPdfBusy || !canExportWorkshopPdf}
              className="hero-action-light"
              onClick={handleExportCostBreakdownPdf}
            >
              <Download />
              Cost Sheet
            </Button>
            <Button type="button" disabled={isPdfBusy || !canExport} onClick={handleExportQuotationPdf}>
              <Download />
              Quotation
            </Button>
          </>
        }
      />
      ) : showPdfOnly ? (
        <div className="flex flex-wrap gap-2 px-4 md:px-8">
            <Button
              type="button"
              variant="outline"
              disabled={isPdfBusy || !canExportWorkshopPdf}
              className="hero-action-light"
              onClick={handleViewCostBreakdownPdf}
            >
              <Eye />
              View Cost Sheet
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isPdfBusy || !canExportWorkshopPdf}
              className="hero-action-light"
              onClick={handleExportCostBreakdownPdf}
            >
              <Download />
              Cost Sheet
            </Button>
            <Button type="button" disabled={isPdfBusy || !canExport} onClick={handleExportQuotationPdf}>
              <Download />
              Quotation
            </Button>
        </div>
      ) : null}

      <PdfPreviewModal
        open={pdfPreview != null}
        title={pdfPreview?.title ?? "PDF Preview"}
        blobUrl={pdfPreview?.url ?? null}
        onClose={closePdfPreview}
        onExport={pdfPreview?.onExport}
        isExporting={isPdfBusy}
        exportLabel={pdfPreview?.exportLabel ?? "Download / Share PDF"}
      />

      {pdfMessage || (isPdfBusy && !pdfPreview) ? (
        <PdfFeedback
          message={pdfMessage}
          isBusy={isPdfBusy && !pdfPreview}
          busyLabel="Preparing PDF…"
        />
      ) : null}

      {!showPdfOnly ? (
      <>
      <CalculationValidationBanner validation={product.validation} />

      {missingDoorHardware && isDoorProduct(inputs) ? (
        <MessageBanner tone="warning">
          Door hardware rate not configured.
          {product.estimation?.missingDoorHardwareRateItems?.length ? (
            <> Missing: {product.estimation.missingDoorHardwareRateItems.join(", ")}.</>
          ) : null}{" "}
          {onOpenDoorHardwareRates ? (
            <button
              type="button"
              className="ml-1 font-semibold underline"
              onClick={onOpenDoorHardwareRates}
            >
              Open Door Hardware Rates
            </button>
          ) : null}
        </MessageBanner>
      ) : null}

      {show("stats") ? (
      <>
      {!sectionMode ? (
      <ProductPreview data={previewData} className="max-w-sm" compact />
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard accent="violet" label="Area / window" value={`${selected.areaSqft} sqft`} />
        <StatCard accent="cyan" label="Workshop cost" value={formatInr(selected.workshopTotal)} />
        <StatCard accent="emerald" label="Rate with GST" value={formatInr(selected.ratePerSqftWithGst)} sublabel="per sqft" />
        <StatCard accent="amber" label="Qty" value={String(qty)} sublabel={selected.trackLabel} />
      </div>
      </>
      ) : null}

      {(show("customer") || show("rates-profile") || show("rates-glass") || show("rates-hardware")) ? (
      <div className="grid gap-6 lg:grid-cols-2">
        {show("customer") ? (
        <AccentCard accent="violet">
          <AccentCardHeader>
            <AccentCardTitle>Customer & window</AccentCardTitle>
            <AccentCardDescription>
              Window size and track are shared with Cutting Calculator.
            </AccentCardDescription>
          </AccentCardHeader>
          <AccentCardContent className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="customer">Customer name</Label>
              <Input
                id="customer"
                value={inputs.customerName}
                onChange={(e) => updateInput("customerName", e.target.value)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={inputs.location}
                onChange={(e) => updateInput("location", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Width (ft / in)</Label>
              <div className="flex gap-2">
                <Input
                  inputMode="decimal"
                  value={String(inputs.widthFeet)}
                  onChange={(e) => updateNumber("widthFeet", e.target.value)}
                />
                <Input
                  inputMode="decimal"
                  value={String(inputs.widthInches)}
                  onChange={(e) => updateNumber("widthInches", e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Height (ft / in)</Label>
              <div className="flex gap-2">
                <Input
                  inputMode="decimal"
                  value={String(inputs.heightFeet)}
                  onChange={(e) => updateNumber("heightFeet", e.target.value)}
                />
                <Input
                  inputMode="decimal"
                  value={String(inputs.heightInches)}
                  onChange={(e) => updateNumber("heightInches", e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="num-windows">No. of windows (same size)</Label>
              <Input
                id="num-windows"
                inputMode="numeric"
                min={1}
                value={String(inputs.numberOfWindows)}
                onChange={(e) => updateNumber("numberOfWindows", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Track type</Label>
              <Select
                value={inputs.trackSystemId}
                onValueChange={(value) =>
                  updateInput("trackSystemId", value as TrackSystemId)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(TRACK_LABELS) as TrackSystemId[]).map((id) => (
                    <SelectItem key={id} value={id}>
                      {TRACK_LABELS[id]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Lock type</Label>
              <Select
                value={inputs.lockType}
                onValueChange={(value) =>
                  updateInput("lockType", value as EstimationInputs["lockType"])
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Handle Lock">Handle Lock</SelectItem>
                  <SelectItem value="Button Lock">Button Lock</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Glass size</Label>
              <Select
                value={inputs.glassSize}
                onValueChange={(value) =>
                  updateInput("glassSize", value as EstimationInputs["glassSize"])
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3mm">3mm</SelectItem>
                  <SelectItem value="3.5mm">3.5mm</SelectItem>
                  <SelectItem value="5mm">5mm</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-xl border border-violet-200 bg-gradient-to-r from-violet-50 to-indigo-50 px-3 py-2.5 text-sm font-medium text-violet-900 sm:col-span-2">
              Area / window: <strong>{selected.areaSqft} sqft</strong> · Size:{" "}
              {selected.widthMm} × {selected.heightMm} mm · Qty: {qty}
            </div>
          </AccentCardContent>
        </AccentCard>
        ) : null}

        {(show("rates-profile") || show("rates-glass") || show("rates-hardware")) ? (
        <AccentCard accent="amber">
          <AccentCardHeader>
            <AccentCardTitle>Editable rates</AccentCardTitle>
            <AccentCardDescription>
              Change any rate — estimation recalculates instantly.
            </AccentCardDescription>
          </AccentCardHeader>
          <AccentCardContent className="grid gap-3 sm:grid-cols-2">
            {show("rates-profile")
              ? (
              [
                ["profileRatePerKg", "Profile rate / kg (₹)"],
                ["labourRatePerSqft", "Labour / sqft (₹)"],
                ["screwRatePerWindow", "Screw / window (₹)"],
                ["brushRubberRatePerFt", "Brush rubber / ft (₹)"],
                ["steelReinforcementRatePerFt", "Steel reinforcement / ft (₹)"],
                ["bearingRatePerPiece", "Bearing / piece (₹)"],
                ["bearingSteelTrackRatePerFt", "Bearing steel track / ft (₹)"],
                ["wastagePercent", "Wastage %"],
                ["profitMarginPercent", "Profit margin %"],
                ["gstPercent", "GST %"],
                ["withoutGstLoadingPercent", "Without GST loading %"],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="space-y-2">
                <Label>{label}</Label>
                <Input
                  inputMode="decimal"
                  value={String(inputs[key])}
                  onChange={(e) => {
                    if (key === "profileRatePerKg") {
                      handleProfileRateChange(e.target.value);
                    } else {
                      updateNumber(key, e.target.value);
                    }
                  }}
                />
              </div>
            ))
              : null}
            {show("rates-hardware") ? (
              <>
            {show("door-hardware-rates") ? (
              <div className="sm:col-span-2">
                <DoorHardwareRatesTab
                  settings={doorHardwareMaster}
                  onChange={onDoorHardwareMasterChange}
                  activeSection="hardware"
                />
              </div>
            ) : isDoorProduct(inputs) ? (
              <div className="sm:col-span-2 rounded-xl border border-indigo-200 bg-indigo-50/50 p-3 text-sm text-indigo-900">
                Door espag, keeps, handles, hinges and shoot bolt rates are managed in{" "}
                {onOpenDoorHardwareRates ? (
                  <button
                    type="button"
                    className="font-semibold underline"
                    onClick={onOpenDoorHardwareRates}
                  >
                    Door Hardware Rates
                  </button>
                ) : (
                  "Profiles → Door Hardware Rates"
                )}
                . Window lock and screw rates remain below.
              </div>
            ) : null}
            <div className="space-y-2">
              <Label>Other hardware / window (₹)</Label>
              <Input
                inputMode="decimal"
                value={String(inputs.otherHardwareCostPerWindow)}
                onChange={(e) => updateNumber("otherHardwareCostPerWindow", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Handle lock / piece (₹)</Label>
              <Input
                inputMode="decimal"
                value={String(inputs.lockRates.handleLockRate)}
                onChange={(e) =>
                  onInputsChange({
                    ...inputs,
                    lockRates: {
                      ...inputs.lockRates,
                      handleLockRate: parseNumber(
                        e.target.value,
                        inputs.lockRates.handleLockRate,
                      ),
                    },
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Button lock / piece (₹)</Label>
              <Input
                inputMode="decimal"
                value={String(inputs.lockRates.buttonLockRate)}
                onChange={(e) =>
                  onInputsChange({
                    ...inputs,
                    lockRates: {
                      ...inputs.lockRates,
                      buttonLockRate: parseNumber(
                        e.target.value,
                        inputs.lockRates.buttonLockRate,
                      ),
                    },
                  })
                }
              />
            </div>
              </>
            ) : null}
            {show("rates-glass")
              ? (
              <>
            <div className="space-y-2">
              <Label>Jaali / net / sqft (₹)</Label>
              <Input
                inputMode="decimal"
                value={String(inputs.jaaliRatePerSqft)}
                onChange={(e) => updateNumber("jaaliRatePerSqft", e.target.value)}
              />
            </div>
            {(["3mm", "3.5mm", "5mm"] as const).map((size) => (
              <div key={size} className="space-y-2">
                <Label>Glass {size} / sqft (₹)</Label>
                <Input
                  inputMode="decimal"
                  value={String(inputs.glassRates[size])}
                  onChange={(e) => updateGlassRate(size, e.target.value)}
                />
              </div>
            ))}
              </>
            )
              : null}
          </AccentCardContent>
        </AccentCard>
        ) : null}
      </div>
      ) : null}

      {show("overheads") ? (
      <AccentCard accent="cyan">
        <AccentCardHeader>
          <AccentCardTitle>Workshop overheads</AccentCardTitle>
          <AccentCardDescription>
            Labour, transport, electricity, rent, and other fixed costs per window.
          </AccentCardDescription>
        </AccentCardHeader>
        <AccentCardContent className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <div className="space-y-2">
            <Label>Labour (auto)</Label>
            <Input
              readOnly
              value={formatInr(selected.labourTotal).replace("₹", "")}
              className="border-cyan-100 bg-cyan-50/50 font-semibold text-cyan-900"
            />
          </div>
          {OVERHEAD_FIELDS.map(({ key, label }) => (
            <div key={key} className="space-y-2">
              <Label>{label} (₹)</Label>
              <Input
                inputMode="decimal"
                value={String(inputs.overheads[key])}
                onChange={(e) => updateOverhead(key, e.target.value)}
              />
            </div>
          ))}
        </AccentCardContent>
      </AccentCard>
      ) : null}

      {(show("breakdown-materials") || show("running-feet") || show("breakdown-totals")) ? (
      <AccentCard accent="indigo">
        <AccentCardHeader>
          <AccentCardTitle>
            Estimation — {selected.trackLabel} ({selected.areaSqft} sqft)
          </AccentCardTitle>
          <AccentCardDescription>Per window breakdown</AccentCardDescription>
        </AccentCardHeader>
        <AccentCardContent className="space-y-8">
          {show("breakdown-materials") ? (
          <section>
            <SectionLabel accent="violet">Material components</SectionLabel>
            <DataTable className="mt-3 min-w-[40rem]">
              <DataTableHead>
                <th className="px-4 py-3">Component</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Notes</th>
              </DataTableHead>
              <tbody>
                {selected.materials.map((item) => (
                  <tr key={item.key} className="border-b border-indigo-50 last:border-0">
                    <td className="px-4 py-2.5 font-medium">{item.label}</td>
                    <td className="px-4 py-2.5 font-mono font-semibold text-indigo-700">
                      {formatInr(item.amount)}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{item.note}</td>
                  </tr>
                ))}
                <tr className="bg-indigo-50/60 font-semibold">
                  <td className="px-4 py-2.5">Material total</td>
                  <td className="px-4 py-2.5 font-mono text-indigo-800">
                    {formatInr(selected.materialTotal)}
                  </td>
                  <td className="px-4 py-2.5" />
                </tr>
              </tbody>
            </DataTable>
          </section>
          ) : null}

          {show("running-feet") ? (
          <section>
            <SectionLabel accent="cyan">Running feet summary</SectionLabel>
            <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {(
                [
                  ["Frame", selected.runningFeet.frameFt, "cyan"],
                  ["Sash", selected.runningFeet.sashFt, "blue"],
                  ["Interlock", selected.runningFeet.interlockFt, "violet"],
                  ["Beading", selected.runningFeet.beadingFt, "emerald"],
                  ["Steel", selected.runningFeet.steelFt, "orange"],
                  ["Total UPVC", selected.runningFeet.totalUpvcFt, "indigo"],
                  ["With wastage", selected.runningFeet.totalUpvcFtWithWastage, "amber"],
                  ["Perimeter", selected.runningFeet.perimeterFt, "rose"],
                ] as const
              ).map(([label, value, accent]) => (
                <StatCard
                  key={label}
                  accent={accent}
                  label={label}
                  value={`${value.toFixed(2)} ft`}
                />
              ))}
            </dl>
          </section>
          ) : null}

          {show("breakdown-totals") ? (
          <section>
            <SectionLabel accent="emerald">Workshop cost & customer rate</SectionLabel>
            <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(
                [
                  ["Workshop total", selected.workshopTotal, "violet"],
                  ["Cost / sqft", selected.costPerSqft, "cyan"],
                  ["Profit amount", selected.profitAmount, "amber"],
                  ["Base rate / sqft", selected.baseRatePerSqftAfterProfit, "emerald"],
                  ["GST total", selected.totalGstAmount, "rose"],
                  ["Rate with GST", selected.ratePerSqftWithGst, "indigo"],
                  ["Rate without GST", selected.ratePerSqftWithoutGst, "orange"],
                  ["Final with GST", selected.finalAmountWithGst, "blue"],
                  ["Final without GST", selected.finalAmountWithoutGst, "violet"],
                ] as const
              ).map(([label, value, accent]) => (
                <StatCard
                  key={label}
                  accent={accent}
                  label={label}
                  value={formatInr(value)}
                />
              ))}
            </dl>
          </section>
          ) : null}
        </AccentCardContent>
      </AccentCard>
      ) : null}

      {show("order-total") && qty > 1 ? (
        <AccentCard accent="emerald">
          <AccentCardHeader>
            <AccentCardTitle>Order total — {qty} windows</AccentCardTitle>
            <AccentCardDescription>
              Same size × {qty} pcs. All values multiplied by quantity.
            </AccentCardDescription>
          </AccentCardHeader>
          <AccentCardContent>
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {(
                [
                  ["Workshop total × qty", selected.orderWorkshopTotal, "violet"],
                  ["GST total × qty", selected.orderGstAmount, "rose"],
                  ["Final with GST", selected.orderFinalAmountWithGst, "emerald"],
                  ["Final without GST", selected.orderFinalAmountWithoutGst, "amber"],
                ] as const
              ).map(([label, value, accent]) => (
                <StatCard key={label} accent={accent} label={label} value={formatInr(value)} />
              ))}
            </dl>
          </AccentCardContent>
        </AccentCard>
      ) : null}
      </>
      ) : null}
    </PageShell>
  );
}
