"use client";

import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Download,
  Eye,
  Package,
  Scale,
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
  StatCard,
} from "@/components/workshop/workshop-ui";
import { PdfFeedback } from "@/components/pdf/pdf-feedback";
import { PdfPreviewModal } from "@/components/pdf/pdf-preview-modal";
import type { DoorHardwareMasterSettings } from "@/lib/door-hardware";
import type { WorkshopJob } from "@/lib/jobs/types";
import {
  buildMaterialRequiredForJob,
  buildMaterialRequiredPdf,
  exportMaterialRequiredPdf,
  getMaterialRequiredNewBarTotal,
  type MaterialRequiredProfileRow,
} from "@/lib/material-required";
import { formatInr, type ProfileRateSettings } from "@/lib/profiles";
import { pdfToBlobUrl, revokePdfBlobUrl } from "@/lib/pdf/preview";

type MaterialRequiredTabProps = {
  job: WorkshopJob;
  profileRates: ProfileRateSettings;
  doorHardwareMaster: DoorHardwareMasterSettings;
};

function ProfileDrillDown({ row }: { row: MaterialRequiredProfileRow }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <tr className="border-b border-slate-100">
        <td className="px-3 py-2">
          <button
            type="button"
            className="inline-flex items-center gap-1 text-left font-medium text-slate-800"
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            {row.profileName}
          </button>
          <div className="text-xs text-slate-500">{row.category}</div>
        </td>
        <td className="px-3 py-2 font-mono text-xs">{row.profileCode}</td>
        <td className="px-3 py-2 text-right">{row.kgPerMetre?.toFixed(3) ?? "—"}</td>
        <td className="px-3 py-2 text-right">{row.standardBarLengthMm}</td>
        <td className="px-3 py-2 text-right">{row.cutPiecesCount}</td>
        <td className="px-3 py-2 text-right">{Math.round(row.netRequiredLengthMm)}</td>
        <td className="px-3 py-2 text-right">{row.inventoryBarsConsumed}</td>
        <td className="px-3 py-2 text-right font-semibold text-indigo-700">{row.newBarsRequired}</td>
        <td className="px-3 py-2 text-right">{Math.round(row.purchasedLengthMm)}</td>
        <td className="px-3 py-2 text-right">{row.purchaseWeightKg.toFixed(2)}</td>
        <td className="px-3 py-2 text-right">{formatInr(row.amount)}</td>
        <td className="px-3 py-2 text-right">{Math.round(row.reusableLeftoverMm)}</td>
        <td className="px-3 py-2 text-right">{Math.round(row.scrapMm)}</td>
      </tr>
      {open ? (
        <tr className="bg-slate-50">
          <td colSpan={13} className="px-4 py-3">
            <div className="grid gap-2 text-xs text-slate-600 md:grid-cols-2">
              <div>Kerf: {Math.round(row.totalKerfMm)} mm</div>
              <div>Utilization: {row.materialUtilizationPercent.toFixed(1)}%</div>
              <div>Optimization waste: {row.optimizationWastePercent.toFixed(1)}%</div>
              <div>Theoretical bars (ref): {row.theoreticalBars}</div>
              <div>Inventory length used: {Math.round(row.inventoryLengthUsedMm)} mm</div>
              <div>Bar plans: {row.barPlans.map((bar) => `#${bar.barNumber}`).join(", ")}</div>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}

export function MaterialRequiredTab({
  job,
  profileRates,
  doorHardwareMaster,
}: MaterialRequiredTabProps) {
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfMode, setPdfMode] = useState<"internal" | "supplier">("internal");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const data = useMemo(
    () =>
      buildMaterialRequiredForJob({
        job,
        profileRates,
        doorHardwareMaster,
      }),
    [job, profileRates, doorHardwareMaster],
  );

  const newBarTotal = getMaterialRequiredNewBarTotal(data);

  async function handlePreview(mode: "internal" | "supplier") {
    setPdfBusy(true);
    setPdfMode(mode);
    try {
      const doc = buildMaterialRequiredPdf(data, mode);
      const url = pdfToBlobUrl(doc);
      if (previewUrl) revokePdfBlobUrl(previewUrl);
      setPreviewUrl(url);
    } finally {
      setPdfBusy(false);
    }
  }

  async function handleExport(mode: "internal" | "supplier") {
    setPdfBusy(true);
    try {
      await exportMaterialRequiredPdf(
        data,
        `material-required-${job.id}-${mode}.pdf`,
        mode,
      );
    } finally {
      setPdfBusy(false);
    }
  }

  if (job.products.length === 0) {
    return (
      <PageShell>
        <MessageBanner tone="warning">
          Add at least one product to the job before opening Material Required.
        </MessageBanner>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHero
        icon={Package}
        accent="indigo"
        title="Material Required"
        description="Whole-job purchase requirement from the practical 5800 mm optimizer — same bar counts as Labour Working PDF."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={pdfBusy}
              onClick={() => handlePreview("internal")}
            >
              <Eye />
              Preview Internal PDF
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pdfBusy}
              onClick={() => handlePreview("supplier")}
            >
              <Eye />
              Preview Supplier PDF
            </Button>
            <Button type="button" disabled={pdfBusy} onClick={() => handleExport("internal")}>
              <Download />
              Export Internal PDF
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Job ID" value={data.header.jobId} />
        <StatCard label="Products" value={`${data.header.validProducts} / ${data.header.totalProducts}`} />
        <StatCard label="New full bars" value={String(newBarTotal)} />
        <StatCard label="Purchase total" value={formatInr(data.grandTotal)} />
      </div>

      <AccentCard accent="blue">
        <AccentCardHeader>
          <AccentCardTitle className="flex items-center gap-2">
            <Package className="size-5" />
            Job summary
          </AccentCardTitle>
          <AccentCardDescription>
            Optimizer status: {data.header.optimizerStatus} · Calculation: {data.header.calculationStatus}
          </AccentCardDescription>
        </AccentCardHeader>
        <AccentCardContent className="grid gap-3 text-sm md:grid-cols-2">
          <div>Customer: {data.header.customerName || "—"}</div>
          <div>Site: {data.header.siteName || "—"}</div>
          <div>Project: {data.header.projectName || "—"}</div>
          <div>Total area: {data.header.totalAreaSqft.toFixed(2)} sq.ft</div>
          <div className="md:col-span-2">
            Systems: {data.header.systemsIncluded.join(" · ") || "—"}
          </div>
          <div>Labour PDF bar plans: {data.labourBarCount}</div>
          <div>Material Required new bars: {newBarTotal}</div>
        </AccentCardContent>
      </AccentCard>

      <AccentCard accent="amber">
        <AccentCardHeader>
          <AccentCardTitle className="flex items-center gap-2">
            <Scale className="size-5" />
            UPVC profile requirement
          </AccentCardTitle>
          <AccentCardDescription>
            Purchase based on optimizer new bars × stock length × kg/m × rate/kg. No flat wastage %.
          </AccentCardDescription>
        </AccentCardHeader>
        <AccentCardContent className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <DataTableHead>
              <tr>
                <th>Profile</th>
                <th>SKU</th>
                <th>kg/m</th>
                <th>Stock</th>
                <th>Cuts</th>
                <th>Net mm</th>
                <th>Stock used</th>
                <th>New bars</th>
                <th>Purchase mm</th>
                <th>Kg</th>
                <th>Amount</th>
                <th>Reusable</th>
                <th>Scrap</th>
              </tr>
            </DataTableHead>
            <tbody>
              {data.upvcProfiles.map((row) => (
                <ProfileDrillDown key={row.profileCode} row={row} />
              ))}
            </tbody>
          </table>
        </AccentCardContent>
      </AccentCard>

      {data.steel.length > 0 ? (
        <AccentCard accent="blue">
          <AccentCardHeader>
            <AccentCardTitle>Steel reinforcement</AccentCardTitle>
          </AccentCardHeader>
          <AccentCardContent className="overflow-x-auto">
            <DataTable>
              <DataTableHead>
                <tr>
                  <th>SKU</th>
                  <th>Cuts</th>
                  <th>New bars</th>
                  <th>Purchase ft</th>
                  <th>Rate/ft</th>
                  <th>Amount</th>
                  <th>Reusable</th>
                  <th>Scrap</th>
                </tr>
              </DataTableHead>
              <tbody>
                {data.steel.map((row) => (
                  <tr key={row.profileCode} className="border-b border-slate-100">
                    <td className="px-3 py-2 font-mono text-xs">{row.profileCode}</td>
                    <td className="px-3 py-2 text-right">{row.cutPiecesCount}</td>
                    <td className="px-3 py-2 text-right font-semibold">{row.newBarsRequired}</td>
                    <td className="px-3 py-2 text-right">{row.purchaseRunningFt.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right">{row.rate.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right">{formatInr(row.amount)}</td>
                    <td className="px-3 py-2 text-right">{Math.round(row.reusableLeftoverMm)}</td>
                    <td className="px-3 py-2 text-right">{Math.round(row.scrapMm)}</td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </AccentCardContent>
        </AccentCard>
      ) : null}

      {(data.glass.length > 0 || data.mesh.length > 0) && (
        <div className="grid gap-4 xl:grid-cols-2">
          {data.glass.length > 0 ? (
            <AccentCard accent="cyan">
              <AccentCardHeader>
                <AccentCardTitle>Glass</AccentCardTitle>
              </AccentCardHeader>
              <AccentCardContent className="overflow-x-auto">
                <DataTable>
                  <DataTableHead>
                    <tr>
                      <th>Product</th>
                      <th>Pieces</th>
                      <th>Cut size</th>
                      <th>Cut area</th>
                      <th>Cost area</th>
                      <th>Amount</th>
                    </tr>
                  </DataTableHead>
                  <tbody>
                    {data.glass.map((row) => (
                      <tr key={row.productId} className="border-b border-slate-100">
                        <td className="px-3 py-2">{row.productLabel}</td>
                        <td className="px-3 py-2 text-right">{row.pieceCount}</td>
                        <td className="px-3 py-2 text-right">
                          {Math.round(row.cutWidthMm)} × {Math.round(row.cutHeightMm)}
                        </td>
                        <td className="px-3 py-2 text-right">{row.actualCutAreaSqft.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right">{row.costingAreaSqft.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right">{formatInr(row.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </DataTable>
              </AccentCardContent>
            </AccentCard>
          ) : null}

          {data.mesh.length > 0 ? (
            <AccentCard accent="emerald">
              <AccentCardHeader>
                <AccentCardTitle>Mesh / Jaali</AccentCardTitle>
              </AccentCardHeader>
              <AccentCardContent className="overflow-x-auto">
                <DataTable>
                  <DataTableHead>
                    <tr>
                      <th>Product</th>
                      <th>Size</th>
                      <th>Area</th>
                      <th>Rate</th>
                      <th>Amount</th>
                    </tr>
                  </DataTableHead>
                  <tbody>
                    {data.mesh.map((row) => (
                      <tr key={row.productId} className="border-b border-slate-100">
                        <td className="px-3 py-2">{row.productLabel}</td>
                        <td className="px-3 py-2 text-right">
                          {Math.round(row.meshWidthMm)} × {Math.round(row.meshHeightMm)}
                        </td>
                        <td className="px-3 py-2 text-right">{row.meshAreaSqft.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right">{row.ratePerSqft.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right">{formatInr(row.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </DataTable>
              </AccentCardContent>
            </AccentCard>
          ) : null}
        </div>
      )}

      {data.hardware.length > 0 ? (
        <AccentCard accent="violet">
          <AccentCardHeader>
            <AccentCardTitle>Hardware</AccentCardTitle>
          </AccentCardHeader>
          <AccentCardContent className="overflow-x-auto">
            <DataTable>
              <DataTableHead>
                <tr>
                  <th>Item</th>
                  <th>SKU</th>
                  <th>Qty</th>
                  <th>Rate</th>
                  <th>Amount</th>
                  <th>Purchase req.</th>
                </tr>
              </DataTableHead>
              <tbody>
                {data.hardware.map((row) => (
                  <tr key={row.key} className="border-b border-slate-100">
                    <td className="px-3 py-2">{row.item}</td>
                    <td className="px-3 py-2 font-mono text-xs">{row.sku}</td>
                    <td className="px-3 py-2 text-right">{row.quantity}</td>
                    <td className="px-3 py-2 text-right">{row.rate.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right">{formatInr(row.amount)}</td>
                    <td className="px-3 py-2 text-right">{row.purchaseRequired}</td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </AccentCardContent>
        </AccentCard>
      ) : null}

      <AccentCard accent="indigo">
        <AccentCardHeader>
          <AccentCardTitle>Purchase summary</AccentCardTitle>
        </AccentCardHeader>
        <AccentCardContent>
          <DataTable>
            <DataTableHead>
              <tr>
                <th>Section</th>
                <th>Amount</th>
              </tr>
            </DataTableHead>
            <tbody>
              {data.purchaseSummary.map((section) => (
                <tr key={section.id} className="border-b border-slate-100">
                  <td className="px-3 py-2">{section.label}</td>
                  <td className="px-3 py-2 text-right font-medium">{formatInr(section.total)}</td>
                </tr>
              ))}
              <tr>
                <td className="px-3 py-2 font-semibold">Grand total</td>
                <td className="px-3 py-2 text-right font-semibold text-indigo-700">
                  {formatInr(data.grandTotal)}
                </td>
              </tr>
            </tbody>
          </DataTable>
        </AccentCardContent>
      </AccentCard>

      <PdfFeedback message={null} isBusy={pdfBusy} busyLabel="Preparing Material Required PDF…" />
      <PdfPreviewModal
        open={previewUrl != null}
        title={pdfMode === "internal" ? "Material Required — Internal" : "Material Required — Supplier"}
        blobUrl={previewUrl}
        onClose={() => {
          if (previewUrl) revokePdfBlobUrl(previewUrl);
          setPreviewUrl(null);
        }}
      />
    </PageShell>
  );
}
