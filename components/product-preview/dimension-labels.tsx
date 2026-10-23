import { formatPreviewDim } from "./preview-utils";

type DimensionLabelsProps = {
  viewW: number;
  viewH: number;
  widthMm: number;
  heightMm: number;
  framePad?: number;
  compact?: boolean;
};

export function DimensionLabels({
  viewW,
  viewH,
  widthMm,
  heightMm,
  framePad = 14,
  compact = false,
}: DimensionLabelsProps) {
  const fontSize = compact ? 8 : 10;
  return (
    <g aria-hidden="true">
      <line
        x1={framePad}
        y1={viewH - 2}
        x2={viewW - framePad}
        y2={viewH - 2}
        stroke="#2563EB"
        strokeWidth={1}
      />
      <text
        x={viewW / 2}
        y={viewH - 6}
        textAnchor="middle"
        fontSize={fontSize}
        fontWeight={600}
        fill="#2563EB"
      >
        W {formatPreviewDim(widthMm)}
      </text>
      <text
        x={viewW - 6}
        y={viewH / 2}
        textAnchor="end"
        fontSize={fontSize}
        fontWeight={600}
        fill="#4F46E5"
        transform={`rotate(-90 ${viewW - 6} ${viewH / 2})`}
      >
        H {formatPreviewDim(heightMm)}
      </text>
    </g>
  );
}
