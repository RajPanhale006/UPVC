"use client";

import { useMemo, useState, Fragment } from "react";
import {
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Download,
  Eye,
  Layers,
  Ruler,
  Scale,
  Scissors,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
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
import { CalculationValidationBanner } from "@/components/calculations/calculation-validation-banner";
import { calculateProduct } from "@/lib/calculations";
import type { CuttingOptions } from "@/lib/cutting";
import type { EstimationInputs } from "@/lib/estimation";
import { formatInr, type ProfileRateSettings } from "@/lib/profiles";
import {
  buildSummaryForProduct,
  buildSummaryLabourPdfAsync,
  buildSummaryProfileWeightPdf,
  exportSummaryLabourPdf,
  exportSummaryProfileWeightPdf,
  formatMmPair,
  formatRunFt,
  formatSqft,
  formatWeightKg,
  formatWeightPerFt,
  type CuttingJobMeta,
} from "@/lib/summary";
import { PdfFeedback } from "@/components/pdf/pdf-feedback";
import { PdfPreviewModal } from "@/components/pdf/pdf-preview-modal";
import {
  buildDoorPreviewData,
  buildWindowPreviewData,
  ProductPreview,
} from "@/components/product-preview";
import { pdfToBlobUrl, revokePdfBlobUrl } from "@/lib/pdf/preview";
import { shouldShowSummaryBlock } from "@/lib/module-menu";

import type { DoorHardwareMasterSettings } from "@/lib/door-hardware";

type SummaryTabProps = {
  estimationInputs: EstimationInputs;
  cuttingOptions: CuttingOptions;
  profileRates: ProfileRateSettings;
  doorHardwareMaster?: DoorHardwareMasterSettings;
  cuttingJobMeta: CuttingJobMeta;
  onGoToCutting: () => void;
  onOpenProfiles: () => void;
  activeSection?: string;
};

type SummaryPdfPreview = {
  url: string;
  title: string;
  kind: "labour" | "profileWeight";
};

export function SummaryTab({
  estimationInputs,
  cuttingOptions,
  profileRates,
  doorHardwareMaster,
  cuttingJobMeta,
  onGoToCutting,
  onOpenProfiles,
  activeSection,
}: SummaryTabProps) {
  const [pdfMessage, setPdfMessage] = useState<string | null>(null);
  const [isPdfBusy, setIsPdfBusy] = useState(false);
  const [pdfBusyKind, setPdfBusyKind] = useState<"labour" | "profileWeight">("labour");
  const [pdfPreview, setPdfPreview] = useState<SummaryPdfPreview | null>(null);
  const [expandedProfiles, setExpandedProfiles] = useState<Set<string>>(
    () => new Set(),
  );

  const product = useMemo(
    () =>
      calculateProduct({
        estimationInputs,
        cuttingOptions,
        profileRates,
        cuttingJobMeta,
        doorHardwareMaster,
      }),
    [estimationInputs, cuttingOptions, profileRates, cuttingJobMeta, doorHardwareMaster],
  );

  const summary = useMemo(
    () =>
      buildSummaryForProduct({
        estimationInputs,
        cuttingOptions,
        profileRates,
        cuttingJobMeta,
      }),
    [estimationInputs, cuttingOptions, profileRates, cuttingJobMeta],
  );

  const show = (block: string) => shouldShowSummaryBlock(activeSection, block);
  const sectionMode = Boolean(activeSection);

  const primaryDoor = summary.doors?.[0];
  const primaryWindow = summary.windows[0];

  function toggleProfileBreakdown(id: string) {
    setExpandedProfiles((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function closePdfPreview() {
    setPdfPreview((prev) => {
      revokePdfBlobUrl(prev?.url ?? null);
      return null;
    });
  }

  async function handleViewLabourPdf() {
    if (!product.validation.isValid) {
      setPdfMessage(
        product.validation.blockingMessage ??
          "Fix calculation errors before generating the labour PDF.",
      );
      return;
    }
    if (!summary.hasWindows) {
      setPdfMessage("Enter window sizes in the Cutting tab first.");
      return;
    }

    setPdfMessage(null);
    setIsPdfBusy(true);
    try {
      const doc = await buildSummaryLabourPdfAsync(summary);
      const primaryName =
        summary.doors?.[0]?.name ?? summary.windows[0]?.name ?? "Labour Cutting Sheet";
      const url = pdfToBlobUrl(doc);
      setPdfPreview((prev) => {
        revokePdfBlobUrl(prev?.url ?? null);
        return { url, title: `${primaryName} — Labour Cutting Sheet`, kind: "labour" };
      });
    } catch {
      setPdfMessage("Could not generate labour cutting preview.");
    } finally {
      setIsPdfBusy(false);
    }
  }

  function handleViewProfileWeightPdf() {
    if (!product.validation.isValid) {
      setPdfMessage(
        product.validation.blockingMessage ??
          "Fix calculation errors before generating the profile weight PDF.",
      );
      return;
    }
    if (!summary.hasWindows) {
      setPdfMessage("Enter window sizes in the Cutting tab first.");
      return;
    }

    setPdfMessage(null);
    const doc = buildSummaryProfileWeightPdf(summary);
    const primaryName = summary.windows[0]?.name ?? "Profile Weight Summary";
    const url = pdfToBlobUrl(doc);
    setPdfPreview((prev) => {
      revokePdfBlobUrl(prev?.url ?? null);
      return { url, title: `${primaryName} — Profile Weight Summary`, kind: "profileWeight" };
    });
  }

  async function handleExportLabourPdf() {
    if (!product.validation.isValid) {
      setPdfMessage(
        product.validation.blockingMessage ??
          "Fix calculation errors before exporting the labour PDF.",
      );
      return;
    }
    if (!summary.hasWindows) {
      setPdfMessage("Enter window sizes in the Cutting tab first.");
      return;
    }

    setIsPdfBusy(true);
    setPdfBusyKind("labour");
    setPdfMessage(null);

    try {
      await exportSummaryLabourPdf(summary);
      setPdfMessage("Labour cutting PDF downloaded.");
    } catch {
      setPdfMessage("Could not export PDF. Please try again.");
    } finally {
      setIsPdfBusy(false);
    }
  }

  async function handleExportProfileWeightPdf() {
    if (!product.validation.isValid) {
      setPdfMessage(
        product.validation.blockingMessage ??
          "Fix calculation errors before exporting the profile weight PDF.",
      );
      return;
    }
    if (!summary.hasWindows) {
      setPdfMessage("Enter window sizes in the Cutting tab first.");
      return;
    }

    setIsPdfBusy(true);
    setPdfBusyKind("profileWeight");
    setPdfMessage(null);

    try {
      await exportSummaryProfileWeightPdf(summary);
      setPdfMessage("Profile weight PDF downloaded.");
    } catch {
      setPdfMessage("Could not export PDF. Please try again.");
    } finally {
      setIsPdfBusy(false);
    }
  }

  function handleExportFromPreview() {
    if (pdfPreview?.kind === "profileWeight") {
      setPdfBusyKind("profileWeight");
      return handleExportProfileWeightPdf();
    }
    setPdfBusyKind("labour");
    return handleExportLabourPdf();
  }

  if (!summary.hasWindows) {
    return (
      <PageShell>
        <PageHero
          title="Summary"
          description="Labour cutting sizes and workshop cost at a glance."
          icon={ClipboardList}
        />
        <AccentCard accent="orange">
          <AccentCardHeader>
            <AccentCardTitle>No window details yet</AccentCardTitle>
            <AccentCardDescription>
              No window details are available yet. Enter window sizes in the Cutting tab to
              view the labour cutting sizes and workshop cost summary.
            </AccentCardDescription>
          </AccentCardHeader>
          <AccentCardContent>
            <Button type="button" onClick={onGoToCutting}>
              <Ruler />
              Go to Cutting
            </Button>
          </AccentCardContent>
        </AccentCard>
      </PageShell>
    );
  }

  const { profileCostSummary } = summary;

  return (
    <PageShell>
      {!sectionMode ? (
        <PageHero
          title="Job Summary"
          description="Simple cutting sizes for labour and internal workshop cost overview."
          icon={ClipboardList}
        />
      ) : null}

      <CalculationValidationBanner validation={product.validation} />

      {(show("pdf-labour") || show("pdf-profile")) && (pdfMessage || (isPdfBusy && !pdfPreview)) ? (
        <PdfFeedback
          message={pdfMessage}
          isBusy={isPdfBusy && !pdfPreview}
          busyLabel={
            pdfBusyKind === "profileWeight"
              ? "Preparing profile weight PDF…"
              : "Preparing labour cutting PDF…"
          }
        />
      ) : null}

      <PdfPreviewModal
        open={pdfPreview != null}
        title={pdfPreview?.title ?? "PDF Preview"}
        blobUrl={pdfPreview?.url ?? null}
        onClose={closePdfPreview}
        onExport={handleExportFromPreview}
        isExporting={isPdfBusy}
        exportLabel={
          pdfPreview?.kind === "profileWeight"
            ? "Export Profile Weight PDF"
            : "Export Labour Cutting PDF"
        }
      />

      {show("profile") && profileCostSummary.hasMissingConfig ? (
        <MessageBanner tone="warning">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Some profile weight or rate details are missing. Update them in the Profiles
              tab.
            </span>
            <Button type="button" variant="outline" size="sm" onClick={onOpenProfiles}>
              <Layers />
              Open Profiles
            </Button>
          </div>
        </MessageBanner>
      ) : null}

      {show("overview") || show("preview") ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(300px,360px)]">
          {show("overview") ? (
            <div className="flex flex-col gap-6">
              <SectionLabel>Overview</SectionLabel>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <StatCard
                  accent="violet"
                  label={summary.productKind === "door" ? "Total Doors" : "Total Windows"}
                  value={String(summary.totalWindows)}
                />
                <StatCard
                  accent="cyan"
                  label="Total Area"
                  value={formatSqft(summary.totalAreaSqft)}
                />
                <StatCard
                  accent="indigo"
                  label="Total Profile Weight"
                  value={formatWeightKg(summary.totalProfileWeight)}
                />
                <StatCard
                  accent="blue"
                  label="Total Profile Cost"
                  value={formatInr(summary.totalProfileCost)}
                />
                <StatCard
                  accent="amber"
                  label="Workshop Rate per Sq.ft"
                  value={formatInr(summary.workshopRatePerSqft)}
                  sublabel="per sq.ft"
                />
                <StatCard
                  accent="emerald"
                  label="Total Workshop Cost"
                  value={formatInr(summary.totalWorkshopCost)}
                />
              </div>
            </div>
          ) : (
            <div />
          )}

          {show("preview") ? (
            primaryWindow ? (
              <ProductPreview
                data={buildWindowPreviewData({
                  trackSystemId: primaryWindow.trackSystemId,
                  widthMm: primaryWindow.widthMm,
                  heightMm: primaryWindow.heightMm,
                  cuttingOptions,
                  profileCode: primaryWindow.profileCode,
                  quantity: primaryWindow.quantity,
                })}
                className="xl:sticky xl:top-28 xl:self-start"
              />
            ) : primaryDoor ? (
              <ProductPreview
                data={buildDoorPreviewData({
                  widthMm: primaryDoor.widthMm,
                  heightMm: primaryDoor.heightMm,
                  configuration: primaryDoor.configuration,
                  openingSide: primaryDoor.openingSide,
                  openingDirection: primaryDoor.openingDirection,
                  profileCode: primaryDoor.profileCode,
                  quantity: primaryDoor.quantity,
                  flatMullionMm: primaryDoor.flatMullionMm,
                })}
                className="xl:sticky xl:top-28 xl:self-start"
              />
            ) : null
          ) : null}
        </div>
      ) : null}

      {show("cutting") || show("pdf-labour") ? (
      <AccentCard accent="cyan">
        <AccentCardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <AccentCardTitle className="flex items-center gap-2">
                <Scissors className="size-5 shrink-0" />
                Cutting Size to Give to Labour
              </AccentCardTitle>
              <AccentCardDescription className="mt-1">
                These are the final profile and glass sizes that should be given to the labour
                team for cutting and fabrication.
              </AccentCardDescription>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              {show("pdf-labour") || !sectionMode ? (
                <>
              <Button
                type="button"
                variant="outline"
                disabled={isPdfBusy}
                className="hero-action-light"
                onClick={handleViewLabourPdf}
              >
                <Eye />
                Preview PDF
              </Button>
              <Button
                type="button"
                disabled={isPdfBusy}
                onClick={handleExportLabourPdf}
              >
                <Download />
                Export Labour Cutting PDF
              </Button>
                </>
              ) : null}
            </div>
          </div>
        </AccentCardHeader>
        {show("cutting") ? (
        <AccentCardContent className="space-y-4">
          {summary.windows.map((window) => (
            <div
              key={window.index}
              className="overflow-hidden rounded-2xl border-2 border-cyan-200/70 bg-white/80 shadow-sm"
            >
              <div className="border-b border-cyan-100 bg-gradient-to-r from-cyan-50 to-teal-50 px-4 py-3">
                <p className="text-base font-bold text-cyan-950">{window.name}</p>
                <div className="mt-2 grid gap-1 text-sm text-cyan-900/80 sm:grid-cols-2 lg:grid-cols-3">
                  <p>
                    <span className="font-semibold">Final Window Size:</span>{" "}
                    {formatMmPair(window.widthMm, window.heightMm)}
                  </p>
                  <p>
                    <span className="font-semibold">Quantity:</span> {window.quantity}
                  </p>
                  <p>
                    <span className="font-semibold">Track:</span> {window.trackLabel}
                  </p>
                  <p>
                    <span className="font-semibold">Profile:</span> {window.profileCode}
                  </p>
                  <p>
                    <span className="font-semibold">Method:</span> {window.methodLabel}
                  </p>
                  {window.sashConfigurationLabel ? (
                    <p>
                      <span className="font-semibold">Configuration:</span>{" "}
                      {window.sashConfigurationLabel}
                    </p>
                  ) : null}
                  {window.windowLocation ? (
                    <p>
                      <span className="font-semibold">Location:</span> {window.windowLocation}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="overflow-x-auto p-4">
                <DataTable>
                  <DataTableHead>
                    <tr>
                      <th>Part</th>
                      <th>Quantity</th>
                      <th>Cutting Size</th>
                      <th>Size After Welding</th>
                    </tr>
                  </DataTableHead>
                  <tbody>
                    {window.components.map((row) => (
                      <tr key={row.part}>
                        <td className="font-medium">{row.part}</td>
                        <td>{row.quantity}</td>
                        <td>{row.cuttingSize}</td>
                        <td>{row.afterWeldingSize}</td>
                      </tr>
                    ))}
                  </tbody>
                </DataTable>
              </div>

              {window.details.length > 0 ? (
                <div className="border-t border-cyan-100 px-4 pb-4 pt-2">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-cyan-800">
                    Detailed profile pieces
                  </p>
                  <div className="overflow-x-auto">
                    <DataTable>
                      <DataTableHead>
                        <tr>
                          <th>Component</th>
                          <th>Qty</th>
                          <th>Cutting Size</th>
                          <th>After Welding</th>
                          <th>Angle</th>
                        </tr>
                      </DataTableHead>
                      <tbody>
                        {window.details.map((row) => (
                          <tr key={row.name}>
                            <td className="font-medium">{row.name}</td>
                            <td>{row.qty}</td>
                            <td>{row.cuttingSize}</td>
                            <td>{row.afterWeldingSize}</td>
                            <td>{row.angle}</td>
                          </tr>
                        ))}
                      </tbody>
                    </DataTable>
                  </div>
                </div>
              ) : null}
            </div>
          ))}

          {(summary.doors ?? []).map((door) => (
            <div
              key={`door-${door.index}`}
              className="overflow-hidden rounded-2xl border-2 border-violet-200/70 bg-white/80 shadow-sm"
            >
              <div className="border-b border-violet-100 bg-gradient-to-r from-violet-50 to-indigo-50 px-4 py-3">
                <p className="text-base font-bold text-violet-950">{door.name}</p>
                <div className="mt-2 grid gap-1 text-sm text-violet-900/80 sm:grid-cols-2 lg:grid-cols-3">
                  <p>
                    <span className="font-semibold">Final Door Size:</span>{" "}
                    {formatMmPair(door.widthMm, door.heightMm)}
                  </p>
                  <p>
                    <span className="font-semibold">Quantity:</span> {door.quantity}
                  </p>
                  <p>
                    <span className="font-semibold">Configuration:</span>{" "}
                    {door.configurationLabel}
                  </p>
                  <p>
                    <span className="font-semibold">Profile:</span> {door.profileCode}
                  </p>
                  <p>
                    <span className="font-semibold">Method:</span> {door.methodLabel}
                  </p>
                  {door.flatMullionMm != null ? (
                    <p>
                      <span className="font-semibold">Flat Mullion:</span> {door.flatMullionMm} mm
                    </p>
                  ) : null}
                  {door.doorLocation ? (
                    <p>
                      <span className="font-semibold">Location:</span> {door.doorLocation}
                    </p>
                  ) : null}
                </div>
                <ul className="mt-2 list-inside list-disc text-xs text-violet-800/90">
                  {door.hardwareSummary.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>

              <div className="overflow-x-auto p-4">
                <DataTable>
                  <DataTableHead>
                    <tr>
                      <th>Component</th>
                      <th>Quantity</th>
                      <th>Cutting Size</th>
                      <th>After Welding</th>
                    </tr>
                  </DataTableHead>
                  <tbody>
                    {door.components.map((row) => (
                      <tr key={row.part}>
                        <td className="font-medium">{row.part}</td>
                        <td>{row.quantity}</td>
                        <td>{row.cuttingSize}</td>
                        <td>{row.afterWeldingSize}</td>
                      </tr>
                    ))}
                  </tbody>
                </DataTable>
              </div>

              {door.details.length > 0 ? (
                <div className="border-t border-violet-100 p-4">
                  <p className="mb-2 text-sm font-semibold text-violet-950">Piece-by-piece cutting</p>
                  <div className="overflow-x-auto">
                    <DataTable>
                      <DataTableHead>
                        <tr>
                          <th>Component</th>
                          <th>Qty</th>
                          <th>Cutting Size</th>
                          <th>Angle</th>
                        </tr>
                      </DataTableHead>
                      <tbody>
                        {door.details.map((row) => (
                          <tr key={row.name}>
                            <td className="font-medium">{row.name}</td>
                            <td>{row.qty}</td>
                            <td>{row.cuttingSize}</td>
                            <td>{row.angle}</td>
                          </tr>
                        ))}
                      </tbody>
                    </DataTable>
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </AccentCardContent>
        ) : null}
      </AccentCard>
      ) : null}

      {show("profile") || show("pdf-profile") ? (
      <AccentCard accent="amber">
        <AccentCardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <AccentCardTitle className="flex items-center gap-2">
                <Scale className="size-5 shrink-0" />
                Profile Weight and Cost Summary
              </AccentCardTitle>
              <AccentCardDescription>
                {profileCostSummary.usesBarOptimization
                  ? "Purchase cost from practical 5800 mm bar optimization (legacy "
                  : "Cost calculated using workshop estimation and wastage settings ("}
                {profileCostSummary.usesBarOptimization
                  ? `${profileCostSummary.wastagePercent}% wastage shown for reference only).`
                  : `${profileCostSummary.wastagePercent}% wastage).`}
              </AccentCardDescription>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              {show("pdf-profile") || !sectionMode ? (
                <>
              <Button
                type="button"
                variant="outline"
                disabled={isPdfBusy}
                className="hero-action-light"
                onClick={handleViewProfileWeightPdf}
              >
                <Eye />
                Preview PDF
              </Button>
              <Button
                type="button"
                disabled={isPdfBusy}
                onClick={handleExportProfileWeightPdf}
              >
                <Download />
                Export Profile Weight PDF
              </Button>
                </>
              ) : null}
            </div>
          </div>
        </AccentCardHeader>
        {show("profile") ? (
        <AccentCardContent className="space-y-4">
          <div className="overflow-x-auto">
            <DataTable>
              <DataTableHead>
                <tr>
                  <th>Profile Name</th>
                  <th>Required Run Ft</th>
                  <th>Costing Run Ft</th>
                  <th>Weight</th>
                  <th>Rate per Kg</th>
                  <th>Total Cost</th>
                  <th />
                </tr>
              </DataTableHead>
              <tbody>
                {profileCostSummary.rows.map((row) => {
                  const expanded = expandedProfiles.has(row.id);
                  return (
                    <Fragment key={row.id}>
                      <tr className="border-b border-indigo-50">
                        <td className="px-2 py-3">
                          <p className="font-medium">{row.profileName}</p>
                          <p className="text-xs text-muted-foreground">{row.profileCode}</p>
                        </td>
                        <td className="px-2 py-3 font-mono">{formatRunFt(row.requiredRunFt)}</td>
                        <td className="px-2 py-3 font-mono">{formatRunFt(row.costingRunFt)}</td>
                        <td className="px-2 py-3">
                          {row.isSteel ? (
                            <span className="text-muted-foreground">N/A</span>
                          ) : row.missingWeight ? (
                            <span className="font-medium text-amber-700">Weight not configured</span>
                          ) : row.totalWeight != null ? (
                            <span className="font-mono">{formatWeightKg(row.totalWeight)}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                          {!row.isSteel && row.weightPerFt != null && row.weightPerFt > 0 ? (
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {formatWeightPerFt(row.weightPerFt)}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-2 py-3">
                          {row.isSteel ? (
                            row.missingRate ? (
                              <span className="font-medium text-amber-700">Rate not configured</span>
                            ) : (
                              <span className="font-mono">
                                {formatInr(row.ratePerFt ?? 0)} / ft
                              </span>
                            )
                          ) : row.missingRate ? (
                            <span className="font-medium text-amber-700">Rate not configured</span>
                          ) : (
                            <span className="font-mono">{formatInr(row.ratePerKg ?? 0)}</span>
                          )}
                        </td>
                        <td className="px-2 py-3 font-mono font-semibold">
                          {row.missingRate || (!row.isSteel && row.missingWeight)
                            ? "—"
                            : formatInr(row.totalCost)}
                        </td>
                        <td className="px-2 py-3">
                          {row.breakdown.length > 0 ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-xs"
                              onClick={() => toggleProfileBreakdown(row.id)}
                            >
                              {expanded ? <ChevronUp /> : <ChevronDown />}
                              {expanded ? "Hide" : "View Breakdown"}
                            </Button>
                          ) : null}
                        </td>
                      </tr>
                      {expanded && row.breakdown.length > 0 ? (
                        <tr key={`${row.id}-breakdown`} className="bg-amber-50/40">
                          <td colSpan={7} className="px-4 py-3">
                            <div className="overflow-x-auto rounded-xl border border-amber-100 bg-white/80">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b border-amber-100 text-left text-xs font-bold uppercase tracking-wide text-amber-900">
                                    <th className="px-3 py-2">Cutting Item</th>
                                    <th className="px-3 py-2">Qty</th>
                                    <th className="px-3 py-2">Run Ft</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {row.breakdown.map((item) => (
                                    <tr
                                      key={item.cuttingItem}
                                      className="border-b border-amber-50 last:border-0"
                                    >
                                      <td className="px-3 py-2 font-medium">
                                        {item.cuttingItem}
                                      </td>
                                      <td className="px-3 py-2 font-mono">{item.qty}</td>
                                      <td className="px-3 py-2 font-mono">
                                        {item.runFt.toFixed(2)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </DataTable>
          </div>

          <div className="rounded-2xl border-2 border-amber-300/80 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 p-4 shadow-inner">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-amber-800">
                  Total Required Running Feet
                </p>
                <p className="text-lg font-bold text-amber-950">
                  {formatRunFt(profileCostSummary.totalRequiredRunFt)}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-amber-800">
                  Total Costing Running Feet
                </p>
                <p className="text-lg font-bold text-amber-950">
                  {formatRunFt(profileCostSummary.totalCostingRunFt)}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-amber-800">
                  Total UPVC Weight
                </p>
                <p className="text-lg font-bold text-amber-950">
                  {formatWeightKg(profileCostSummary.totalUpvcWeight)}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-amber-800">
                  Total Profile Cost
                </p>
                <p className="text-xl font-bold text-amber-950">
                  {formatInr(profileCostSummary.totalProfileCost)}
                </p>
              </div>
            </div>
          </div>
        </AccentCardContent>
        ) : null}
      </AccentCard>
      ) : null}

      {show("workshop") ? (
      <AccentCard accent="violet">
        <AccentCardHeader>
          <AccentCardTitle className="flex items-center gap-2">
            <Users className="size-5 shrink-0" />
            Workshop Cost Summary
          </AccentCardTitle>
          <AccentCardDescription>
            This is the approximate internal cost of manufacturing the entered windows in the
            workshop.
          </AccentCardDescription>
        </AccentCardHeader>
        <AccentCardContent className="space-y-4">
          <div className="overflow-x-auto">
            <DataTable>
              <DataTableHead>
                <tr>
                  <th>Window</th>
                  <th>Size</th>
                  <th>Qty</th>
                  <th>Total Area</th>
                  <th>Rate per Sq.ft</th>
                  <th>Workshop Cost</th>
                </tr>
              </DataTableHead>
              <tbody>
                {summary.windows.map((window) => (
                  <tr key={window.index}>
                    <td className="font-medium">{window.name}</td>
                    <td>{formatMmPair(window.widthMm, window.heightMm)}</td>
                    <td>{window.quantity}</td>
                    <td>{formatSqft(window.totalAreaSqft)}</td>
                    <td>{formatInr(window.workshopRatePerSqft)}</td>
                    <td>{formatInr(window.workshopCostTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </div>

          <div className="rounded-2xl border-2 border-violet-300/80 bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 p-4 shadow-inner">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-violet-700">
                  Total Windows
                </p>
                <p className="text-lg font-bold text-violet-950">{summary.totalWindows}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-violet-700">
                  Total Area
                </p>
                <p className="text-lg font-bold text-violet-950">
                  {formatSqft(summary.totalAreaSqft)}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-violet-700">
                  Workshop Rate per Sq.ft
                </p>
                <p className="text-lg font-bold text-violet-950">
                  {formatInr(summary.workshopRatePerSqft)}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-violet-700">
                  Grand Total Workshop Cost
                </p>
                <p className="text-xl font-bold text-violet-950">
                  {formatInr(summary.totalWorkshopCost)}
                </p>
              </div>
              {summary.customerBasePriceAvailable ? (
                <>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-violet-700">
                      Standard Margin
                    </p>
                    <p className="text-lg font-bold text-violet-950">
                      {summary.customerBaseMarginPercent}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-violet-700">
                      Margin Amount
                    </p>
                    <p className="text-lg font-bold text-violet-950">
                      {formatInr(summary.customerBaseMarginAmount ?? 0)}
                    </p>
                  </div>
                  <div className="sm:col-span-2 lg:col-span-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-violet-800">
                      Suggested Customer Base Price
                    </p>
                    <p className="text-2xl font-bold text-violet-950">
                      {formatInr(summary.suggestedCustomerBasePrice ?? 0)}
                    </p>
                    <p className="mt-1 text-xs text-violet-700">
                      Workshop cost plus standard {summary.customerBaseMarginPercent}% margin,
                      before GST and additional charges.
                    </p>
                  </div>
                  <div className="sm:col-span-2 lg:col-span-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-fuchsia-800">
                      Suggested Customer Rate per Sq.ft
                    </p>
                    <p className="text-2xl font-bold text-fuchsia-950">
                      {summary.customerRateAvailable
                        ? `${formatInr(summary.suggestedCustomerRatePerSqFt ?? 0)}/sq.ft`
                        : "—"}
                    </p>
                    <p className="mt-1 text-xs text-fuchsia-700">
                      Recommended customer base rate before GST and additional charges.
                    </p>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </AccentCardContent>
      </AccentCard>
      ) : null}
    </PageShell>
  );
}
