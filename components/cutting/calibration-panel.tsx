"use client";

import { useMemo, useRef, useState } from "react";
import { Download, SlidersHorizontal, Upload } from "lucide-react";

import {
  applyCalibrationAdjustments,
  buildVerificationRows,
  calculateAllCuts,
  compareWithinTolerance,
  CUTTING_METHOD_LABELS,
  createDefaultCuttingOptions,
  ensureSarikPresetApplied,
  exportCalibrationPdf,
  getMethodLabel,
  importCalibrationPdf,
  runCalibration,
  TRACK_SYSTEM_LIST,
  type CalibrationInput,
  type CuttingMethod,
  type CuttingOptions,
  type TrackSystemId,
} from "@/lib/cutting";
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
} from "@/components/workshop/workshop-ui";

type CalibrationPanelProps = {
  defaultTrackId?: TrackSystemId;
  options: CuttingOptions;
  onOptionsChange: (options: CuttingOptions) => void;
};

function parseNumber(value: string, fallback = 0): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const EMPTY_SARIK_CALIBRATION: CalibrationInput = {
  sampleWidthMm: 1187,
  sampleHeightMm: 1208,
  actualFrameCutWidth: 1193,
  actualFrameCutHeight: 1213,
  actualFrameWidth: 1188,
  actualFrameHeight: 1208,
  actualSashTopCut: 0,
  actualSashSideCut: 0,
  actualSashTop: 0,
  actualSashSide: 0,
  actualInterlock: 0,
  actualGlassWidth: 0,
  actualGlassHeight: 0,
};

const EMPTY_CALIBRATION: CalibrationInput = {
  sampleWidthMm: 2380,
  sampleHeightMm: 2048,
  actualFrameWidth: 2385,
  actualFrameHeight: 2053,
  actualSashTop: 1072,
  actualSashSide: 1950,
  actualInterlock: 1950,
  actualGlassWidth: 1069.5,
  actualGlassHeight: 1840,
};

export function CalibrationPanel({
  defaultTrackId = "2-track-t60",
  options,
  onOptionsChange,
}: CalibrationPanelProps) {
  const [trackId, setTrackId] = useState<TrackSystemId>(defaultTrackId);
  const [localOptions, setLocalOptions] = useState<CuttingOptions>(options);
  const [prevOptions, setPrevOptions] = useState(options);
  const [prevTrackId, setPrevTrackId] = useState(defaultTrackId);

  if (options !== prevOptions) {
    setPrevOptions(options);
    setLocalOptions(options);
  }
  if (defaultTrackId !== prevTrackId) {
    setPrevTrackId(defaultTrackId);
    setTrackId(defaultTrackId);
  }

  const method = localOptions.cuttingMethod;
  const [calibration, setCalibration] = useState<CalibrationInput>(EMPTY_CALIBRATION);
  const [pdfMessage, setPdfMessage] = useState<string | null>(null);
  const [isPdfBusy, setIsPdfBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleExportPdf() {
    setIsPdfBusy(true);
    setPdfMessage(null);
    try {
      await exportCalibrationPdf({
        trackId,
        options: localOptions,
        calibration,
      });
      setPdfMessage("Calibration PDF downloaded.");
    } catch {
      setPdfMessage("Could not export calibration PDF.");
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
      const doc = await importCalibrationPdf(file);
      setTrackId(doc.trackId);
      setLocalOptions(doc.options);
      onOptionsChange(doc.options);
      setCalibration(doc.calibration);
      setPdfMessage("Calibration data imported from PDF.");
    } catch (error) {
      setPdfMessage(
        error instanceof Error ? error.message : "Could not import calibration PDF.",
      );
    } finally {
      setIsPdfBusy(false);
    }
  }

  const isSarik = localOptions.cuttingMethod === "sarik";
  const isWorkshop = localOptions.cuttingMethod === "workshop-confirmed";
  const canApplyAdjustments = isWorkshop;

  const result = useMemo(
    () => runCalibration(calibration, localOptions),
    [calibration, localOptions],
  );

  const verificationRows = useMemo(() => {
    const expected: Record<string, number> = isSarik
      ? {
          frameCutWidth: calibration.actualFrameCutWidth ?? calibration.actualFrameWidth,
          frameCutHeight: calibration.actualFrameCutHeight ?? calibration.actualFrameHeight,
          frameWidth: calibration.actualFrameWidth,
          frameHeight: calibration.actualFrameHeight,
          sashTopCut: calibration.actualSashTopCut ?? calibration.actualSashTop,
          sashSideCut: calibration.actualSashSideCut ?? calibration.actualSashSide,
          sashTop: calibration.actualSashTop,
          sashSide: calibration.actualSashSide,
          interlock: calibration.actualInterlock,
          glassWidth: calibration.actualGlassWidth,
          glassHeight: calibration.actualGlassHeight,
        }
      : {
          frameWidth: calibration.actualFrameWidth,
          frameHeight: calibration.actualFrameHeight,
          sashTop: calibration.actualSashTop,
          sashSide: calibration.actualSashSide,
          interlock: calibration.actualInterlock,
          glassWidth: calibration.actualGlassWidth,
          glassHeight: calibration.actualGlassHeight,
        };
    return buildVerificationRows(
      result.calculated as Record<string, number>,
      expected,
    );
  }, [result, calibration, isSarik]);

  function updateCalibration<K extends keyof CalibrationInput>(
    key: K,
    value: string,
  ) {
    setCalibration((current) => ({
      ...current,
      [key]: parseNumber(value, current[key] as number),
    }));
  }

  function handleApplyAdjustments() {
    const next = applyCalibrationAdjustments(localOptions, result.suggestedAdjustments);
    setLocalOptions(next);
    onOptionsChange(next);
  }

  function handleMethodChange(nextMethod: CuttingMethod) {
    const next = createDefaultCuttingOptions(trackId, nextMethod);
    setLocalOptions(nextMethod === "sarik" ? ensureSarikPresetApplied(next, trackId) : next);
    if (nextMethod === "sarik") {
      setCalibration(EMPTY_SARIK_CALIBRATION);
    } else if (nextMethod === "workshop-confirmed") {
      setCalibration(EMPTY_CALIBRATION);
    }
  }

  return (
    <PageShell className="flex flex-col gap-6">
      <PageHero
        icon={SlidersHorizontal}
        accent="amber"
        title="Calibration"
        description="Compare calculated vs actual workshop cuts. Apply deduction adjustments for Workshop Confirmed or Sarik Method."
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
            <Button type="button" disabled={isPdfBusy} onClick={handleExportPdf}>
              <Download />
              Export PDF
            </Button>
          </>
        }
      />

      {pdfMessage ? <MessageBanner tone="success">{pdfMessage}</MessageBanner> : null}

      <AccentCard accent="amber">
        <AccentCardHeader>
          <AccentCardTitle>Profile & method</AccentCardTitle>
          <AccentCardDescription>
            Cutting method: {getMethodLabel(localOptions.cuttingMethod)}
          </AccentCardDescription>
        </AccentCardHeader>
        <AccentCardContent className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Track</Label>
            <Select
              value={trackId}
              onValueChange={(v) => {
                const id = v as TrackSystemId;
                setTrackId(id);
                setLocalOptions(createDefaultCuttingOptions(id, method));
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRACK_SYSTEM_LIST.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Cutting method</Label>
            <Select
              value={method}
              onValueChange={(v) => handleMethodChange(v as CuttingMethod)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(CUTTING_METHOD_LABELS) as CuttingMethod[]).map((m) => (
                  <SelectItem key={m} value={m}>
                    {CUTTING_METHOD_LABELS[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </AccentCardContent>
      </AccentCard>

      <AccentCard accent="cyan">
        <AccentCardHeader>
          <AccentCardTitle>Sample vs actual</AccentCardTitle>
          <AccentCardDescription>
            Enter opening size and actual cuts measured on the shop floor.
          </AccentCardDescription>
        </AccentCardHeader>
        <AccentCardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="sm:col-span-2 lg:col-span-3">
            <MessageBanner tone="info">
              {isSarik ? (
                <>
                  Enter <strong>site size</strong>, actual <strong>frame cutting before welding</strong>,
                  actual <strong>frame after welding</strong>, sash cut/after-weld, interlock, and glass sizes.
                </>
              ) : (
                <>
                  Enter <strong>final welded</strong> sash / interlock / glass sizes measured on the
                  floor and the <strong>cut frame</strong> size (labour&apos;s L × H + 5 mm).
                </>
              )}
            </MessageBanner>
          </div>
          {(
            isSarik
              ? ([
                  ["sampleWidthMm", "Site width mm"],
                  ["sampleHeightMm", "Site height mm"],
                  ["actualFrameCutWidth", "Actual frame cutting width (before welding)"],
                  ["actualFrameCutHeight", "Actual frame cutting height (before welding)"],
                  ["actualFrameWidth", "Actual frame width after welding"],
                  ["actualFrameHeight", "Actual frame height after welding"],
                  ["actualSashTopCut", "Actual sash top cutting (before welding)"],
                  ["actualSashSideCut", "Actual sash side cutting (before welding)"],
                  ["actualSashTop", "Actual sash top after welding"],
                  ["actualSashSide", "Actual sash side after welding"],
                  ["actualInterlock", "Actual interlock mm"],
                  ["actualGlassWidth", "Actual glass width mm"],
                  ["actualGlassHeight", "Actual glass height mm"],
                ] as const)
              : ([
                  ["sampleWidthMm", "Sample width mm"],
                  ["sampleHeightMm", "Sample height mm"],
                  ["actualFrameWidth", "Actual frame CUT width mm (after +5)"],
                  ["actualFrameHeight", "Actual frame CUT height mm (after +5)"],
                  ["actualSashTop", "Actual sash top/bottom mm (welded)"],
                  ["actualSashSide", "Actual sash side mm (welded)"],
                  ["actualInterlock", "Actual interlock mm (welded)"],
                  ["actualGlassWidth", "Actual glass width mm"],
                  ["actualGlassHeight", "Actual glass height mm"],
                ] as const)
          ).map(([key, label]) => (
            <div key={key} className="space-y-2">
              <Label>{label}</Label>
              <Input
                inputMode="decimal"
                value={String(calibration[key] ?? "")}
                onChange={(e) => updateCalibration(key, e.target.value)}
              />
            </div>
          ))}
        </AccentCardContent>
      </AccentCard>

      <AccentCard accent="indigo">
        <AccentCardHeader>
          <AccentCardTitle>Difference & suggested adjustments</AccentCardTitle>
        </AccentCardHeader>
        <AccentCardContent className="space-y-6">
          <SectionLabel accent="violet">Calculated vs actual</SectionLabel>
          <DataTable className="min-w-[40rem]">
            <DataTableHead>
              <th className="px-4 py-3">Cut</th>
              <th className="px-4 py-3">Calculated</th>
              <th className="px-4 py-3">Actual</th>
              <th className="px-4 py-3">Diff mm</th>
              <th className="px-4 py-3">Status</th>
            </DataTableHead>
            <tbody>
              {verificationRows.map((row) => (
                <tr key={row.label} className="border-b border-indigo-50">
                  <td className="px-4 py-2 font-medium">{row.label}</td>
                  <td className="px-4 py-2 font-mono">{row.calculated.toFixed(1)}</td>
                  <td className="px-4 py-2 font-mono">{row.expected.toFixed(1)}</td>
                  <td className="px-4 py-2 font-mono">{row.diff.toFixed(1)}</td>
                  <td className="px-4 py-2">
                    <span
                      className={
                        row.ok
                          ? "font-semibold text-emerald-700"
                          : "font-semibold text-rose-700"
                      }
                    >
                      {row.ok ? "OK" : "Check"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>

          {canApplyAdjustments ? (
            <>
              <SectionLabel accent="amber">
                {isSarik ? "Suggested Sarik deduction changes" : "Suggested workshop deduction changes"}
              </SectionLabel>
              <dl className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {Object.entries(result.suggestedAdjustments).map(([key, value]) => (
                  <div key={key} className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                    <dt className="text-muted-foreground">{key}</dt>
                    <dd className="font-mono font-semibold">{String(value)}</dd>
                  </div>
                ))}
              </dl>
              <Button type="button" onClick={handleApplyAdjustments}>
                {isSarik
                  ? "Apply adjustment to Sarik Method values"
                  : "Apply adjustment to Workshop Confirmed values"}
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Switch to Workshop Confirmed Method to apply automatic deduction adjustments. Sarik Method uses fixed formulas.
            </p>
          )}
        </AccentCardContent>
      </AccentCard>
    </PageShell>
  );
}

export function verifyWorkshopSample(options: CuttingOptions): ReturnType<typeof buildVerificationRows> {
  const cuts = calculateAllCuts(
    { widthMm: 2380, heightMm: 2048 },
    options,
  );
  const expected = {
    frameWidth: 2385,
    frameHeight: 2053,
    sashTop: 1074.5,
    sashSide: 1950,
    interlock: 1950,
    glassWidth: 1069.5,
    glassHeight: 1840,
  };
  return buildVerificationRows(
    {
      frameWidth: cuts.frameWidth,
      frameHeight: cuts.frameHeight,
      sashTop: cuts.sashTop,
      sashSide: cuts.sashSide,
      interlock: cuts.interlock,
      glassWidth: cuts.glassWidth,
      glassHeight: cuts.glassHeight,
    },
    expected,
  );
}

export { compareWithinTolerance };
