import type { LucideIcon } from "lucide-react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import type { ReactNode } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type AccentTone =
  | "blue"
  | "violet"
  | "cyan"
  | "amber"
  | "emerald"
  | "rose"
  | "orange"
  | "indigo";

const accentBar: Record<AccentTone, string> = {
  blue: "bg-sky-500",
  violet: "bg-violet-500",
  cyan: "bg-cyan-500",
  amber: "bg-amber-500",
  emerald: "bg-emerald-500",
  rose: "bg-rose-500",
  orange: "bg-orange-500",
  indigo: "bg-indigo-500",
};

const statStyles: Record<
  AccentTone,
  { wrap: string; label: string; value: string; bar: string }
> = {
  blue: {
    wrap: "border-slate-200/80 bg-white",
    label: "text-slate-500",
    value: "text-slate-900",
    bar: "bg-sky-500",
  },
  violet: {
    wrap: "border-slate-200/80 bg-white",
    label: "text-slate-500",
    value: "text-slate-900",
    bar: "bg-violet-500",
  },
  cyan: {
    wrap: "border-slate-200/80 bg-white",
    label: "text-slate-500",
    value: "text-slate-900",
    bar: "bg-cyan-500",
  },
  amber: {
    wrap: "border-slate-200/80 bg-white",
    label: "text-slate-500",
    value: "text-slate-900",
    bar: "bg-amber-500",
  },
  emerald: {
    wrap: "border-slate-200/80 bg-white",
    label: "text-slate-500",
    value: "text-slate-900",
    bar: "bg-emerald-500",
  },
  rose: {
    wrap: "border-slate-200/80 bg-white",
    label: "text-slate-500",
    value: "text-slate-900",
    bar: "bg-rose-500",
  },
  orange: {
    wrap: "border-slate-200/80 bg-white",
    label: "text-slate-500",
    value: "text-slate-900",
    bar: "bg-orange-500",
  },
  indigo: {
    wrap: "border-slate-200/80 bg-white",
    label: "text-slate-500",
    value: "text-slate-900",
    bar: "bg-indigo-500",
  },
};

export function PageShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "page-enter mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:gap-7 md:px-8 md:py-8",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PageHero({
  icon: Icon,
  accent = "indigo",
  title,
  description,
  actions,
}: {
  icon: LucideIcon;
  accent?: AccentTone;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="rounded-[18px] border border-slate-200/80 bg-white p-6 shadow-[0_4px_24px_-8px_rgba(15,23,42,0.12)] md:p-7">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex gap-4">
          <div
            className={cn(
              "flex size-12 shrink-0 items-center justify-center rounded-xl text-white shadow-sm md:size-14",
              accentBar[accent],
            )}
          >
            <Icon className="size-6 md:size-7" strokeWidth={2} />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Shivshakti Workshop
            </p>
            <h1 className="mt-0.5 text-xl font-bold tracking-tight text-slate-900 md:text-2xl">
              {title}
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-600">
              {description}
            </p>
          </div>
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>
        ) : null}
      </div>
    </div>
  );
}

const bannerIcons = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
};

export function MessageBanner({
  children,
  tone = "info",
}: {
  children: ReactNode;
  tone?: "info" | "success" | "warning" | "error";
}) {
  const Icon = bannerIcons[tone];
  return (
    <div
      className={cn(
        "flex gap-3 rounded-xl border px-4 py-3 text-sm",
        tone === "info" && "border-sky-200 bg-sky-50 text-sky-950",
        tone === "success" && "border-emerald-200 bg-emerald-50 text-emerald-950",
        tone === "warning" && "border-amber-200 bg-amber-50 text-amber-950",
        tone === "error" && "border-rose-200 bg-rose-50 text-rose-950",
      )}
    >
      <Icon
        className={cn(
          "mt-0.5 size-5 shrink-0",
          tone === "info" && "text-sky-600",
          tone === "success" && "text-emerald-600",
          tone === "warning" && "text-amber-600",
          tone === "error" && "text-rose-600",
        )}
      />
      <div className="min-w-0 flex-1 leading-relaxed">{children}</div>
    </div>
  );
}

export function AccentCard({
  accent = "blue",
  className,
  children,
  ...props
}: React.ComponentProps<typeof Card> & { accent?: AccentTone }) {
  return (
    <Card
      className={cn(
        "overflow-hidden rounded-[18px] border border-slate-200/80 bg-white shadow-[0_4px_24px_-8px_rgba(15,23,42,0.1)]",
        className,
      )}
      {...props}
    >
      <div className={cn("h-0.5 w-full", accentBar[accent])} />
      {children}
    </Card>
  );
}

export function AccentCardHeader({
  className,
  ...props
}: React.ComponentProps<typeof CardHeader>) {
  return <CardHeader className={cn("pb-3 pt-5", className)} {...props} />;
}

export function AccentCardTitle({
  className,
  ...props
}: React.ComponentProps<typeof CardTitle>) {
  return (
    <CardTitle
      className={cn("text-base font-semibold tracking-tight text-slate-900", className)}
      {...props}
    />
  );
}

export {
  CardContent as AccentCardContent,
  CardDescription as AccentCardDescription,
};

export function StatCard({
  label,
  value,
  accent = "blue",
  className,
  sublabel,
}: {
  label: string;
  value: ReactNode;
  accent?: AccentTone;
  className?: string;
  sublabel?: string;
}) {
  const styles = statStyles[accent];
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border px-4 py-4 shadow-sm",
        styles.wrap,
        className,
      )}
    >
      <div className={cn("absolute bottom-0 left-0 top-0 w-0.5", styles.bar)} />
      <dt className={cn("pl-2.5 text-[10px] font-semibold uppercase tracking-wider", styles.label)}>
        {label}
      </dt>
      {sublabel ? (
        <p className={cn("mt-0.5 pl-2.5 text-[10px] font-medium opacity-70", styles.label)}>
          {sublabel}
        </p>
      ) : null}
      <dd className={cn("mt-2 pl-2.5 font-mono text-lg font-bold md:text-xl", styles.value)}>
        {value}
      </dd>
    </div>
  );
}

export function SectionLabel({
  children,
  accent = "indigo",
  className,
}: {
  children: ReactNode;
  accent?: AccentTone;
  className?: string;
}) {
  return (
    <h3
      className={cn(
        "inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500",
        className,
      )}
    >
      <span className={cn("inline-block size-1.5 rounded-full", accentBar[accent])} />
      {children}
    </h3>
  );
}

export function DataTable({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-x-auto rounded-xl border border-slate-200 bg-white",
        className,
      )}
    >
      <table className="w-full text-sm [&_tbody_tr:nth-child(even)]:bg-slate-50/60 [&_tbody_tr:hover]:bg-slate-50">
        {children}
      </table>
    </div>
  );
}

export function DataTableHead({ children }: { children: ReactNode }) {
  return (
    <thead>
      <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-600">
        {children}
      </tr>
    </thead>
  );
}
