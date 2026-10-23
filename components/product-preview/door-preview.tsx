"use client";

import { useId } from "react";

import { cn } from "@/lib/utils";

import { DimensionLabels } from "./dimension-labels";
import { OpeningDirection } from "./opening-direction";
import { PreviewFrame } from "./preview-frame";
import { PreviewLegend } from "./preview-legend";
import type { PreviewFrameVariant, PreviewMode, ProductPreviewData } from "./preview-types";
import {
  computePreviewSizing,
  modeShowsDimensions,
  modeShowsLabels,
  modeShowsLegend,
  modeUsesPdfSafeSvg,
} from "./preview-utils";

type DoorPreviewProps = {
  data: ProductPreviewData;
  mode?: PreviewMode;
  variant?: PreviewFrameVariant;
  className?: string;
  svgOnly?: boolean;
};

export function DoorPreview({
  data,
  mode = "detailed",
  variant = "default",
  className,
  svgOnly = false,
}: DoorPreviewProps) {
  const door = data.door;
  const svgUid = useId().replace(/:/g, "");

  if (!door) return null;

  const sizing = computePreviewSizing(data.widthMm, data.heightMm, mode);
  const pdfSafe = modeUsesPdfSafeSvg(mode);
  const { viewW, viewH } = sizing;

  const framePad = mode === "thumbnail" ? 10 : 14;
  const thresholdH = door.hasThreshold !== false ? (mode === "thumbnail" ? 5 : 8) : 0;
  const innerX = framePad;
  const innerY = framePad + 4;
  const innerW = viewW - framePad * 2;
  const innerH = viewH - framePad * 2 - thresholdH - 4;
  const isDouble = door.configuration === "double";
  const leafGap = isDouble ? 4 : 0;
  const leafW = isDouble ? (innerW - leafGap) / 2 : innerW;
  const panelType = door.panelType ?? "glass";
  const viewLabel =
    data.viewFrom === "outside" ? "View From Outside" : "View From Inside";

  const leaves = isDouble
    ? ([
        { x: innerX, label: door.activeLeaf === "left" ? "ACTIVE" : "PASSIVE", active: door.activeLeaf === "left" },
        {
          x: innerX + leafW + leafGap,
          label: door.activeLeaf === "right" ? "ACTIVE" : "PASSIVE",
          active: door.activeLeaf === "right",
        },
      ] as const)
    : ([{ x: innerX, label: "SASH", active: true }] as const);

  const svg = (
    <svg
      viewBox={`0 0 ${viewW} ${viewH}`}
      className={cn("mx-auto h-auto w-full", !pdfSafe && "drop-shadow-md")}
      role="img"
      aria-label={`${isDouble ? "Double" : "Single"} door preview`}
    >
      <title>{isDouble ? "Double door" : "Single door"} preview</title>
      <desc>
        {viewLabel}. {door.openingSide}-hand {door.openingDirection} opening.
      </desc>
      <defs>
        <linearGradient id={`${svgUid}-glassFill`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#BAE6FD" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.55" />
        </linearGradient>
        <linearGradient id={`${svgUid}-frameFill`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FAFAF9" />
          <stop offset="100%" stopColor="#D6D3D1" />
        </linearGradient>
      </defs>

      {/* Outer frame */}
      <rect
        x={4}
        y={4}
        width={viewW - 8}
        height={viewH - 8}
        rx={5}
        fill={`url(#${svgUid}-frameFill)`}
        stroke="#57534E"
        strokeWidth={3}
      />

      {leaves.map((leaf, index) => {
        const handleX =
          door.openingSide === "left"
            ? leaf.x + leafW * 0.82
            : leaf.x + leafW * 0.18;
        const hingeX =
          door.openingSide === "left"
            ? leaf.x + 6
            : leaf.x + leafW - 6;
        const isGlass = panelType === "glass";

        return (
          <g key={index}>
            <rect
              x={leaf.x}
              y={innerY}
              width={leafW}
              height={innerH}
              rx={3}
              fill={isGlass ? `url(#${svgUid}-glassFill)` : "#E7E5E4"}
              stroke="#78716C"
              strokeWidth={1.5}
            />
            {modeShowsLabels(mode, data) ? (
              <text
                x={leaf.x + leafW / 2}
                y={innerY + innerH / 2}
                textAnchor="middle"
                fontSize={mode === "thumbnail" ? 7 : 9}
                fontWeight={600}
                fill={isGlass ? "#0369A1" : "#57534E"}
              >
                {isGlass ? "GLASS" : "PANEL"}
              </text>
            ) : null}
            {modeShowsLabels(mode, data) && isDouble ? (
              <text
                x={leaf.x + leafW / 2}
                y={innerY + 12}
                textAnchor="middle"
                fontSize={7}
                fontWeight={700}
                fill={leaf.active ? "#2563EB" : "#94A3B8"}
              >
                {leaf.label}
              </text>
            ) : null}
            {/* Hinges */}
            {[0.22, 0.5, 0.78].map((ratio) => (
              <rect
                key={ratio}
                x={hingeX - 2}
                y={innerY + innerH * ratio - 4}
                width={4}
                height={8}
                rx={1}
                fill="#44403C"
              />
            ))}
            {/* Handle */}
            <rect
              x={handleX - 2}
              y={innerY + innerH * 0.48}
              width={4}
              height={14}
              rx={2}
              fill="#1E293B"
            />
            <circle cx={handleX} cy={innerY + innerH * 0.56} r={3} fill="#64748B" />
            {leaf.active ? (
              <OpeningDirection
                x={leaf.x}
                y={innerY}
                width={leafW}
                height={innerH}
                openingSide={door.openingSide}
                openingDirection={door.openingDirection}
                viewFrom={data.viewFrom ?? "inside"}
                compact={mode === "thumbnail" || mode === "compact"}
              />
            ) : null}
          </g>
        );
      })}

      {/* Flat mullion / meeting stile */}
      {isDouble && door.showFlatMullion !== false ? (
        <rect
          x={innerX + leafW}
          y={innerY}
          width={leafGap || 3}
          height={innerH}
          fill="#78716C"
        />
      ) : null}

      {/* Shoot bolts indicator (double door) */}
      {isDouble && door.showShootBolts ? (
        <>
          <rect
            x={innerX + leafW - 8}
            y={innerY + innerH - 18}
            width={6}
            height={10}
            rx={1}
            fill="#475569"
          />
          <rect
            x={innerX + leafW + leafGap + 2}
            y={innerY + innerH - 18}
            width={6}
            height={10}
            rx={1}
            fill="#475569"
          />
        </>
      ) : null}

      {/* Threshold */}
      {thresholdH > 0 ? (
        <rect
          x={innerX}
          y={viewH - framePad - thresholdH}
          width={innerW}
          height={thresholdH}
          fill="#A8A29E"
        />
      ) : null}

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
      className={cn(svgOnly ? className : "mx-auto grid-dots rounded-xl p-3")}
      style={svgOnly ? undefined : { maxWidth: sizing.maxWidthPx }}
    >
      {svg}
    </div>
  );

  if (svgOnly) return body;

  const legendPanels = isDouble
    ? (["glass", "glass"] as const)
    : ([panelType === "glass" ? "glass" : "solid"] as const);

  const legend = modeShowsLegend(mode, data) ? (
    <PreviewLegend
      panels={[...legendPanels]}
      variant={variant}
    />
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
