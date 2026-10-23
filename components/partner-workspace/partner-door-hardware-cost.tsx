"use client";

import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  canViewDoorHardwareCostTotal,
  canViewDoorHardwareRates,
  formatHardwareQuantityLabel,
  type DoorHardwareCostItem,
} from "@/lib/door-hardware";
import { formatInr } from "@/lib/profiles";

type PartnerDoorHardwareCostProps = {
  items: DoorHardwareCostItem[];
  totalDoorHardwareCost: number;
  hasMissingRates: boolean;
  missingItems: string[];
  canEditOverrides?: boolean;
  onOpenHardwareRates?: () => void;
};

export function PartnerDoorHardwareCost({
  items,
  totalDoorHardwareCost,
  hasMissingRates,
  missingItems,
  canEditOverrides = false,
  onOpenHardwareRates,
}: PartnerDoorHardwareCostProps) {
  const showRates = canViewDoorHardwareRates();
  const showTotal = canViewDoorHardwareCostTotal();

  if (items.length === 0) return null;

  return (
    <section className="rounded-2xl border border-indigo-100 bg-[#E0E7FF]/40 p-4 shadow-sm">
      <h2 className="text-base font-bold text-slate-900">Door Hardware Cost</h2>
      <p className="mt-0.5 text-sm text-slate-600">
        Hardware quantities from door configuration · rates from master settings
      </p>

      {hasMissingRates ? (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-700" />
            <div>
              <p className="text-sm font-semibold text-amber-900">
                Door hardware rate not configured.
              </p>
              <p className="mt-1 text-sm text-amber-800">Missing rates:</p>
              <ul className="mt-1 list-inside list-disc text-sm text-amber-800">
                {missingItems.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
              {onOpenHardwareRates ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  onClick={onOpenHardwareRates}
                >
                  Open Door Hardware Rates
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <article
            key={item.hardwareId}
            className="rounded-xl border border-indigo-100 bg-white/90 p-3 shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-slate-900">{item.name}</p>
                {item.specification ? (
                  <p className="text-xs text-slate-500">{item.specification}</p>
                ) : null}
              </div>
              <div className="text-right text-xs text-slate-500">
                {item.isQuantityOverridden ? (
                  <span className="font-semibold text-violet-700">Custom Qty</span>
                ) : null}
                {item.isRateOverridden ? (
                  <span className="block font-semibold text-violet-700">Custom Rate</span>
                ) : null}
              </div>
            </div>
            <p className="mt-2 text-sm text-slate-700">
              {formatHardwareQuantityLabel(item.unit, item.quantity)}
            </p>
            {showRates ? (
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-xs text-slate-500">Rate</p>
                  <p className="font-semibold text-slate-900">
                    {item.isRateMissing ? "—" : formatInr(item.unitRate ?? 0)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Total</p>
                  <p className="font-semibold text-slate-900">
                    {item.isRateMissing ? "—" : formatInr(item.totalCost ?? 0)}
                  </p>
                </div>
              </div>
            ) : null}
          </article>
        ))}
      </div>

      {showTotal ? (
        <div className="mt-4 rounded-xl border border-indigo-200 bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
            Total Door Hardware Cost
          </p>
          <p className="mt-1 text-2xl font-bold text-indigo-950">
            {hasMissingRates ? "—" : formatInr(totalDoorHardwareCost)}
          </p>
        </div>
      ) : null}

      {canEditOverrides ? (
        <p className="mt-2 text-xs text-slate-500">
          Job-specific quantity or rate overrides can be applied from door options when permitted.
        </p>
      ) : null}
    </section>
  );
}
