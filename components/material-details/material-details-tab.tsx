"use client";

import { useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Download,
  Eye,
  FileSpreadsheet,
  ImageIcon,
  ListTree,
  Printer,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { PdfFeedback } from "@/components/pdf/pdf-feedback";
import { PdfPreviewModal } from "@/components/pdf/pdf-preview-modal";
import {
  DataTable,
  DataTableHead,
  MessageBanner,
  StatCard,
} from "@/components/workshop/workshop-ui";
import type { DoorHardwareMasterSettings } from "@/lib/door-hardware";
import type { WorkshopJob } from "@/lib/jobs/types";
import {
  buildMaterialDetailsForJob,
  buildMaterialDetailsPdf,
  exportElementAsPng,
  exportMaterialDetailsExcel,
  exportMaterialDetailsPdf,
  type MaterialDetailsProduct,
} from "@/lib/material-details";
import { formatInr, type ProfileRateSettings } from "@/lib/profiles";
import { pdfToBlobUrl, revokePdfBlobUrl } from "@/lib/pdf/preview";
import type { CuttingJobMeta } from "@/lib/summary/types";

type MaterialDetailsTabProps = {
  job: WorkshopJob;
  profileRates: ProfileRateSettings;
  doorHardwareMaster: DoorHardwareMasterSettings;
  cuttingJobMeta?: CuttingJobMeta;
};

function ProductPanel({ product }: { product: MaterialDetailsProduct }) {
  const [open, setOpen] = useState(true);
  const [profilesOpen, setProfilesOpen] = useState(false);

  if (!product.isValid) {
    return (
      <section className="rounded-2xl border border-red-200 bg-red-50 p-4">
        <h3 className="font-semibold text-red-900">{product.label}</h3>
        <p className="mt-1 text-sm text-red-700">{product.error ?? "Invalid product."}</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left"
        onClick={() => setOpen((value) => !value)}
      >
        <div>
          <h3 className="text-sm font-bold text-slate-900">{product.label}</h3>
          <p className="mt-0.5 text-xs text-slate-600">
            {Math.round(product.widthMm)} × {Math.round(product.heightMm)} mm · Qty{" "}
            {product.quantity} · {product.areaSqft.toFixed(2)} sq.ft
            {product.trackLabel ? ` · ${product.trackLabel}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-indigo-700">
            {formatInr(product.workshopTotal)}
          </span>
          {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </div>
      </button>

      {open ? (
        <div className="border-t border-slate-100 px-4 py-4">
          <DataTable className="min-w-[720px]">
            <DataTableHead>
              <tr>
                <th className="px-3 py-2.5">Category</th>
                <th className="px-3 py-2.5">Item</th>
                <th className="px-3 py-2.5 text-right">Qty</th>
                <th className="px-3 py-2.5">Unit</th>
                <th className="px-3 py-2.5 text-right">Rate</th>
                <th className="px-3 py-2.5 text-right">Amount</th>
                <th className="px-3 py-2.5">Notes</th>
              </tr>
            </DataTableHead>
            <tbody>
              {product.lines.map((line, index) => (
                <tr key={`${line.category}-${line.item}-${index}`} className="border-b border-slate-100">
                  <td className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {line.category}
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium text-slate-900">{line.item}</div>
                    {line.specification ? (
                      <div className="text-xs text-slate-500">{line.specification}</div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{line.quantity}</td>
                  <td className="px-3 py-2 text-slate-600">{line.unit}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatInr(line.rate)}</td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums text-indigo-700">
                    {formatInr(line.amount)}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-500">{line.note ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </DataTable>

          {product.profileRows.length > 0 ? (
            <div className="mt-4">
              <button
                type="button"
                className="mb-2 flex items-center gap-1 text-sm font-semibold text-slate-800"
                onClick={() => setProfilesOpen((value) => !value)}
              >
                {profilesOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                Profile breakdown ({product.profileRows.length})
              </button>
              {profilesOpen ? (
                <DataTable className="min-w-[640px]">
                  <DataTableHead>
                    <tr>
                      <th className="px-3 py-2.5">Profile</th>
                      <th className="px-3 py-2.5">Code</th>
                      <th className="px-3 py-2.5 text-right">Run ft</th>
                      <th className="px-3 py-2.5 text-right">Weight</th>
                      <th className="px-3 py-2.5 text-right">Cost</th>
                    </tr>
                  </DataTableHead>
                  <tbody>
                    {product.profileRows.map((row) => (
                      <tr key={row.id} className="border-b border-slate-100">
                        <td className="px-3 py-2">{row.profileName}</td>
                        <td className="px-3 py-2 font-mono text-xs">{row.profileCode}</td>
                        <td className="px-3 py-2 text-right">{row.costingRunFt.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right">
                          {row.totalWeight != null ? `${row.totalWeight.toFixed(2)} kg` : "—"}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold">{formatInr(row.totalCost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </DataTable>
              ) : null}
            </div>
          ) : null}

          <dl className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-slate-600">Material</dt>
              <dd className="font-semibold">{formatInr(product.materialTotal)}</dd>
            </div>
            <div>
              <dt className="text-slate-600">Labour</dt>
              <dd className="font-semibold">{formatInr(product.labourTotal)}</dd>
            </div>
            <div>
              <dt className="text-slate-600">Overhead</dt>
              <dd className="font-semibold">{formatInr(product.overheadTotal)}</dd>
            </div>
            <div>
              <dt className="text-slate-600">Workshop total</dt>
              <dd className="font-bold text-indigo-700">{formatInr(product.workshopTotal)}</dd>
            </div>
          </dl>
        </div>
      ) : null}
    </section>
  );
}

export function MaterialDetailsTab({
  job,
  profileRates,
  doorHardwareMaster,
  cuttingJobMeta,
}: MaterialDetailsTabProps) {
  const exportRef = useRef<HTMLDivElement>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [excelBusy, setExcelBusy] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const data = buildMaterialDetailsForJob({
    job,
    profileRates,
    doorHardwareMaster,
    cuttingJobMeta,
  });

  async function handlePreviewPdf() {
    setPdfBusy(true);
    setMessage(null);
    try {
      const doc = buildMaterialDetailsPdf(data);
      const url = pdfToBlobUrl(doc);
      setPreviewUrl((prev) => {
        revokePdfBlobUrl(prev);
        return url;
      });
    } catch {
      setMessage("Could not generate PDF preview.");
    } finally {
      setPdfBusy(false);
    }
  }

  async function handleExportPdf() {
    setPdfBusy(true);
    setMessage(null);
    try {
      await exportMaterialDetailsPdf(data);
      setMessage("Material Details PDF exported.");
    } catch {
      setMessage("Could not export PDF.");
    } finally {
      setPdfBusy(false);
    }
  }

  async function handleExportExcel() {
    setExcelBusy(true);
    setMessage(null);
    try {
      await exportMaterialDetailsExcel(data);
      setMessage("Material Details Excel exported.");
    } catch {
      setMessage("Could not export Excel.");
    } finally {
      setExcelBusy(false);
    }
  }

  async function handleExportImage() {
    if (!exportRef.current) return;
    setImageBusy(true);
    setMessage(null);
    try {
      await exportElementAsPng(exportRef.current, `material-details-${job.id}.png`);
      setMessage("Material Details image saved.");
    } catch {
      setMessage("Could not save image.");
    } finally {
      setImageBusy(false);
    }
  }

  if (data.products.length === 0) {
    return (
      <MessageBanner tone="warning">
        Open <strong>Quick Quote Sheet</strong>, enter width × height and track type, tap{" "}
        <strong>Calculate All</strong>, then return here for the full material list with rates.
      </MessageBanner>
    );
  }

  if (data.validProductCount === 0) {
    return (
      <MessageBanner tone="warning">
        No valid calculations found. Check sizes and track types, then try again.
      </MessageBanner>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
              <ListTree className="size-5 text-indigo-600" />
              Material Details
            </h2>
            <p className="mt-0.5 text-sm text-slate-600">
              Full breakdown — profiles, glass, mesh, hardware, lock, labour, overheads per window.
            </p>
            {data.source === "quick-quote" ? (
              <p className="mt-2 rounded-lg bg-violet-50 px-3 py-2 text-xs font-medium text-violet-900">
                Showing sizes from your <strong>Quick Quote Sheet</strong> — same measurements you
                entered (e.g. width × height, track type, qty). Tap Calculate All in Quick Quote
                first if rates look empty.
              </p>
            ) : (
              <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                Showing saved job products. Enter sizes in Quick Quote Sheet to see those lines
                here instead.
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" disabled={pdfBusy} onClick={() => void handlePreviewPdf()}>
              <Eye className="size-4" />
              Preview PDF
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={pdfBusy} onClick={() => void handleExportPdf()}>
              <Printer className="size-4" />
              Export PDF
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={excelBusy} onClick={() => void handleExportExcel()}>
              <FileSpreadsheet className="size-4" />
              Export Excel
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={imageBusy} onClick={() => void handleExportImage()}>
              <ImageIcon className="size-4" />
              Save Image
            </Button>
          </div>
        </div>
      </section>

      {message ? <MessageBanner tone="info">{message}</MessageBanner> : null}

      <div ref={exportRef} className="space-y-4 bg-[#f4f7fc] p-1">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard accent="cyan" label="Products" value={String(data.validProductCount)} />
          <StatCard accent="violet" label="Total area" value={`${data.totalAreaSqft.toFixed(2)} sq.ft`} />
          <StatCard accent="amber" label="Material + labour" value={formatInr(data.grandMaterialTotal + data.grandLabourTotal)} />
          <StatCard accent="indigo" label="Workshop total" value={formatInr(data.grandWorkshopTotal)} />
        </div>

        {data.products.map((product) => (
          <ProductPanel key={product.id} product={product} />
        ))}

        <section className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
          <h3 className="text-sm font-bold text-indigo-900">Job totals</h3>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-indigo-700">Materials</dt>
              <dd className="font-semibold text-indigo-950">{formatInr(data.grandMaterialTotal)}</dd>
            </div>
            <div>
              <dt className="text-indigo-700">Labour</dt>
              <dd className="font-semibold text-indigo-950">{formatInr(data.grandLabourTotal)}</dd>
            </div>
            <div>
              <dt className="text-indigo-700">Overheads</dt>
              <dd className="font-semibold text-indigo-950">{formatInr(data.grandOverheadTotal)}</dd>
            </div>
            <div>
              <dt className="text-indigo-700">Workshop total</dt>
              <dd className="text-lg font-bold text-indigo-950">{formatInr(data.grandWorkshopTotal)}</dd>
            </div>
          </dl>
        </section>
      </div>

      {pdfBusy ? (
        <PdfFeedback message={null} isBusy busyLabel="Preparing Material Details PDF…" />
      ) : null}

      <PdfPreviewModal
        open={previewUrl != null}
        title="Material Details Preview"
        blobUrl={previewUrl}
        onClose={() => {
          revokePdfBlobUrl(previewUrl);
          setPreviewUrl(null);
        }}
        onExport={() => void handleExportPdf()}
        isExporting={pdfBusy}
        exportLabel="Export Material Details PDF"
      />
    </div>
  );
}
