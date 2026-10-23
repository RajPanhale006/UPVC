"use client";

import type { FixedFrameCuttingResult } from "@/lib/cutting/fixed-frame";

type FixedFrameResultsProps = {
  cutting: FixedFrameCuttingResult;
};

export function FixedFrameResults({ cutting }: FixedFrameResultsProps) {
  const { summary, glassPanels, barPlans, materials, profileCostRows } = cutting;

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900">Workshop Cost Summary</h3>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <div>
            <dt className="text-slate-500">Profile</dt>
            <dd className="font-semibold">₹{summary.workshopCost.profileCost}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Glass</dt>
            <dd className="font-semibold">₹{summary.workshopCost.glassCost}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Reinforcement</dt>
            <dd className="font-semibold">₹{summary.workshopCost.reinforcementCost}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Hardware</dt>
            <dd className="font-semibold">₹{summary.workshopCost.hardwareCost}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Labour</dt>
            <dd className="font-semibold">₹{summary.workshopCost.labourCost}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Per sq.ft</dt>
            <dd className="font-semibold">₹{summary.workshopCost.workshopCostPerSqFt}</dd>
          </div>
          <div className="col-span-2 border-t pt-2">
            <dt className="text-slate-500">Total Workshop Cost</dt>
            <dd className="text-lg font-bold text-emerald-700">
              ₹{summary.workshopCost.totalWorkshopCost}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900">Glass Cutting Sheet</h3>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-xs">
            <thead>
              <tr className="border-b text-slate-500">
                <th className="py-2 pr-2">Ref</th>
                <th className="py-2 pr-2">Size (mm)</th>
                <th className="py-2 pr-2">Qty</th>
                <th className="py-2 pr-2">Area</th>
                <th className="py-2">Cost</th>
              </tr>
            </thead>
            <tbody>
              {glassPanels.map((g) => (
                <tr key={g.moduleId} className="border-b border-slate-100">
                  <td className="py-2 pr-2 font-medium">{g.moduleLabel}</td>
                  <td className="py-2 pr-2">
                    {g.widthMm} × {g.heightMm} · {g.thicknessMm} mm
                  </td>
                  <td className="py-2 pr-2">{g.quantity}</td>
                  <td className="py-2 pr-2">{g.totalAreaSqFt} sq.ft</td>
                  <td className="py-2">₹{g.totalCost}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900">Profile Bar Optimization</h3>
        <div className="mt-2 space-y-2">
          {barPlans.map((bar) => (
            <div key={bar.barId} className="rounded-lg bg-slate-50 px-3 py-2 text-xs">
              <p className="font-semibold text-slate-800">
                {bar.barId} · {bar.profileCode} · {bar.barLengthMm} mm
                {bar.fromInventory ? " (inventory)" : ""}
              </p>
              <p className="text-slate-600">
                Cuts: {bar.cuts.map((c) => `${c.moduleLabel} ${c.lengthMm}mm`).join(" · ")}
              </p>
              <p className="text-slate-500">
                Reusable {bar.reusableLeftoverMm} mm · Scrap {bar.scrapMm} mm
              </p>
            </div>
          ))}
        </div>
        {profileCostRows.length > 0 ? (
          <p className="mt-2 text-xs text-slate-500">
            {profileCostRows.length} profile cut groups · {barPlans.length} bars planned
          </p>
        ) : null}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900">Material Requirement</h3>
        <ul className="mt-2 space-y-1 text-xs text-slate-700">
          {materials.map((m) => (
            <li key={m.id} className="flex justify-between gap-2 border-b border-slate-100 py-1">
              <span>{m.itemName}</span>
              <span className="font-medium">₹{m.amount}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
