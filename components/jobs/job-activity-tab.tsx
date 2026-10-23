"use client";

import { History } from "lucide-react";

import {
  AccentCard,
  AccentCardContent,
  AccentCardHeader,
  AccentCardTitle,
  PageHero,
  PageShell,
} from "@/components/workshop/workshop-ui";
import type { WorkshopJob } from "@/lib/jobs";

type JobActivityTabProps = {
  job: WorkshopJob;
};

export function JobActivityTab({ job }: JobActivityTabProps) {
  return (
    <PageShell>
      <PageHero
        title="Activity"
        description="Recent actions on this job."
        icon={History}
      />

      <AccentCard>
        <AccentCardHeader>
          <AccentCardTitle>Activity history</AccentCardTitle>
        </AccentCardHeader>
        <AccentCardContent className="space-y-3">
          {job.activity.length === 0 ? (
            <p className="text-sm text-slate-500">No activity recorded yet.</p>
          ) : (
            job.activity.map((entry) => (
              <div
                key={entry.id}
                className="rounded-xl border border-slate-200 px-4 py-3"
              >
                <p className="text-sm font-medium text-slate-900">{entry.summary}</p>
                <p className="text-xs text-slate-500">
                  {entry.user} · {new Date(entry.timestamp).toLocaleString()}
                  {entry.relatedRecordId ? ` · ${entry.relatedRecordId}` : ""}
                </p>
              </div>
            ))
          )}
        </AccentCardContent>
      </AccentCard>
    </PageShell>
  );
}
