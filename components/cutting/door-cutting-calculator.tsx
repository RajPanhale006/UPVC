"use client";

import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { Download, Eye, Ruler } from "lucide-react";

import { CalculationValidationBanner } from "@/components/calculations/calculation-validation-banner";
import {
  buildDoorPreviewData,
  ProductPreview,
} from "@/components/product-preview";
import {
  applyDoorConfigurationDefaults,
  buildDoorCuttingPdfAsync,
  DOOR_CONFIGURATION_LABELS,
  DOOR_METHOD_LABEL,
  DOOR_OPENING_DIRECTION_LABELS,
  DOOR_OPENING_SIDE_LABELS,
  DOOR_PROFILE_CODES,
  exportDoorCuttingPdf,
  formatDoorHardwareSummary,
  type DoorConfiguration,
  type DoorCuttingOptions,
  type DoorOpeningDirection,
  type DoorOpeningSide,
} from "@/lib/cutting/door";
import {
  areaFromFeetInchesFields,
  calculateDoorProduct,
} from "@/lib/calculations";
import {
  feetInchesToMm,
  mmToFeetInches,
  normalizeMm,
  type EstimationInputs,
} from "@/lib/estimation";
import { pdfToBlobUrl, revokePdfBlobUrl } from "@/lib/pdf/preview";
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
import type { CuttingJobMeta } from "@/lib/summary";
import type { CuttingContentMode } from "@/lib/module-menu";

type DoorCuttingCalculatorProps = {
  estimationInputs: EstimationInputs;
  onEstimationInputsChange: (inputs: EstimationInputs) => void;
  doorOptions: DoorCuttingOptions;
  onDoorOptionsChange: Dispatch<SetStateAction<DoorCuttingOptions>>;
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
  if (widthMm <= 0 || heightMm <= 0) return "Door Job";
  return `${formatMm(widthMm)} × ${formatMm(heightMm)} mm`;
}

export function DoorCuttingCalculator({
  estimationInputs,
  onEstimationInputsChange,
  doorOptions,
  onDoorOptionsChange,
  cuttingJobMeta,
  onCuttingJobMetaChange,
  contentMode = "full",
}: DoorCuttingCalculatorProps) {
  const jobNameManualRef = useRef(false);
  const { jobName, jobNotes, windowLocation: doorLocation } = cuttingJobMeta;
  const setJobName = (value: string) =>
    onCuttingJobMetaChange((current) => ({ ...current, jobName: value }));
  const setJobNotes = (value: string) =>
    onCuttingJobMetaChange((current) => ({ ...current, jobNotes: value }));
  const setDoorLocation = (value: string) =>
    onCuttingJobMetaChange((current) => ({ ...current, windowLocation: value }));

  const [pdfMessage, setPdfMessage] = useState<string | null>(null);
  const [isPdfBusy, setIsPdfBusy] = useState(false);
  const [pdfPreview, setPdfPreview] = useState<{ url: string; title: string } | null>(null);

  const qty = Math.max(1, estimationInputs.numberOfWindows || 1);
  const widthMm = feetInchesToMm(
    estimationInputs.widthFeet,
    estimationInputs.widthInches,
  );
  const heightMm = feetInchesToMm(
    estimationInputs.heightFeet,
    estimationInputs.heightInches,
  );

  useEffect(() => {
    if (!jobNameManualRef.current) {
      setJobName(formatJobName(widthMm, heightMm));
    }
  }, [widthMm, heightMm]);

  const doorCalc = useMemo(
    () =>
      calculateDoorProduct({
        widthMm,
        heightMm,
        quantity: qty,
        areaSqFt: areaFromFeetInchesFields(
          estimationInputs.widthFeet,
          estimationInputs.widthInches,
          estimationInputs.heightFeet,
          estimationInputs.heightInches,
        ),
        doorSettings: doorOptions,
      }),
    [
      widthMm,
      heightMm,
      qty,
      doorOptions,
      estimationInputs.widthFeet,
      estimationInputs.widthInches,
      estimationInputs.heightFeet,
      estimationInputs.heightInches,
    ],
  );

  const result = doorCalc.cutting;

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

  function handleConfigurationChange(configuration: DoorConfiguration) {
    onDoorOptionsChange((current) =>
      applyDoorConfigurationDefaults(current, configuration),
    );
  }

  function updateHardware(
    patch: Partial<DoorCuttingOptions["hardware"]>,
  ) {
    onDoorOptionsChange((current) => ({
      ...current,
      hardware: { ...current.hardware, ...patch },
    }));
  }

  function closePdfPreview() {
    setPdfPreview((prev) => {
      revokePdfBlobUrl(prev?.url ?? null);
      return null;
    });
  }

  function buildExportInput() {
    if (!result) return null;
    return {
      exportedAt: new Date().toISOString(),
      jobName,
      jobNotes,
      customerName: estimationInputs.customerName,
      location: estimationInputs.location,
      doorLocation,
      widthMm,
      heightMm,
      numberOfDoors: qty,
      options: doorOptions,
      result,
    };
  }

  async function handleViewPdf() {
    if (!doorCalc.validation.isValid || !result) {
      setPdfMessage(
        doorCalc.validation.blockingMessage ??
          "Enter valid door dimensions first.",
      );
      return;
    }
    const input = buildExportInput();
    if (!input) {
      setPdfMessage("Enter valid door dimensions first.");
      return;
    }
    setPdfMessage(null);
    setIsPdfBusy(true);
    try {
      const doc = await buildDoorCuttingPdfAsync(input);
      const url = pdfToBlobUrl(doc);
      setPdfPreview((prev) => {
        revokePdfBlobUrl(prev?.url ?? null);
        return { url, title: `${jobName} — Door Labour Sheet` };
      });
    } catch {
      setPdfMessage("Could not generate door cutting preview.");
    } finally {
      setIsPdfBusy(false);
    }
  }

  async function handleExportPdf() {
    if (!doorCalc.validation.isValid || !result) {
      setPdfMessage(
        doorCalc.validation.blockingMessage ??
          "Enter valid door dimensions first.",
      );
      return;
    }
    const input = buildExportInput();
    if (!input) {
      setPdfMessage("Enter valid door dimensions first.");
      return;
    }
    setIsPdfBusy(true);
    setPdfMessage(null);
    try {
      await exportDoorCuttingPdf(input);
      setPdfMessage("Door labour PDF shared.");
    } catch {
      setPdfMessage("Could not export PDF. Please try again.");
    } finally {
      setIsPdfBusy(false);
    }
  }

  const components = result?.components;

  const showEntry = contentMode === "full" || contentMode === "entry";
  const showTable = contentMode === "full" || contentMode === "table";
  const showPreviewPanel = contentMode === "full";
  const sectionMode = contentMode !== "full";

  if (contentMode === "preview") {
    return (
      <PageShell>
        <ProductPreview
          data={buildDoorPreviewData({
            widthMm,
            heightMm,
            quantity: qty,
            configuration: doorOptions.configuration,
            openingSide: doorOptions.openingSide,
            openingDirection: doorOptions.openingDirection,
            profileCode: `${DOOR_PROFILE_CODES.frame} / ${DOOR_PROFILE_CODES.sash}`,
            flatMullionMm: components?.flatMullionMm ?? null,
          })}
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      {!sectionMode ? (
      <PageHero
        icon={Ruler}
        accent="violet"
        title="UPVC Door Cutting"
        description="Sarik Door Method — frame, sash, beading and glass cutting sizes."
        actions={
          <>
            <Button type="button" variant="outline" disabled={!result || isPdfBusy} onClick={handleViewPdf}>
              <Eye />
              View PDF
            </Button>
            <Button type="button" disabled={!result || isPdfBusy} onClick={handleExportPdf}>
              <Download />
              Export PDF
            </Button>
          </>
        }
      />
      ) : null}

      {showEntry ? (
      <>
      <CalculationValidationBanner validation={doorCalc.validation} />

      {showPreviewPanel ? (
      <ProductPreview
        data={buildDoorPreviewData({
          widthMm,
          heightMm,
          quantity: qty,
          configuration: doorOptions.configuration,
          openingSide: doorOptions.openingSide,
          openingDirection: doorOptions.openingDirection,
          profileCode: `${DOOR_PROFILE_CODES.frame} / ${DOOR_PROFILE_CODES.sash}`,
          flatMullionMm: components?.flatMullionMm ?? null,
        })}
        className="max-w-md"
      />
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          accent="violet"
          label="Frame cut W × H"
          value={
            components
              ? `${formatMm(components.frame.widthMm)} × ${formatMm(components.frame.heightMm)}`
              : "—"
          }
        />
        <StatCard
          accent="cyan"
          label="Sash cut W × H"
          value={
            components
              ? `${formatMm(components.sash.widthMm)} × ${formatMm(components.sash.heightMm)}`
              : "—"
          }
          sublabel={components ? `${components.sash.quantity} sash` : undefined}
        />
        <StatCard
          accent="blue"
          label="Beading W × H"
          value={
            components
              ? `${formatMm(components.beading.widthMm)} × ${formatMm(components.beading.heightMm)}`
              : "—"
          }
        />
        <StatCard
          accent="emerald"
          label="Glass W × H"
          value={
            components
              ? `${formatMm(components.glass.widthMm)} × ${formatMm(components.glass.heightMm)}`
              : "—"
          }
        />
        {components?.flatMullionMm != null ? (
          <StatCard
            accent="amber"
            label="Flat mullion"
            value={`${formatMm(components.flatMullionMm)} mm`}
          />
        ) : null}
        <StatCard accent="indigo" label="Qty" value={String(qty)} sublabel="doors" />
      </div>

      <AccentCard accent="violet">
        <AccentCardHeader>
          <AccentCardTitle>Job details</AccentCardTitle>
          <AccentCardDescription>
            Shown on the door labour cutting PDF.
          </AccentCardDescription>
        </AccentCardHeader>
        <AccentCardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="door-job-name">Job name</Label>
            <Input
              id="door-job-name"
              value={jobName}
              onChange={(e) => {
                jobNameManualRef.current = true;
                setJobName(e.target.value);
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="door-location">Door location</Label>
            <Input
              id="door-location"
              value={doorLocation}
              onChange={(e) => setDoorLocation(e.target.value)}
              placeholder="e.g. Main entrance, Bedroom"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="door-job-notes">Notes for labours</Label>
            <Input id="door-job-notes" value={jobNotes} onChange={(e) => setJobNotes(e.target.value)} />
          </div>
        </AccentCardContent>
      </AccentCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <AccentCard accent="cyan">
          <AccentCardHeader>
            <AccentCardTitle>Door size & configuration</AccentCardTitle>
            <AccentCardDescription>
              Entered width and height are the final door size.
            </AccentCardDescription>
          </AccentCardHeader>
          <AccentCardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Cutting method</Label>
              <Input value={DOOR_METHOD_LABEL} readOnly className="bg-slate-50" />
            </div>
            <div className="space-y-2">
              <Label>Door configuration</Label>
              <Select
                value={doorOptions.configuration}
                onValueChange={(v) => handleConfigurationChange(v as DoorConfiguration)}
              >
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(DOOR_CONFIGURATION_LABELS) as DoorConfiguration[]).map((key) => (
                    <SelectItem key={key} value={key}>
                      {DOOR_CONFIGURATION_LABELS[key]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Opening side</Label>
                <Select
                  value={doorOptions.openingSide}
                  onValueChange={(v) =>
                    onDoorOptionsChange((c) => ({ ...c, openingSide: v as DoorOpeningSide }))
                  }
                >
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(DOOR_OPENING_SIDE_LABELS) as DoorOpeningSide[]).map((key) => (
                      <SelectItem key={key} value={key}>
                        {DOOR_OPENING_SIDE_LABELS[key]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Opening direction</Label>
                <Select
                  value={doorOptions.openingDirection}
                  onValueChange={(v) =>
                    onDoorOptionsChange((c) => ({
                      ...c,
                      openingDirection: v as DoorOpeningDirection,
                    }))
                  }
                >
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(DOOR_OPENING_DIRECTION_LABELS) as DoorOpeningDirection[]).map(
                      (key) => (
                        <SelectItem key={key} value={key}>
                          {DOOR_OPENING_DIRECTION_LABELS[key]}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Opening direction affects display and hardware notes only — cutting sizes stay the same.
            </p>

            <SectionLabel>Width</SectionLabel>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Feet</Label>
                <Input
                  inputMode="numeric"
                  value={estimationInputs.widthFeet}
                  onChange={(e) => updateFeetInches("width", "feet", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Inches</Label>
                <Input
                  inputMode="decimal"
                  value={estimationInputs.widthInches}
                  onChange={(e) => updateFeetInches("width", "inches", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">mm</Label>
                <Input
                  inputMode="numeric"
                  value={widthMm > 0 ? formatMm(widthMm) : ""}
                  onChange={(e) => updateMm("width", e.target.value)}
                />
              </div>
            </div>

            <SectionLabel>Height</SectionLabel>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Feet</Label>
                <Input
                  inputMode="numeric"
                  value={estimationInputs.heightFeet}
                  onChange={(e) => updateFeetInches("height", "feet", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Inches</Label>
                <Input
                  inputMode="decimal"
                  value={estimationInputs.heightInches}
                  onChange={(e) => updateFeetInches("height", "inches", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">mm</Label>
                <Input
                  inputMode="numeric"
                  value={heightMm > 0 ? formatMm(heightMm) : ""}
                  onChange={(e) => updateMm("height", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>No. of doors</Label>
              <Input
                inputMode="numeric"
                value={qty}
                onChange={(e) =>
                  updateEstimation({
                    numberOfWindows: Math.max(1, Math.floor(parseNumber(e.target.value, 1))),
                  })
                }
              />
            </div>
          </AccentCardContent>
        </AccentCard>

        <AccentCard accent="amber">
          <AccentCardHeader>
            <AccentCardTitle>Hardware</AccentCardTitle>
            <AccentCardDescription>
              Defaults from Sarik — editable per job.
            </AccentCardDescription>
          </AccentCardHeader>
          <AccentCardContent className="grid gap-3 sm:grid-cols-2">
            {doorOptions.configuration === "single" ? (
              <>
                <HardwareField label="Casement Espag" value={doorOptions.hardware.casementEspagQty} onChange={(v) => updateHardware({ casementEspagQty: v })} />
                <HardwareField label="Backset (mm)" value={doorOptions.hardware.espagBacksetMm} onChange={(v) => updateHardware({ espagBacksetMm: v })} />
                <HardwareField label="Espag length (mm)" value={doorOptions.hardware.espagLengthMm} onChange={(v) => updateHardware({ espagLengthMm: v })} />
                <HardwareField label="Casement Keeps" value={doorOptions.hardware.casementKeepsQty} onChange={(v) => updateHardware({ casementKeepsQty: v })} />
                <HardwareField label="Handle sets" value={doorOptions.hardware.handleSetQty} onChange={(v) => updateHardware({ handleSetQty: v })} />
                <HardwareField label="Pin 3D Hinges" value={doorOptions.hardware.pin3dHingesQty} onChange={(v) => updateHardware({ pin3dHingesQty: v })} />
                <HardwareField label="Hinge capacity (kg)" value={doorOptions.hardware.hingeCapacityKg} onChange={(v) => updateHardware({ hingeCapacityKg: v })} />
              </>
            ) : (
              <>
                <HardwareField label="3D Hinges" value={doorOptions.hardware.hinges3dQty} onChange={(v) => updateHardware({ hinges3dQty: v })} />
                <HardwareField label="Espag" value={doorOptions.hardware.casementEspagQty} onChange={(v) => updateHardware({ casementEspagQty: v })} />
                <HardwareField label="Handle sets" value={doorOptions.hardware.handleSetQty} onChange={(v) => updateHardware({ handleSetQty: v })} />
                <HardwareField label="Shoot bolts" value={doorOptions.hardware.shootBoltsQty} onChange={(v) => updateHardware({ shootBoltsQty: v })} />
              </>
            )}
          </AccentCardContent>
        </AccentCard>
      </div>
      </>
      ) : null}

      {showTable && result ? (
        <AccentCard accent="indigo">
          <AccentCardHeader>
            <AccentCardTitle>Labour cutting table</AccentCardTitle>
            <AccentCardDescription>
              {DOOR_PROFILE_CODES.frame} frame · {DOOR_PROFILE_CODES.sash} sash ·{" "}
              {DOOR_PROFILE_CODES.beading} beading
            </AccentCardDescription>
          </AccentCardHeader>
          <AccentCardContent className="overflow-x-auto">
            <DataTable>
              <DataTableHead>
                <tr>
                  <th>Sr</th>
                  <th>Item</th>
                  <th>Profile</th>
                  <th>Qty/Door</th>
                  <th>Cut mm</th>
                  <th>Inch</th>
                  <th>Angle</th>
                  <th>Total Qty</th>
                  <th>Run Ft</th>
                  <th>Notes</th>
                </tr>
              </DataTableHead>
              <tbody>
                {result.tableRows.map((row) => (
                  <tr key={row.srNo}>
                    <td>{row.srNo}</td>
                    <td>{row.item}</td>
                    <td>{row.profileCode}</td>
                    <td>{row.qtyPerWindow}</td>
                    <td>
                      {row.cutSizeCrossMm != null
                        ? `${Math.round(row.cutSizeMm)} × ${Math.round(row.cutSizeCrossMm)}`
                        : Math.round(row.cutSizeMm)}
                    </td>
                    <td>{row.cutSizeInch}</td>
                    <td>{row.cutAngle}</td>
                    <td>{row.totalQty}</td>
                    <td>{row.totalRunningFt.toFixed(2)}</td>
                    <td>{row.notes}</td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">Hardware summary</p>
              <ul className="mt-2 list-inside list-disc space-y-0.5">
                {formatDoorHardwareSummary(doorOptions).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          </AccentCardContent>
        </AccentCard>
      ) : null}

      <PdfPreviewModal
        open={pdfPreview != null}
        title={pdfPreview?.title ?? "Door PDF Preview"}
        blobUrl={pdfPreview?.url ?? null}
        onClose={closePdfPreview}
        onExport={handleExportPdf}
        isExporting={isPdfBusy}
        exportLabel="Download / Share PDF"
      />

      {pdfMessage || (isPdfBusy && !pdfPreview) ? (
        <PdfFeedback message={pdfMessage} isBusy={isPdfBusy && !pdfPreview} />
      ) : null}
    </PageShell>
  );
}

function HardwareField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(parseNumber(e.target.value, 0))}
      />
    </div>
  );
}
