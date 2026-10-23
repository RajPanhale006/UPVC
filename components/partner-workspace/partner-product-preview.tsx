"use client";

import { ProductPreview } from "@/components/product-preview";
import type { ProductPreviewData } from "@/components/product-preview/preview-types";

type PartnerProductPreviewProps = {
  data: ProductPreviewData | null;
};

export function PartnerProductPreview({ data }: PartnerProductPreviewProps) {
  if (!data) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center shadow-sm">
        <h2 className="text-base font-bold text-slate-900">Product Preview</h2>
        <p className="mt-1 text-sm text-slate-600">
          Enter measurements and calculate to see the drawing.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-base font-bold text-slate-900">Product Preview</h2>
      <div className="mt-3 flex justify-center overflow-hidden">
        <ProductPreview data={data} className="max-w-full" />
      </div>
    </section>
  );
}
