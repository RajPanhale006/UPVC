"use client";

import { DoorOpen, PanelsTopLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  JOB_STATUS_LABELS,
  listJobs,
  type JobStatus,
  type WorkshopJob,
} from "@/lib/jobs";
import { canSendQuotation } from "@/lib/jobs/permissions";
import { calculateQuotation } from "@/lib/quotation";
import { cn } from "@/lib/utils";

import { formatShortDate, formatTimeAgo } from "./dashboard-utils";

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

function countProducts(job: WorkshopJob) {
  const windows = job.products.filter((p) => p.productKind === "window").length;
  const doors = job.products.filter((p) => p.productKind === "door").length;
  return { windows, doors };
}

function formatQuotationTotal(job: WorkshopJob): string | null {
  if (!canSendQuotation()) return null;
  try {
    const result = calculateQuotation(job.quotation);
    return `₹${result.totals.grandTotal.toLocaleString("en-IN")}`;
  } catch {
    return null;
  }
}

type RecentJobsProps = {
  activeJobId: string;
  onContinue: (jobId: string) => void;
  onAddWindow: () => void;
  onAddDoor: () => void;
};

export function RecentJobs({
  activeJobId,
  onContinue,
  onAddWindow,
  onAddDoor,
}: RecentJobsProps) {
  const jobs = listJobs().slice(0, 8);

  if (jobs.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center shadow-sm">
        <h3 className="text-base font-bold text-slate-900">No jobs created yet.</h3>
        <p className="mt-1 text-sm text-slate-600">
          Start by adding a new window or door.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Button type="button" onClick={onAddWindow} className="gap-2">
            <PanelsTopLeft className="size-4" />
            Add Window
          </Button>
          <Button type="button" variant="outline" onClick={onAddDoor} className="gap-2">
            <DoorOpen className="size-4" />
            Add Door
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="recent-jobs-heading">
      <h3 id="recent-jobs-heading" className="mb-3 text-sm font-bold text-slate-900">
        Recent Jobs
      </h3>
      <ul className="space-y-3">
        {jobs.map((job) => {
          const { windows, doors } = countProducts(job);
          const quotationTotal = formatQuotationTotal(job);
          const location = job.siteAddress || job.projectName || "—";

          return (
            <li
              key={job.id}
              className={cn(
                "rounded-2xl border bg-white p-4 shadow-sm",
                job.id === activeJobId ? "border-violet-300 ring-1 ring-violet-200" : "border-slate-200",
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-violet-700">{job.id}</p>
                  <p className="truncate text-base font-bold text-slate-900">
                    {job.customerName || "Unnamed customer"}
                  </p>
                  <p className="truncate text-sm text-slate-600">{location}</p>
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

              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                <span>
                  Windows: <strong className="text-slate-900">{windows}</strong>
                </span>
                <span>
                  Doors: <strong className="text-slate-900">{doors}</strong>
                </span>
                <span>
                  Updated: <strong className="text-slate-900">{formatTimeAgo(job.updatedAt)}</strong>
                </span>
                {quotationTotal ? (
                  <span>
                    Quotation: <strong className="text-slate-900">{quotationTotal}</strong>
                  </span>
                ) : null}
              </div>

              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-500">{formatShortDate(job.updatedAt)}</span>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => onContinue(job.id)}
                  aria-label={`Continue job ${job.id}`}
                >
                  Continue
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
