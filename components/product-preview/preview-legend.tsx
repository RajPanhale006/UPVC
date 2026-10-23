import { cn } from "@/lib/utils";

import type { PanelKind, PreviewFrameVariant } from "./preview-types";
import { panelLabel } from "./preview-utils";

type PreviewLegendProps = {
  panels: PanelKind[];
  variant?: PreviewFrameVariant;
  className?: string;
};

export function PreviewLegend({ panels, variant = "default", className }: PreviewLegendProps) {
  const isSidebar = variant === "sidebar";

  return (
    <div className={cn("mt-4 flex flex-wrap justify-center gap-2", className)}>
      {panels.map((kind, index) => (
        <span
          key={`${kind}-${index}`}
          className={cn(
            "rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
            kind === "glass"
              ? isSidebar
                ? "bg-sky-900/50 text-sky-300"
                : "bg-sky-100 text-sky-800"
              : isSidebar
                ? "bg-slate-700 text-slate-300"
                : "bg-slate-200 text-slate-700",
          )}
        >
          {index + 1}: {panelLabel(kind)}
        </span>
      ))}
    </div>
  );
}
