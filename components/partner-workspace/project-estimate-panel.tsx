"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, FileText, Layers, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DoorHardwareMasterSettings } from "@/lib/door-hardware";
import { setActiveProduct, type WorkshopJob } from "@/lib/jobs";
import type { ProfileRateSettings } from "@/lib/profiles";
import {
  buildProjectEstimate,
  convertProjectEstimateToQuotation,
  loadProjectEstimateSettings,
  saveProjectEstimateSettings,
  type ProjectEstimateSettings,
} from "@/lib/project-estimate";
import { formatInr } from "@/lib/profiles/cost";
import type { QuotationForm } from "@/lib/quotation";
import { GST_MODE_LABELS } from "@/lib/quotation/defaults";
import { cn } from "@/lib/utils";

type ProjectEstimatePanelProps = {
  job: WorkshopJob;
  profileRates: ProfileRateSettings;
  doorHardwareMaster: DoorHardwareMasterSettings;
  quotationForm: QuotationForm;
  onJobChange: (job: WorkshopJob) => void;
  onQuotationChange: (form: QuotationForm) => void;
  onSelectProduct: (productId: string) => void;
  onConvertToQuotation?: () => void;
};

function parseAmount(value: string, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export function ProjectEstimatePanel({
  job,
  profileRates,
  doorHardwareMaster,
  quotationForm,
  onJobChange,
  onQuotationChange,
  onSelectProduct,
  onConvertToQuotation,
}: ProjectEstimatePanelProps) {
  const [settings, setSettings] = useState<ProjectEstimateSettings>(() =>
    loadProjectEstimateSettings(job.id),
  );
  const [message, setMessage] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);

  useEffect(() => {
    saveProjectEstimateSettings(job.id, settings);
  }, [job.id, settings]);

  const estimate = useMemo(
    () =>
      buildProjectEstimate(
        job,
        profileRates,
        doorHardwareMaster,
        settings,
        quotationForm.gstMode,
      ),
    [job, profileRates, doorHardwareMaster, settings, quotationForm.gstMode],
  );

  function updateSettings(partial: Partial<ProjectEstimateSettings>) {
    setSettings((current) => ({ ...current, ...partial }));
  }

  async function handleConvert() {
    if (estimate.validProductCount === 0) {
      setMessage("Add and calculate at least one product before converting.");
      return;
    }
    setIsConverting(true);
    setMessage(null);
    const result = convertProjectEstimateToQuotation({
      job,
      quotationForm,
      profileRates,
      doorHardwareMaster,
      settings,
    });
    setIsConverting(false);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    onQuotationChange(result.form);
    setMessage(result.message);
    onConvertToQuotation?.();
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Estimate</h2>
            <p className="mt-0.5 text-sm text-slate-600">
              Combine calculated products into a preliminary commercial estimate.
            </p>
          </div>
          <Layers className="size-5 shrink-0 text-violet-600" />
        </div>

        <div className="mt-4 space-y-2">
          {estimate.lines.map((line) => (
            <button
              key={line.productId}
              type="button"
              onClick={() => {
                onJobChange(setActiveProduct(job, line.productId));
                onSelectProduct(line.productId);
              }}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition",
                line.isValid
                  ? "border-slate-200 bg-slate-50 hover:border-violet-200 hover:bg-violet-50/40"
                  : "border-amber-200 bg-amber-50/60",
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-900">{line.label}</p>
                <p className="text-xs text-slate-600">
                  {line.widthMm} × {line.heightMm} mm · Qty {line.quantity} ·{" "}
                  {line.areaSqft.toFixed(2)} sq.ft
                  {line.isValid ? ` · ₹${line.ratePerSqFt.toFixed(2)}/sq.ft` : null}
                </p>
                {!line.isValid && line.error ? (
                  <p className="mt-0.5 text-xs font-medium text-amber-800">{line.error}</p>
                ) : null}
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-bold tabular-nums text-slate-900">
                  {line.isValid ? formatInr(line.lineTotal) : "—"}
                </p>
                <p className="text-[10px] uppercase tracking-wide text-slate-500">Edit</p>
              </div>
            </button>
          ))}
        </div>

        {estimate.invalidProductCount > 0 ? (
          <p className="mt-3 text-xs text-amber-800">
            {estimate.invalidProductCount} product(s) need calculation — open each product,
            calculate, and save to job.
          </p>
        ) : null}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900">Project Charges</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div>
            <Label htmlFor="est-installation">Installation (₹)</Label>
            <Input
              id="est-installation"
              type="number"
              min={0}
              step={100}
              value={settings.installationCharge || ""}
              onChange={(e) =>
                updateSettings({ installationCharge: parseAmount(e.target.value, 0) })
              }
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="est-transport">Transportation (₹)</Label>
            <Input
              id="est-transport"
              type="number"
              min={0}
              step={100}
              value={settings.transportationCharge || ""}
              onChange={(e) =>
                updateSettings({ transportationCharge: parseAmount(e.target.value, 0) })
              }
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="est-discount">Discount (%)</Label>
            <Input
              id="est-discount"
              type="number"
              min={0}
              max={100}
              step={0.5}
              value={settings.discountPercent || ""}
              onChange={(e) =>
                updateSettings({ discountPercent: parseAmount(e.target.value, 0) })
              }
              className="mt-1"
            />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 to-indigo-50 p-4 shadow-sm">
        <h3 className="text-sm font-bold text-violet-950">Estimated Project Value</h3>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-700">Products subtotal</dt>
            <dd className="font-semibold tabular-nums">{formatInr(estimate.productsSubtotal)}</dd>
          </div>
          {estimate.installationCharge > 0 ? (
            <div className="flex justify-between">
              <dt className="text-slate-700">Installation</dt>
              <dd className="font-semibold tabular-nums">
                {formatInr(estimate.installationCharge)}
              </dd>
            </div>
          ) : null}
          {estimate.transportationCharge > 0 ? (
            <div className="flex justify-between">
              <dt className="text-slate-700">Transportation</dt>
              <dd className="font-semibold tabular-nums">
                {formatInr(estimate.transportationCharge)}
              </dd>
            </div>
          ) : null}
          {estimate.discountAmount > 0 ? (
            <div className="flex justify-between text-emerald-800">
              <dt>Discount ({estimate.discountPercent}%)</dt>
              <dd className="font-semibold tabular-nums">−{formatInr(estimate.discountAmount)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between border-t border-violet-200/80 pt-2">
            <dt className="font-medium text-slate-800">
              {quotationForm.gstMode === "apply" ? "Subtotal (before GST)" : "Project total"}
            </dt>
            <dd className="font-bold tabular-nums">{formatInr(estimate.subtotalAfterDiscount)}</dd>
          </div>
          {quotationForm.gstMode === "apply" && estimate.gstAmount > 0 ? (
            <div className="flex justify-between">
              <dt className="text-slate-700">GST ({estimate.gstPercent}%)</dt>
              <dd className="font-semibold tabular-nums">{formatInr(estimate.gstAmount)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between border-t border-violet-300 pt-2 text-base">
            <dt className="font-bold text-violet-950">Grand total</dt>
            <dd className="font-bold tabular-nums text-violet-950">
              {formatInr(estimate.grandTotal)}
            </dd>
          </div>
        </dl>
        <p className="mt-2 text-[11px] text-slate-600">
          GST mode: {GST_MODE_LABELS[quotationForm.gstMode]}
        </p>
      </section>

      {message ? (
        <p
          className={cn(
            "rounded-xl px-3 py-2 text-sm font-medium",
            message.includes("added") || message.includes("quotation")
              ? "bg-emerald-100 text-emerald-900"
              : "bg-amber-100 text-amber-900",
          )}
        >
          {message}
        </p>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2">
        <Button
          type="button"
          size="lg"
          className="h-12"
          disabled={isConverting || estimate.validProductCount === 0}
          onClick={() => void handleConvert()}
        >
          <FileText className="size-4" />
          Convert to Quotation
          <ArrowRight className="size-4" />
        </Button>
        <Button
          type="button"
          size="lg"
          variant="outline"
          className="h-12"
          onClick={() => onConvertToQuotation?.()}
        >
          <RefreshCw className="size-4" />
          Open Quotation
        </Button>
      </div>

      <p className="text-center text-xs text-slate-500">
        Workflow: Calculate each product → Save to job → Review estimate → Convert to quotation
      </p>
    </div>
  );
}
