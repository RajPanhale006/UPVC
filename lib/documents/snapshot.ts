import type { SourceSnapshot } from "./types";

export function hashSnapshot(data: unknown): string {
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return `h${Math.abs(hash).toString(36)}`;
}

export function buildSourceSnapshot(
  summary: string,
  payload: Record<string, unknown>,
): SourceSnapshot {
  return {
    hash: hashSnapshot(payload),
    summary,
    dimensions: payload.dimensions as string | undefined,
    quantity: payload.quantity as number | undefined,
    configuration: payload.configuration as string | undefined,
    rate: payload.rate as number | undefined,
    gst: payload.gst as number | undefined,
    grandTotal: payload.grandTotal as number | undefined,
    terms: payload.terms as string | undefined,
    companyDetails: payload.companyDetails as string | undefined,
  };
}

export function snapshotsMatch(a: SourceSnapshot, b: SourceSnapshot): boolean {
  return a.hash === b.hash;
}

export function describeSnapshotChanges(
  previous: SourceSnapshot,
  current: SourceSnapshot,
): string[] {
  const changes: string[] = [];
  if (previous.dimensions !== current.dimensions) changes.push("Dimensions changed");
  if (previous.quantity !== current.quantity) changes.push("Quantity changed");
  if (previous.configuration !== current.configuration) changes.push("Configuration changed");
  if (previous.rate !== current.rate) changes.push("Rate changed");
  if (previous.gst !== current.gst) changes.push("GST changed");
  if (previous.grandTotal !== current.grandTotal) changes.push("Grand total changed");
  if (previous.terms !== current.terms) changes.push("Terms changed");
  if (previous.companyDetails !== current.companyDetails) changes.push("Company details changed");
  if (changes.length === 0 && !snapshotsMatch(previous, current)) {
    changes.push("Source data changed");
  }
  return changes;
}
