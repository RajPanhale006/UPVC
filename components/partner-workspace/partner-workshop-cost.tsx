"use client";

import { formatInr } from "@/lib/profiles";
import { formatSqft } from "@/lib/summary";

type PartnerWorkshopCostProps = {
  areaSqft: number;
  quantity: number;
  totalAreaSqft: number;
  workshopRatePerSqft: number;
  totalWorkshopCost: number;
  customerBaseMarginPercent: number;
  customerBaseMarginAmount: number;
  suggestedCustomerBasePrice: number;
  suggestedCustomerRatePerSqFt: number;
  customerBasePriceAvailable: boolean;
  customerRateAvailable: boolean;
};

export function PartnerWorkshopCost({
  areaSqft,
  quantity,
  totalAreaSqft,
  workshopRatePerSqft,
  totalWorkshopCost,
  customerBaseMarginPercent,
  customerBaseMarginAmount,
  suggestedCustomerBasePrice,
  suggestedCustomerRatePerSqFt,
  customerBasePriceAvailable,
  customerRateAvailable,
}: PartnerWorkshopCostProps) {
  const showPricing = customerBasePriceAvailable && totalWorkshopCost > 0;

  return (
    <section className="rounded-2xl border border-amber-100 bg-[#FEF3C7] p-4 shadow-sm">
      <h2 className="text-base font-bold text-slate-900">Workshop Cost</h2>
      <p className="mt-0.5 text-sm text-slate-600">Internal manufacturing cost overview</p>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
        {[
          { label: "Product Area", value: formatSqft(areaSqft) },
          { label: "Quantity", value: String(quantity) },
          { label: "Total Area", value: formatSqft(totalAreaSqft) },
        ].map((item) => (
          <article
            key={item.label}
            className="rounded-xl border border-amber-200/80 bg-white/90 p-3 shadow-sm"
          >
            <p className="text-xs font-medium text-slate-600">{item.label}</p>
            <p className="mt-1 text-base font-bold text-slate-900">{item.value}</p>
          </article>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <article className="rounded-xl border border-amber-200/80 bg-white/90 p-3 shadow-sm">
          <p className="text-xs font-medium text-slate-600">Workshop Rate per Sq.ft</p>
          <p className="mt-1 text-base font-bold text-slate-900">
            {formatInr(workshopRatePerSqft)}
          </p>
        </article>
        <article className="rounded-xl border border-amber-200/80 bg-white/90 p-3 shadow-sm">
          <p className="text-xs font-medium text-slate-600">Total Workshop Cost</p>
          <p className="mt-1 text-lg font-bold text-amber-900">
            {formatInr(totalWorkshopCost)}
          </p>
        </article>
      </div>

      <div className="mt-3 rounded-xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">
          Customer pricing guide
        </p>
        {showPricing ? (
          <div className="mt-3 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <article className="rounded-lg border border-violet-100 bg-white/90 p-3">
                <p className="text-xs font-medium text-slate-600">Standard Margin</p>
                <p className="mt-1 text-base font-bold text-violet-900">
                  {customerBaseMarginPercent}%
                </p>
              </article>
              <article className="rounded-lg border border-violet-100 bg-white/90 p-3">
                <p className="text-xs font-medium text-slate-600">Margin Amount</p>
                <p className="mt-1 text-base font-bold text-violet-900">
                  {formatInr(customerBaseMarginAmount)}
                </p>
              </article>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <article className="rounded-xl border-2 border-violet-300 bg-violet-50/90 p-4 shadow-sm">
                <p className="text-xs font-semibold text-violet-800">
                  Suggested Customer Base Price
                </p>
                <p className="mt-1 text-2xl font-bold text-violet-950">
                  {formatInr(suggestedCustomerBasePrice)}
                </p>
                <p className="mt-1 text-xs text-violet-700/90">
                  Workshop cost plus standard {customerBaseMarginPercent}% margin, before GST
                  and additional charges.
                </p>
              </article>
              <article className="rounded-xl border-2 border-fuchsia-300 bg-fuchsia-50/90 p-4 shadow-sm">
                <p className="text-xs font-semibold text-fuchsia-900">
                  Suggested Customer Rate per Sq.ft
                </p>
                <p className="mt-1 text-2xl font-bold text-fuchsia-950">
                  {customerRateAvailable
                    ? `${formatInr(suggestedCustomerRatePerSqFt)}/sq.ft`
                    : "—"}
                </p>
                <p className="mt-1 text-xs text-fuchsia-800/90">
                  Recommended customer base rate before GST and additional charges.
                </p>
              </article>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-600">
            Suggested Customer Base Price unavailable until workshop cost is calculated.
          </p>
        )}
        {showPricing && !customerRateAvailable ? (
          <p className="mt-2 text-sm text-slate-600">
            Suggested Customer Rate unavailable until area is calculated.
          </p>
        ) : null}
      </div>
    </section>
  );
}
