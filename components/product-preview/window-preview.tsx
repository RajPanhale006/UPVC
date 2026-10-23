"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";

import { DimensionLabels } from "./dimension-labels";
import { PreviewFrame } from "./preview-frame";
import { PreviewLegend } from "./preview-legend";
import type { PreviewFrameVariant, PreviewMode, ProductPreviewData } from "./preview-types";
import {
  buildLayoutKey,
  computePreviewSizing,
  getProfileFrameStyle,
  getWindowPanelLayout,
  modeShowsDimensions,
  modeShowsLabels,
  modeShowsLegend,
  modeUsesPdfSafeSvg,
} from "./preview-utils";

type WindowPreviewProps = {
  data: ProductPreviewData;
  mode?: PreviewMode;
  variant?: PreviewFrameVariant;
  className?: string;
  /** When true, render SVG only without PreviewFrame chrome (embedded use). */
  svgOnly?: boolean;
};

export function WindowPreview({
  data,
  mode = "detailed",
  variant = "default",
  className,
  svgOnly = false,
}: WindowPreviewProps) {
  const windowConfig = data.window;

  const panels = useMemo(
    () =>
      windowConfig
        ? windowConfig.panels ??
          getWindowPanelLayout(windowConfig.trackSystemId, windowConfig.sashLayout)
        : [],
    [windowConfig],
  );

  const layoutKey = useMemo(() => buildLayoutKey(data), [data]);
  const [panelAnimKey, setPanelAnimKey] = useState(0);
  const prevLayoutKey = useRef(layoutKey);

  useEffect(() => {
    if (prevLayoutKey.current !== layoutKey) {
      prevLayoutKey.current = layoutKey;
      setPanelAnimKey((current) => current + 1);
    }
  }, [layoutKey]);

  const svgUid = useId().replace(/:/g, "");

  if (!windowConfig) return null;

  const profileStyle = getProfileFrameStyle(windowConfig.trackSystemId);
  const sizing = computePreviewSizing(data.widthMm, data.heightMm, mode);
  const pdfSafe = modeUsesPdfSafeSvg(mode);
  const isSidebar = variant === "sidebar";

  const { viewW, viewH } = sizing;
  const framePad = mode === "thumbnail" ? 10 : 14;
  const railH = mode === "thumbnail" ? 7 : 10;
  const innerX = framePad;
  const innerY = framePad + railH;
  const innerW = viewW - framePad * 2;
  const innerH = viewH - framePad * 2 - railH * 2;
  const panelW = innerW / panels.length;
  const gap = 3;

  const title = `${windowConfig.trackLabel ?? "Window"} preview`;
  const viewLabel =
    data.viewFrom === "outside" ? "View From Outside" : "View From Inside";

  const svg = (
    <svg
      viewBox={`0 0 ${viewW} ${viewH}`}
      className={cn(
        "mx-auto h-auto w-full",
        !pdfSafe && "drop-shadow-md transition-all duration-500 ease-out",
      )}
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <desc>
        {viewLabel}. Width {Math.round(data.widthMm)} mm, height{" "}
        {Math.round(data.heightMm)} mm.
      </desc>
      <defs>
        <linearGradient id={`${svgUid}-glassFill`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#BAE6FD" stopOpacity="0.95" />
          <stop offset="50%" stopColor="#7DD3FC" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.55" />
        </linearGradient>
        <linearGradient id={`${svgUid}-frameFill`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={profileStyle.fillTop} />
          <stop offset="100%" stopColor={profileStyle.fillBottom} />
        </linearGradient>
        <pattern
          id={`${svgUid}-meshPattern`}
          width="8"
          height="8"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M0 8 L8 0 M-2 2 L2 -2 M6 10 L10 6"
            stroke="#94A3B8"
            strokeWidth="0.8"
          />
        </pattern>
        {!pdfSafe ? (
          <filter id={`${svgUid}-panelShadow`} x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodOpacity="0.15" />
          </filter>
        ) : null}
      </defs>

      <rect
        x={4}
        y={4}
        width={viewW - 8}
        height={viewH - 8}
        rx={6}
        fill={`url(#${svgUid}-frameFill)`}
        stroke={profileStyle.stroke}
        strokeWidth={3}
      />

      <rect
        x={innerX}
        y={framePad}
        width={innerW}
        height={railH}
        rx={2}
        fill={profileStyle.rail}
        opacity={0.9}
      />
      <rect
        x={innerX}
        y={viewH - framePad - railH}
        width={innerW}
        height={railH}
        rx={2}
        fill={profileStyle.rail}
        opacity={0.9}
      />

      {panels.map((kind, index) => {
        const x = innerX + index * panelW + gap / 2;
        const w = Math.max(panelW - gap, 20);
        const isGlass = kind === "glass";
        return (
          <g
            key={`${panelAnimKey}-${kind}-${index}`}
            filter={!pdfSafe ? `url(#${svgUid}-panelShadow)` : undefined}
            className={!pdfSafe ? "visualizer-panel-slide" : undefined}
            style={!pdfSafe ? { animationDelay: `${index * 90}ms` } : undefined}
          >
            <rect
              x={x}
              y={innerY}
              width={w}
              height={innerH}
              rx={3}
              fill={isGlass ? `url(#${svgUid}-glassFill)` : "#CBD5E1"}
              stroke={isGlass ? "#0EA5E9" : "#64748B"}
              strokeWidth={1.5}
            />
            {!isGlass ? (
              <rect
                x={x}
                y={innerY}
                width={w}
                height={innerH}
                rx={3}
                fill={`url(#${svgUid}-meshPattern)`}
                opacity={0.65}
              />
            ) : (
              <line
                x1={x + w * 0.15}
                y1={innerY + innerH * 0.2}
                x2={x + w * 0.35}
                y2={innerY + innerH * 0.45}
                stroke="white"
                strokeWidth={1.2}
                opacity={0.5}
              />
            )}
            {modeShowsLabels(mode, data) ? (
              <text
                x={x + w / 2}
                y={innerY + innerH / 2 + 4}
                textAnchor="middle"
                fontSize={mode === "thumbnail" ? 7 : 9}
                fontWeight={600}
                fill={isGlass ? "#0369A1" : "#475569"}
              >
                {isGlass ? "GLASS" : "NET"}
              </text>
            ) : null}
          </g>
        );
      })}

      {modeShowsLabels(mode, data) && mode !== "compact" ? (
        <text
          x={viewW / 2}
          y={innerY - 2}
          textAnchor="middle"
          fontSize={8}
          fontWeight={600}
          fill="#64748B"
        >
          {viewLabel}
        </text>
      ) : null}

      {modeShowsDimensions(mode, data) ? (
        <DimensionLabels
          viewW={viewW}
          viewH={viewH}
          widthMm={data.widthMm}
          heightMm={data.heightMm}
          framePad={framePad}
          compact={mode === "compact" || mode === "thumbnail"}
        />
      ) : null}
    </svg>
  );

  const body = (
    <div
      className={cn(
        svgOnly ? className : "mx-auto grid-dots rounded-xl p-3",
        !svgOnly && isSidebar && "bg-transparent",
      )}
      style={svgOnly ? undefined : { maxWidth: sizing.maxWidthPx }}
    >
      {svg}
    </div>
  );

  if (svgOnly) return body;

  const legend =
    modeShowsLegend(mode, data) ? (
      <PreviewLegend panels={panels} variant={variant} />
    ) : null;

  return (
    <PreviewFrame
      data={data}
      mode={mode}
      variant={variant}
      className={className}
      legend={legend}
    >
      {body}
    </PreviewFrame>
  );
}
