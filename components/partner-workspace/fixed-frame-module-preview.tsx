"use client";

import { cn } from "@/lib/utils";
import type { FixedFrameConstructionMode } from "@/lib/cutting/fixed-frame";

type FixedFrameModulePreviewProps = {
  openingWidthMm: number;
  openingHeightMm: number;
  moduleWidthsMm: number[];
  moduleHeightMm: number;
  constructionMode: FixedFrameConstructionMode;
  jointGapMm: number;
};

export function FixedFrameModulePreview({
  openingWidthMm,
  openingHeightMm,
  moduleWidthsMm,
  moduleHeightMm,
  constructionMode,
  jointGapMm,
}: FixedFrameModulePreviewProps) {
  const maxW = Math.max(openingWidthMm, 1);
  const maxH = Math.max(openingHeightMm, 1);
  const scale = Math.min(320 / maxW, 120 / maxH);

  const isInternal = constructionMode === "INTERNAL_PARTITIONS";
  const isSeparate = constructionMode === "SEPARATE_MODULES";

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-bold text-slate-900">Module Division Preview</h3>
      <p className="mt-1 text-xs text-slate-600">
        {isInternal
          ? "One outer frame with internal vertical partitions"
          : isSeparate
            ? "Independent modules fabricated separately"
            : "Single complete fixed frame"}
      </p>

      <div className="mt-4 overflow-x-auto">
        <div
          className="relative mx-auto border-2 border-slate-700 bg-sky-50"
          style={{
            width: Math.max(80, openingWidthMm * scale),
            height: Math.max(40, openingHeightMm * scale),
          }}
        >
          <div className="absolute inset-0 flex items-stretch">
            {moduleWidthsMm.map((modW, index) => {
              const widthPx = (modW / maxW) * openingWidthMm * scale;
              const gapPx =
                isSeparate && index < moduleWidthsMm.length - 1
                  ? (jointGapMm / maxW) * openingWidthMm * scale
                  : 0;
              return (
                <div key={`mod-${index}`} className="flex items-stretch">
                  <div
                    className={cn(
                      "relative flex items-center justify-center border border-slate-600 bg-white/80",
                      isSeparate ? "mx-0.5 rounded-sm shadow-sm" : "flex-1",
                    )}
                    style={{
                      width: Math.max(12, widthPx),
                      height: Math.max(20, moduleHeightMm * scale),
                      marginTop: ((openingHeightMm - moduleHeightMm) / 2) * scale,
                    }}
                  >
                    <span className="text-[10px] font-semibold text-slate-700">
                      {isInternal ? `S${index + 1}` : `M${index + 1}`}
                    </span>
                  </div>
                  {gapPx > 0 ? (
                    <div
                      className="shrink-0 bg-amber-200"
                      style={{ width: Math.max(2, gapPx) }}
                      title="Joint gap"
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <ul className="mt-3 space-y-1 text-xs text-slate-600">
        {moduleWidthsMm.map((w, i) => (
          <li key={`dim-${i}`}>
            {isInternal ? `S${i + 1}` : `M${i + 1}`}: {Math.round(w)} × {Math.round(moduleHeightMm)} mm
          </li>
        ))}
      </ul>
    </section>
  );
}
