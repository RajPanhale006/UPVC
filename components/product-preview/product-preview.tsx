"use client";

import { DoorPreview } from "./door-preview";
import type { ProductPreviewProps } from "./preview-types";
import { WindowPreview } from "./window-preview";

export function ProductPreview({
  data,
  mode = "detailed",
  variant = "default",
  className,
  compact,
  svgOnly,
}: ProductPreviewProps) {
  const effectiveMode = compact && mode === "detailed" ? "compact" : mode;

  if (data.productType === "door") {
    return (
      <DoorPreview
        data={data}
        mode={effectiveMode}
        variant={variant}
        className={className}
        svgOnly={svgOnly}
      />
    );
  }

  return (
    <WindowPreview
      data={data}
      mode={effectiveMode}
      variant={variant}
      className={className}
      svgOnly={svgOnly}
    />
  );
}

export type { ProductPreviewData, ProductPreviewProps, PreviewMode } from "./preview-types";
export {
  buildDoorPreviewData,
  buildPreviewDataFromEstimation,
  buildPreviewDataFromQuotationRow,
  buildWindowPreviewData,
  resolveQuotationPreviewData,
} from "./preview-mapper";
