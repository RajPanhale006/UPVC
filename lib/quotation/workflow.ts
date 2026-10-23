import type { QuotationForm, QuotationStatus, QuotationWindowRow } from "./types";
import { formatQuotationIdWithRevision, generateQuotationId } from "@/lib/jobs/id-generator";
import type { StoredQuotationRevision, WorkshopJob } from "@/lib/jobs/types";
import { appendActivity } from "@/lib/jobs/activity";
import { getCurrentUserName } from "@/lib/jobs/permissions";

export const QUOTATION_STATUS_LABELS: Record<QuotationStatus, string> = {
  draft: "Draft",
  ready: "Ready",
  sent: "Sent",
  viewed: "Viewed",
  approved: "Approved",
  rejected: "Rejected",
  expired: "Expired",
  superseded: "Superseded",
  cancelled: "Cancelled",
};

export const CUSTOM_CHARGE_LABELS: Record<
  import("./types").CustomChargeType,
  string
> = {
  installation: "Installation",
  transportation: "Transportation",
  "additional-hardware": "Additional Hardware",
  "civil-work": "Civil Work",
  removal: "Removal of Old Windows",
  other: "Other Charge",
};

function nowIso(): string {
  return new Date().toISOString();
}

export function getQuotationDisplayId(form: QuotationForm): string {
  const id = form.quotationId ?? generateQuotationId();
  return formatQuotationIdWithRevision(id, form.revision ?? 1);
}

export function isQuotationLocked(status?: QuotationStatus): boolean {
  return status === "approved" || status === "sent" || status === "superseded";
}

export function requiresRevisionToEdit(status?: QuotationStatus): boolean {
  return status === "approved" || status === "sent";
}

export function saveQuotationRevision(job: WorkshopJob, form: QuotationForm): WorkshopJob {
  const user = getCurrentUserName();
  const quotationId = form.quotationId ?? generateQuotationId();
  const revision = form.revision ?? 1;
  const stored: StoredQuotationRevision = {
    quotationId,
    revision,
    form: { ...form, quotationId, revision },
    savedAt: nowIso(),
    savedBy: user,
  };

  const existing = job.quotationRevisions.filter(
    (r) => !(r.quotationId === quotationId && r.revision === revision),
  );

  return {
    ...job,
    quotation: stored.form,
    quotationRevisions: [stored, ...existing].slice(0, 50),
    updatedAt: nowIso(),
  };
}

export function duplicateQuotationAsRevision(job: WorkshopJob): WorkshopJob {
  const current = job.quotation;
  const quotationId = current.quotationId ?? generateQuotationId();
  const nextRevision = (current.revision ?? 1) + 1;
  const nextForm: QuotationForm = {
    ...current,
    quotationId,
    revision: nextRevision,
    status: "draft",
    sentAt: undefined,
    approvedAt: undefined,
    rejectedAt: undefined,
  };

  let next = saveQuotationRevision(job, nextForm);
  next = appendActivity(
    next,
    "quotation-created",
    `Created revision ${getQuotationDisplayId(nextForm)}`,
    getCurrentUserName(),
    quotationId,
  );
  return next;
}

export function setQuotationStatus(
  job: WorkshopJob,
  status: QuotationStatus,
): WorkshopJob {
  const ts = nowIso();
  const form: QuotationForm = {
    ...job.quotation,
    status,
    sentAt: status === "sent" ? ts : job.quotation.sentAt,
    approvedAt: status === "approved" ? ts : job.quotation.approvedAt,
    rejectedAt: status === "rejected" ? ts : job.quotation.rejectedAt,
  };

  let next = { ...job, quotation: form, updatedAt: ts };
  const action =
    status === "sent"
      ? "quotation-sent"
      : status === "approved"
        ? "quotation-approved"
        : status === "rejected"
          ? "quotation-rejected"
          : "quotation-updated";

  next = appendActivity(
    next,
    action,
    `Quotation marked as ${QUOTATION_STATUS_LABELS[status]}`,
    getCurrentUserName(),
    form.quotationId,
  );
  return saveQuotationRevision(next, form);
}

export type DuplicateProductChoice = "update" | "separate" | "cancel";

export function findMatchingQuotationRow(
  rows: QuotationWindowRow[],
  productId: string,
): QuotationWindowRow | undefined {
  return rows.find((r) => r.productId === productId);
}

export function rowsAreSimilar(a: QuotationWindowRow, b: QuotationWindowRow): boolean {
  return (
    a.productId === b.productId &&
    a.windowType === b.windowType &&
    a.length === b.length &&
    a.height === b.height &&
    a.unit === b.unit
  );
}

export function updateQuotationRowFromProduct(
  row: QuotationWindowRow,
  next: QuotationWindowRow,
): QuotationWindowRow {
  return { ...row, ...next, id: row.id };
}

export function createCustomCharge(
  type: import("./types").CustomChargeType,
  amount = 0,
): import("./types").CustomCharge {
  return {
    id: `charge-${Date.now()}`,
    type,
    description: CUSTOM_CHARGE_LABELS[type],
    amount,
  };
}

export function groupIdenticalRows(rows: QuotationWindowRow[]): QuotationWindowRow[] {
  const groups = new Map<string, QuotationWindowRow[]>();
  for (const row of rows) {
    const key = `${row.windowType}|${row.length}|${row.height}|${row.unit}|${row.ratePerSqFt}|${row.profileLabel ?? ""}`;
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }

  const result: QuotationWindowRow[] = [];
  for (const [, group] of groups) {
    if (group.length === 1) {
      result.push(group[0]!);
      continue;
    }
    const groupId = `grp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const totalQty = group.reduce((s, r) => s + r.quantity, 0);
    const merged: QuotationWindowRow = {
      ...group[0]!,
      id: group[0]!.id,
      quantity: totalQty,
      groupId,
      hardwareNotes: [group[0]!.hardwareNotes, `(×${group.length} grouped)`]
        .filter(Boolean)
        .join(" "),
    };
    result.push(merged);
  }
  return result;
}

export function ungroupRows(rows: QuotationWindowRow[]): QuotationWindowRow[] {
  return rows.map((r) => {
    const { groupId: _g, ...rest } = r;
    return rest;
  });
}

export function duplicateLineItem(row: QuotationWindowRow): QuotationWindowRow {
  return {
    ...row,
    id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    productId: undefined,
    groupId: undefined,
  };
}

export function reorderLineItems(
  rows: QuotationWindowRow[],
  fromIndex: number,
  toIndex: number,
): QuotationWindowRow[] {
  const next = [...rows];
  const [item] = next.splice(fromIndex, 1);
  if (!item) return rows;
  next.splice(toIndex, 0, item);
  return next;
}
