"use client";

import type { ReactNode } from "react";
import { Layers, Maximize2 } from "lucide-react";

import { cn } from "@/lib/utils";

import type { PreviewFrameVariant, PreviewMode, ProductPreviewData } from "./preview-types";

type PreviewFrameProps = {
  data: ProductPreviewData;
  mode?: PreviewMode;
  variant?: PreviewFrameVariant;
  className?: string;
  children: ReactNode;
  legend?: ReactNode;
};

export function PreviewFrame({
  data,
  mode = "detailed",
  variant = "default",
  className,
  children,
  legend,
}: PreviewFrameProps) {
  if (variant === "bare" || mode === "thumbnail" || mode === "pdf") {
    return (
      <div className={cn("relative", className)}>
        {children}
        {legend}
      </div>
    );
  }

  const isSidebar = variant === "sidebar";
  const title =
    data.productType === "window"
      ? data.window?.trackLabel ?? "Window"
      : data.door?.configuration === "double"
        ? "Double Door"
        : "Single Door";
  const subtitle =
    data.productType === "window" && data.window?.sashConfigurationLabel
      ? `${title} · ${data.window.sashConfigurationLabel}`
      : title;

  return (
    <div
      className={cn(
        "overflow-hidden",
        isSidebar
          ? "rounded-xl border border-white/10 bg-slate-800/40"
          : "rounded-[18px] border border-slate-200/80 bg-white shadow-[0_8px_30px_-12px_rgba(37,99,235,0.25)]",
        className,
      )}
    >
      {mode !== "compact" ? (
        <div
          className={cn(
            "flex items-center justify-between border-b px-4 py-3",
            isSidebar
              ? "border-white/5 bg-slate-900/40"
              : "border-slate-100 bg-gradient-to-r from-slate-50 to-white",
          )}
        >
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "flex size-8 items-center justify-center rounded-lg text-white shadow-sm",
                isSidebar
                  ? "bg-blue-600/80"
                  : "bg-gradient-to-br from-blue-600 to-indigo-600",
              )}
            >
              <Layers className="size-4" strokeWidth={2} />
            </div>
            <div>
              <p
                className={cn(
                  "text-xs font-semibold uppercase tracking-wider",
                  isSidebar ? "text-slate-500" : "text-slate-400",
                )}
              >
                {data.productType === "door" ? "Door preview" : "Window preview"}
              </p>
              <p
                className={cn(
                  "text-sm font-semibold",
                  isSidebar ? "text-slate-200" : "text-slate-900",
                )}
              >
                {subtitle}
              </p>
            </div>
          </div>
          {!isSidebar && data.profileCode ? (
            <div className="hidden items-center gap-2 sm:flex">
              <span className="rounded-lg bg-indigo-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-indigo-800">
                {data.profileCode}
              </span>
              <div className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                <Maximize2 className="size-3.5" />
                Live
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <div
        className={cn(
          "relative p-4",
          isSidebar ? "bg-slate-900/20 md:p-3" : "bg-[#F4F7FC] md:p-6",
        )}
      >
        {children}
        {legend}
      </div>
    </div>
  );
}
