"use client";

import type { CuttingOptions, TrackSystemId } from "@/lib/cutting/types";

import {
  buildWindowPreviewData,
  ProductPreview,
} from "@/components/product-preview";

type WindowVisualizerProps = {
  trackSystemId: TrackSystemId;
  widthMm: number;
  heightMm: number;
  cuttingOptions?: CuttingOptions;
  className?: string;
  compact?: boolean;
  variant?: "default" | "sidebar";
};

/** @deprecated Prefer ProductPreview — preserved for backward compatibility. */
export function WindowVisualizer({
  trackSystemId,
  widthMm,
  heightMm,
  cuttingOptions,
  className,
  compact = false,
  variant = "default",
}: WindowVisualizerProps) {
  const data = buildWindowPreviewData({
    trackSystemId,
    widthMm,
    heightMm,
    cuttingOptions,
  });

  return (
    <ProductPreview
      data={data}
      variant={variant}
      compact={compact}
      className={className}
    />
  );
}
