import { generateActivityId } from "./id-generator";
import type { JobActivityAction, JobActivityEntry, WorkshopJob } from "./types";

export function createActivityEntry(
  action: JobActivityAction,
  summary: string,
  user = "Workshop User",
  relatedRecordId?: string,
): JobActivityEntry {
  return {
    id: generateActivityId(),
    action,
    user,
    timestamp: new Date().toISOString(),
    relatedRecordId,
    summary,
  };
}

export function appendActivity(
  job: WorkshopJob,
  action: JobActivityAction,
  summary: string,
  user?: string,
  relatedRecordId?: string,
): WorkshopJob {
  const entry = createActivityEntry(action, summary, user, relatedRecordId);
  return {
    ...job,
    activity: [entry, ...job.activity].slice(0, 200),
    updatedAt: entry.timestamp,
  };
}
