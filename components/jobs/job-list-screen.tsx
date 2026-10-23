"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  JOB_STATUS_LABELS,
  listJobs,
  type JobStatus,
  type WorkshopJob,
} from "@/lib/jobs";
import type { ModuleNavParams } from "@/lib/module-menu";
import { cn } from "@/lib/utils";

import { formatShortDate, formatTimeAgo } from "@/components/dashboard/dashboard-utils";
import { ModuleBackBar } from "@/components/module-menu/module-back-bar";
import type { ModuleMenuId } from "@/lib/module-menu";

const STATUS_STYLES: Record<JobStatus, string> = {
  draft: "bg-slate-100 text-slate-700",
  "measurement-pending": "bg-amber-100 text-amber-800",
  measured: "bg-sky-100 text-sky-800",
  "estimation-ready": "bg-indigo-100 text-indigo-800",
  "quotation-ready": "bg-violet-100 text-violet-800",
  "quotation-sent": "bg-purple-100 text-purple-800",
  approved: "bg-emerald-100 text-emerald-800",
  "in-production": "bg-orange-100 text-orange-800",
  "installation-pending": "bg-teal-100 text-teal-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-rose-100 text-rose-800",
};

const FILTER_TITLES: Record<
  NonNullable<ModuleNavParams["jobStatusFilter"]>,
  string
> = {
  all: "All Jobs",
  active: "Active Jobs",
  draft: "Draft Jobs",
  "quotation-ready": "Quotation Ready",
  approved: "Approved Jobs",
  "in-production": "In Production",
  completed: "Completed Jobs",
  search: "Search Jobs",
  cancelled: "Archived Jobs",
  archived: "Archived Jobs",
  "measurement-pending": "Measurement Pending",
  measured: "Measured",
  "estimation-ready": "Estimation Ready",
  "quotation-sent": "Quotation Sent",
  "installation-pending": "Installation Pending",
};

function matchesFilter(
  job: WorkshopJob,
  filter: NonNullable<ModuleNavParams["jobStatusFilter"]>,
): boolean {
  switch (filter) {
    case "all":
      return true;
    case "active":
      return job.status !== "completed" && job.status !== "cancelled";
    case "archived":
    case "cancelled":
      return job.status === "cancelled";
    case "search":
      return true;
    default:
      return job.status === filter;
  }
}

type JobListScreenProps = {
  filter: NonNullable<ModuleNavParams["jobStatusFilter"]>;
  activeJobId: string;
  returnMenu: ModuleMenuId;
  onSelectJob: (jobId: string) => void;
  onBackToMenu: () => void;
  onBackToHome: () => void;
};

export function JobListScreen({
  filter,
  activeJobId,
  returnMenu,
  onSelectJob,
  onBackToMenu,
  onBackToHome,
}: JobListScreenProps) {
  const [query, setQuery] = useState("");
  const title = FILTER_TITLES[filter] ?? "Jobs";

  const jobs = useMemo(() => {
    const all = listJobs().filter((job) => matchesFilter(job, filter));
    if (filter !== "search" || !query.trim()) return all;
    const q = query.trim().toLowerCase();
    return all.filter(
      (job) =>
        job.id.toLowerCase().includes(q) ||
        job.customerName.toLowerCase().includes(q) ||
        job.projectName.toLowerCase().includes(q) ||
        job.siteAddress.toLowerCase().includes(q),
    );
  }, [filter, query]);

  return (
    <div className="min-h-full bg-[#f4f7fc]">
      <ModuleBackBar
        returnMenu={returnMenu}
        onBackToMenu={onBackToMenu}
        onBackToHome={onBackToHome}
      />

      <div className="mx-auto max-w-3xl space-y-4 px-4 py-6 pb-[calc(6.5rem+env(safe-area-inset-bottom))]">
        <header>
          <h1 className="text-xl font-bold text-slate-900">{title}</h1>
          <p className="mt-0.5 text-sm text-slate-600">
            {jobs.length} job{jobs.length === 1 ? "" : "s"} found
          </p>
        </header>

        {filter === "search" ? (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Customer name, project or job ID"
              className="pl-9"
              aria-label="Search jobs"
            />
          </div>
        ) : null}

        {jobs.length === 0 ? (
          <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
            <h3 className="text-base font-bold text-slate-900">No jobs in this list</h3>
            <p className="mt-1 text-sm text-slate-600">
              Try another filter or create a new window or door from Home.
            </p>
          </section>
        ) : (
          <ul className="space-y-3">
            {jobs.map((job) => (
              <li
                key={job.id}
                className={cn(
                  "rounded-2xl border bg-white p-4 shadow-sm",
                  job.id === activeJobId
                    ? "border-violet-300 ring-1 ring-violet-200"
                    : "border-slate-200",
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-violet-700">{job.id}</p>
                    <p className="truncate text-base font-bold text-slate-900">
                      {job.customerName || "Unnamed customer"}
                    </p>
                    <p className="truncate text-sm text-slate-600">
                      {job.siteAddress || job.projectName || "—"}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold",
                      STATUS_STYLES[job.status],
                    )}
                  >
                    {JOB_STATUS_LABELS[job.status]}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2 text-xs text-slate-600">
                  <span>
                    Updated: <strong className="text-slate-900">{formatTimeAgo(job.updatedAt)}</strong>
                  </span>
                  <span className="text-[11px] text-slate-500">{formatShortDate(job.updatedAt)}</span>
                </div>

                <Button
                  type="button"
                  size="sm"
                  className="mt-3 w-full sm:w-auto"
                  onClick={() => onSelectJob(job.id)}
                >
                  Open Job
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
