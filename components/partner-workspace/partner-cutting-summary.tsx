"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

import type { SummaryComponentRow, SummaryDetailRow } from "@/lib/summary/types";

type PartnerCuttingSummaryProps = {
  components: SummaryComponentRow[];
  details: SummaryDetailRow[];
  quantity: number;
};

export function PartnerCuttingSummary({
  components,
  details,
  quantity,
}: PartnerCuttingSummaryProps) {
  const [showDetails, setShowDetails] = useState(false);

  if (components.length === 0) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-sky-100 bg-[#E0F2FE] p-4 shadow-sm">
      <h2 className="text-base font-bold text-slate-900">Cutting Size for Labour</h2>
      <p className="mt-0.5 text-sm text-slate-600">Workshop cutting sizes for fabrication</p>

      <div className="mt-4 grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 lg:grid-cols-3">
        {components.map((row) => (
          <article
            key={row.part}
            className="rounded-xl border border-sky-200/80 bg-white/90 p-3 shadow-sm"
          >
            <h3 className="text-sm font-bold text-slate-900">{row.part}</h3>
            <p className="mt-1 text-lg font-semibold text-sky-800">{row.cuttingSize}</p>
            {row.afterWeldingSize ? (
              <p className="text-xs text-slate-600">After welding: {row.afterWeldingSize}</p>
            ) : null}
            <p className="mt-1 text-xs font-medium text-slate-500">Qty: {row.quantity}</p>
          </article>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setShowDetails((v) => !v)}
        className="mt-4 flex items-center gap-1 text-sm font-semibold text-sky-800"
      >
        {showDetails ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        View Detailed Cutting List
      </button>

      {showDetails && details.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {details.map((row) => (
            <li
              key={`${row.name}-${row.cuttingSize}`}
              className="rounded-lg border border-sky-100 bg-white/80 px-3 py-2 text-sm"
            >
              <span className="font-semibold text-slate-900">{row.name}</span>
              <span className="text-slate-600"> — {row.cuttingSize}</span>
              {row.afterWeldingSize ? (
                <span className="text-slate-500"> · Weld: {row.afterWeldingSize}</span>
              ) : null}
              <span className="text-slate-500"> · Qty {row.qty}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <p className="mt-2 text-xs text-slate-500">Order quantity: {quantity}</p>
    </section>
  );
}
