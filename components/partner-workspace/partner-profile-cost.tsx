"use client";

import { formatInr } from "@/lib/profiles";
import { formatRunFt, formatWeightKg } from "@/lib/summary";
import type { ProfileCostSummary } from "@/lib/summary/types";

type PartnerProfileCostProps = {
  profileCostSummary: ProfileCostSummary | null;
};

export function PartnerProfileCost({ profileCostSummary }: PartnerProfileCostProps) {
  if (!profileCostSummary) {
    return null;
  }

  const { rows, hasMissingConfig } = profileCostSummary;

  return (
    <section className="rounded-2xl border border-teal-100 bg-[#CCFBF1] p-4 shadow-sm">
      <h2 className="text-base font-bold text-slate-900">Profile Usage and Cost</h2>

      {hasMissingConfig ? (
        <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Profile rate or weight is not configured. Contact Admin.
        </p>
      ) : null}

      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-slate-600">Calculate to view profile usage.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {rows.map((row) => (
            <article
              key={row.id}
              className="rounded-xl border border-teal-200/80 bg-white/90 p-3 shadow-sm"
            >
              <h3 className="text-sm font-bold text-slate-900">{row.profileName}</h3>
              <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-slate-600 sm:grid-cols-3">
                <div>
                  <dt>Required RF</dt>
                  <dd className="font-semibold text-slate-900">{formatRunFt(row.requiredRunFt)}</dd>
                </div>
                <div>
                  <dt>Costing RF</dt>
                  <dd className="font-semibold text-slate-900">{formatRunFt(row.costingRunFt)}</dd>
                </div>
                <div>
                  <dt>Weight</dt>
                  <dd className="font-semibold text-slate-900">
                    {row.totalWeight != null ? formatWeightKg(row.totalWeight) : "—"}
                  </dd>
                </div>
                <div>
                  <dt>Rate/kg</dt>
                  <dd className="font-semibold text-slate-900">
                    {row.ratePerKg != null ? formatInr(row.ratePerKg) : "—"}
                  </dd>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <dt>Total Cost</dt>
                  <dd className="font-semibold text-teal-800">{formatInr(row.totalCost)}</dd>
                </div>
              </dl>
            </article>
          ))}

          <div className="rounded-xl border border-teal-300 bg-white/95 p-3 text-sm">
            <div className="flex flex-wrap justify-between gap-2">
              <span>
                Total Running Feet:{" "}
                <strong>{formatRunFt(profileCostSummary.totalCostingRunFt)}</strong>
              </span>
              <span>
                Total Weight:{" "}
                <strong>{formatWeightKg(profileCostSummary.totalUpvcWeight)}</strong>
              </span>
              <span>
                Total Profile Cost:{" "}
                <strong className="text-teal-800">
                  {formatInr(profileCostSummary.totalProfileCost)}
                </strong>
              </span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
