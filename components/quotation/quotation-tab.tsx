"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Calculator,
  ClipboardPlus,
  Download,
  Eye,
  FileText,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";

import { addCurrentProductToQuotation, resolveDuplicateProductAdd } from "@/lib/calculations";

import {
  ProductPreview,
  resolveQuotationPreviewData,
} from "@/components/product-preview";
import { PdfPreviewModal } from "@/components/pdf/pdf-preview-modal";
import { PdfFeedback } from "@/components/pdf/pdf-feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AccentCard,
  AccentCardContent,
  AccentCardDescription,
  AccentCardHeader,
  AccentCardTitle,
  MessageBanner,
  PageHero,
  PageShell,
  SectionLabel,
  StatCard,
} from "@/components/workshop/workshop-ui";
import { pdfToBlobUrl, revokePdfBlobUrl } from "@/lib/pdf/preview";
import { getProductKind } from "@/lib/estimation";
import { formatInr } from "@/lib/profiles";
import {
  buildQuotationPdfAsync,
  calculateQuotation,
  computeQuotationAreaSummary,
  createWindowRow,
  DEFAULT_RATES,
  exportQuotationPdf,
  getDefaultQuotationForm,
  GST_PERCENT,
  GST_MODE_LABELS,
  PDF_PAGE_MODE_LABELS,
  loadQuotationForm,
  resetQuotationForm,
  saveQuotationForm,
  shouldApplyGstInTotal,
  UNIT_LABELS,
  WINDOW_TYPE_LABELS,
  WINDOW_TYPE_ORDER,
  type DimensionUnit,
  type GstMode,
  type PdfPageMode,
  type QuotationForm,
  type QuotationWindowRow,
  type WindowTypeId,
} from "@/lib/quotation";
import {
  createCustomCharge,
  duplicateQuotationAsRevision,
  getQuotationDisplayId,
  groupIdenticalRows,
  QUOTATION_STATUS_LABELS,
  requiresRevisionToEdit,
  setQuotationStatus,
  ungroupRows,
} from "@/lib/quotation/workflow";
import { pdfBlobFromJsPdf, registerGeneratedDocument } from "@/lib/documents";
import { loadCompanySettings } from "@/lib/company-settings";
import { validateBeforeDocument } from "@/lib/jobs/validation";
import {
  buildDefaultEmailBody,
  buildDefaultEmailSubject,
  buildMailtoFallback,
  sendQuotationEmail,
  validateEmailAddress,
} from "@/lib/sharing/email";
import {
  buildWhatsAppQuotationMessage,
  buildWhatsAppUrl,
} from "@/lib/sharing/whatsapp";
import { canEditQuotation, canSendQuotation } from "@/lib/jobs/permissions";

function parseNumber(value: string, fallback: number): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parsePositiveInt(value: string, fallback: number): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export type QuotationJobContext = {
  estimationInputs: import("@/lib/estimation/types").EstimationInputs;
  cuttingOptions: import("@/lib/cutting/types").CuttingOptions;
  profileRates: import("@/lib/profiles/types").ProfileRateSettings;
  cuttingJobMeta: import("@/lib/summary/types").CuttingJobMeta;
  job?: import("@/lib/jobs/types").WorkshopJob;
  activeProductId?: string;
  onJobChange?: (job: import("@/lib/jobs/types").WorkshopJob) => void;
};

type QuotationTabProps = {
  form?: QuotationForm;
  onFormChange?: (form: QuotationForm) => void;
  jobContext?: QuotationJobContext;
};

export function QuotationTab({
  form: controlledForm,
  onFormChange,
  jobContext,
}: QuotationTabProps) {
  const [internalForm, setInternalForm] = useState(getDefaultQuotationForm);
  const [hydrated, setHydrated] = useState(false);
  const [pdfMessage, setPdfMessage] = useState<string | null>(null);
  const [addMessage, setAddMessage] = useState<string | null>(null);
  const [duplicatePrompt, setDuplicatePrompt] = useState<{
    existingRow: QuotationWindowRow;
    pendingRow: QuotationWindowRow;
  } | null>(null);
  const [emailDraft, setEmailDraft] = useState<{
    to: string;
    cc: string;
    subject: string;
    body: string;
  } | null>(null);
  const [isPdfBusy, setIsPdfBusy] = useState(false);
  const [showTotals, setShowTotals] = useState(true);
  const totalsRef = useRef<HTMLDivElement>(null);
  const [pdfPreview, setPdfPreview] = useState<{
    url: string;
    title: string;
    onExport: () => Promise<void>;
  } | null>(null);

  const isControlled = controlledForm !== undefined && onFormChange !== undefined;
  const form = isControlled ? controlledForm : internalForm;

  function setForm(next: QuotationForm) {
    if (isControlled) {
      onFormChange(next);
    } else {
      setInternalForm(next);
    }
  }

  /* eslint-disable react-hooks/set-state-in-effect -- client-only localStorage hydration */
  useEffect(() => {
    if (isControlled) {
      setHydrated(true);
      return;
    }
    setInternalForm(loadQuotationForm());
    setHydrated(true);
  }, [isControlled]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!hydrated || isControlled) return;
    saveQuotationForm(internalForm);
  }, [internalForm, hydrated, isControlled]);

  const result = useMemo(() => calculateQuotation(form), [form]);

  function updateFormField<K extends keyof QuotationForm>(
    key: K,
    value: QuotationForm[K],
  ) {
    setForm({ ...form, [key]: value });
  }

  function updateWindowRow(id: string, patch: Partial<QuotationWindowRow>) {
    setForm({
      ...form,
      windows: form.windows.map((row) => {
        if (row.id !== id) return row;
        const updated = { ...row, ...patch };
        if (patch.windowType && patch.ratePerSqFt === undefined) {
          updated.ratePerSqFt = DEFAULT_RATES[patch.windowType];
        }
        return updated;
      }),
    });
  }

  function addWindow() {
    setForm({
      ...form,
      windows: [...form.windows, createWindowRow("3-track-upvc")],
    });
  }

  function removeWindow(id: string) {
    if (form.windows.length <= 1) return;
    setForm({
      ...form,
      windows: form.windows.filter((row) => row.id !== id),
    });
  }

  function addBlankProduct(kind: "window" | "door") {
    const windowType: WindowTypeId =
      kind === "door" ? "upvc-door" : "3-track-upvc";
    setForm({
      ...form,
      windows: [...form.windows, createWindowRow(windowType)],
    });
  }

  function handleAddCurrentProduct() {
    setAddMessage(null);
    if (!jobContext) {
      setAddMessage("Configure the current job in the Cutting tab first.");
      return;
    }
    if (requiresRevisionToEdit(form.status) && jobContext.onJobChange && jobContext.job) {
      const revised = duplicateQuotationAsRevision(jobContext.job);
      jobContext.onJobChange(revised);
      setForm(revised.quotation);
      setAddMessage(`Created ${getQuotationDisplayId(revised.quotation)} for editing.`);
      return;
    }
    const added = addCurrentProductToQuotation({
      estimationInputs: jobContext.estimationInputs,
      cuttingOptions: jobContext.cuttingOptions,
      profileRates: jobContext.profileRates,
      cuttingJobMeta: jobContext.cuttingJobMeta,
      quotationForm: form,
      productId: jobContext.activeProductId,
    });
    if (!added.ok && added.duplicate) {
      setDuplicatePrompt({
        existingRow: added.existingRow,
        pendingRow: added.pendingRow,
      });
      setAddMessage(added.message);
      return;
    }
    if (!added.ok) {
      setAddMessage(added.message);
      return;
    }
    setForm(added.form);
    setAddMessage(added.message);
    setShowTotals(true);
  }

  function resolveDuplicate(choice: "update" | "separate" | "cancel") {
    if (!duplicatePrompt || !jobContext) {
      setDuplicatePrompt(null);
      return;
    }
    const resolved = resolveDuplicateProductAdd(
      {
        estimationInputs: jobContext.estimationInputs,
        cuttingOptions: jobContext.cuttingOptions,
        profileRates: jobContext.profileRates,
        cuttingJobMeta: jobContext.cuttingJobMeta,
        quotationForm: form,
        productId: jobContext.activeProductId,
      },
      choice,
      duplicatePrompt.existingRow,
      duplicatePrompt.pendingRow,
    );
    setDuplicatePrompt(null);
    if (!resolved.ok) {
      setAddMessage(resolved.message);
      return;
    }
    setForm(resolved.form);
    setAddMessage(resolved.message);
  }

  function handleAddCustomCharge() {
    setForm({
      ...form,
      customCharges: [...(form.customCharges ?? []), createCustomCharge("installation")],
    });
  }

  function handleStatusChange(status: import("@/lib/quotation/types").QuotationStatus) {
    if (!jobContext?.job || !jobContext.onJobChange) return;
    jobContext.onJobChange(setQuotationStatus(jobContext.job, status));
    setForm({ ...form, status });
  }

  async function registerQuotationDocument(doc: import("jspdf").jsPDF) {
    if (!jobContext?.job || !jobContext.onJobChange) return;
    const blob = await pdfBlobFromJsPdf(doc);
    const company = loadCompanySettings();
    const registered = await registerGeneratedDocument({
      job: jobContext.job,
      documentType: "standard-quotation",
      pdfBlob: blob,
      fileName: `${jobContext.job.id}-${getQuotationDisplayId(form)}.pdf`,
      quotationId: form.quotationId,
      relatedProductIds: form.windows.map((r) => r.productId).filter(Boolean) as string[],
      sourceSummary: "Standard quotation PDF",
      sourcePayload: {
        dimensions: form.windows.map((w) => `${w.length}x${w.height}`).join(", "),
        quantity: form.windows.reduce((s, w) => s + w.quantity, 0),
        grandTotal: result.totals.grandTotal,
        gst: result.totals.gstAmount,
        companyDetails: company.companyName,
      },
    });
    if (registered.ok) {
      jobContext.onJobChange(registered.job);
      setPdfMessage(
        registered.reused
          ? "Existing quotation PDF reused — source unchanged."
          : "Quotation saved to job document history.",
      );
    }
  }

  function handleReset() {
    const defaults = resetQuotationForm();
    setForm(defaults);
    setPdfMessage(null);
    setShowTotals(true);
  }

  function handleCalculate() {
    setShowTotals(true);
    requestAnimationFrame(() => {
      totalsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function closePdfPreview() {
    if (pdfPreview?.url) revokePdfBlobUrl(pdfPreview.url);
    setPdfPreview(null);
  }

  async function handlePreviewPdf() {
    setIsPdfBusy(true);
    setPdfMessage(null);
    const validation = validateBeforeDocument({
      documentType: "standard-quotation",
      job: {
        customerName: form.customerName,
        customerPhone: form.customerPhone ?? jobContext?.job?.customerPhone ?? "",
        billingAddress: form.customerAddress,
        projectName: jobContext?.job?.projectName ?? form.subject,
      },
      quotationResult: result,
      companyName: loadCompanySettings().companyName,
    });
    if (!validation.ok) {
      setPdfMessage(
        `Missing: ${validation.issues.filter((i) => !i.ok).map((i) => i.label).join(", ")}`,
      );
      setIsPdfBusy(false);
      return;
    }
    try {
      const doc = await buildQuotationPdfAsync(result);
      const url = pdfToBlobUrl(doc);
      closePdfPreview();
      setPdfPreview({
        url,
        title: "Quotation Preview",
        onExport: async () => {
          setIsPdfBusy(true);
          try {
            await exportQuotationPdf(result);
            await registerQuotationDocument(doc);
            setPdfMessage("Quotation PDF saved.");
          } catch (error) {
            setPdfMessage(
              error instanceof Error ? error.message : "Could not export PDF.",
            );
          } finally {
            setIsPdfBusy(false);
          }
        },
      });
    } catch (error) {
      setPdfMessage(
        error instanceof Error ? error.message : "Could not generate PDF preview.",
      );
    } finally {
      setIsPdfBusy(false);
    }
  }

  async function handleExportPdf() {
    setIsPdfBusy(true);
    setPdfMessage(
      result.form.windows.length > 12
        ? "Building quotation PDF (large quote — table only)…"
        : "Building quotation PDF…",
    );
    try {
      await exportQuotationPdf(result);
      setPdfMessage(`Quotation PDF downloaded (${result.form.windows.length} line(s)).`);
    } catch (error) {
      setPdfMessage(
        error instanceof Error ? error.message : "Could not export PDF.",
      );
    } finally {
      setIsPdfBusy(false);
    }
  }

  function openWhatsAppShare() {
    if (!canSendQuotation()) {
      setPdfMessage("You do not have permission to share quotations.");
      return;
    }
    const text = buildWhatsAppQuotationMessage({
      customerName: form.customerName,
      customerPhone: form.customerPhone ?? jobContext?.job?.customerPhone ?? "",
      quotationForm: form,
      projectName: jobContext?.job?.projectName ?? form.subject,
      grandTotal: result.totals.grandTotal,
      validUntil: form.validUntil,
    });
    window.open(
      buildWhatsAppUrl(text, form.customerPhone ?? jobContext?.job?.customerPhone),
      "_blank",
      "noopener,noreferrer",
    );
  }

  function openEmailDraft() {
    if (!canSendQuotation()) {
      setPdfMessage("You do not have permission to email quotations.");
      return;
    }
    setEmailDraft({
      to: "",
      cc: "",
      subject: buildDefaultEmailSubject({
        customerName: form.customerName,
        quotationForm: form,
        projectName: jobContext?.job?.projectName ?? form.subject,
        grandTotal: result.totals.grandTotal,
      }),
      body: buildDefaultEmailBody({
        customerName: form.customerName,
        quotationForm: form,
        projectName: jobContext?.job?.projectName ?? form.subject,
        grandTotal: result.totals.grandTotal,
        validUntil: form.validUntil,
      }),
    });
  }

  async function handleSendEmail() {
    if (!emailDraft) return;
    if (!validateEmailAddress(emailDraft.to)) {
      setPdfMessage("Enter a valid recipient email.");
      return;
    }
    const send = await sendQuotationEmail({
      to: emailDraft.to,
      cc: emailDraft.cc || undefined,
      subject: emailDraft.subject,
      body: emailDraft.body,
      sendCopyToCompany: true,
    });
    if (!send.ok) {
      if (send.requiresProvider) {
        window.open(
          buildMailtoFallback({
            to: emailDraft.to,
            cc: emailDraft.cc,
            subject: emailDraft.subject,
            body: emailDraft.body,
          }),
          "_self",
        );
        setPdfMessage("Email provider not configured — opened mail client as fallback.");
      } else {
        setPdfMessage(send.error);
      }
      return;
    }
    setForm({
      ...form,
      emailSendStatus: "sent",
      lastEmailSentAt: send.sentAt,
    });
    setEmailDraft(null);
    setPdfMessage("Quotation email sent.");
  }

  return (
    <PageShell>
      <PageHero
        title="Window & Door Quotation"
        description="Add products from the Cutting tab or enter line items manually — generate one combined quotation PDF."
        icon={FileText}
        actions={
          <>
            {jobContext ? (
              <Button type="button" variant="default" size="sm" onClick={handleAddCurrentProduct}>
                <ClipboardPlus />
                Add Current {getProductKind(jobContext.estimationInputs) === "door" ? "Door" : "Window"}
              </Button>
            ) : null}
            <Button type="button" variant="outline" size="sm" onClick={() => addBlankProduct("window")}>
              <Plus />
              Add Window
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => addBlankProduct("door")}>
              <Plus />
              Add Door
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={handleAddCustomCharge}>
              <Plus />
              Custom Charge
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setForm({ ...form, windows: groupIdenticalRows(form.windows) })}
            >
              Group
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setForm({ ...form, windows: ungroupRows(form.windows) })}
            >
              Ungroup
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={openWhatsAppShare}>
              WhatsApp
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={openEmailDraft}>
              Email
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={handleCalculate}>
              <Calculator />
              Calculate
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPdfBusy}
              onClick={handlePreviewPdf}
            >
              <Eye />
              Preview PDF
            </Button>
            <Button type="button" size="sm" disabled={isPdfBusy} onClick={handleExportPdf}>
              <Download />
              Generate PDF
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw />
              Reset
            </Button>
          </>
        }
      />

      {addMessage ? (
        <MessageBanner tone={addMessage.includes("added") || addMessage.includes("Updated") ? "info" : "warning"}>
          {addMessage}
        </MessageBanner>
      ) : null}

      {duplicatePrompt ? (
        <MessageBanner tone="warning">
          <div className="flex flex-col gap-2">
            <p>This product is already in the quotation. What would you like to do?</p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" onClick={() => resolveDuplicate("update")}>
                Update existing line
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => resolveDuplicate("separate")}>
                Add as separate line
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => resolveDuplicate("cancel")}>
                Cancel
              </Button>
            </div>
          </div>
        </MessageBanner>
      ) : null}

      {form.quotationId ? (
        <AccentCard>
          <AccentCardHeader>
            <AccentCardTitle>
              {getQuotationDisplayId(form)} · {QUOTATION_STATUS_LABELS[form.status ?? "draft"]}
            </AccentCardTitle>
          </AccentCardHeader>
          <AccentCardContent className="flex flex-wrap gap-2">
            {canEditQuotation() ? (
              <>
                <Button type="button" size="sm" variant="outline" onClick={() => handleStatusChange("draft")}>
                  Save Draft
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => handleStatusChange("ready")}>
                  Mark Ready
                </Button>
                <Button type="button" size="sm" onClick={() => handleStatusChange("sent")}>
                  Mark Sent
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => handleStatusChange("approved")}>
                  Mark Approved
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => handleStatusChange("rejected")}>
                  Mark Rejected
                </Button>
                {jobContext?.job && jobContext.onJobChange ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const revised = duplicateQuotationAsRevision(jobContext.job!);
                      jobContext.onJobChange!(revised);
                      setForm(revised.quotation);
                    }}
                  >
                    New Revision
                  </Button>
                ) : null}
              </>
            ) : null}
          </AccentCardContent>
        </AccentCard>
      ) : null}

      {emailDraft ? (
        <AccentCard>
          <AccentCardHeader>
            <AccentCardTitle>Email quotation</AccentCardTitle>
          </AccentCardHeader>
          <AccentCardContent className="grid gap-3 md:grid-cols-2">
            <Input
              placeholder="Recipient email"
              value={emailDraft.to}
              onChange={(e) => setEmailDraft({ ...emailDraft, to: e.target.value })}
            />
            <Input
              placeholder="CC"
              value={emailDraft.cc}
              onChange={(e) => setEmailDraft({ ...emailDraft, cc: e.target.value })}
            />
            <Input
              className="md:col-span-2"
              value={emailDraft.subject}
              onChange={(e) => setEmailDraft({ ...emailDraft, subject: e.target.value })}
            />
            <textarea
              className="min-h-28 rounded-md border border-slate-200 p-3 text-sm md:col-span-2"
              value={emailDraft.body}
              onChange={(e) => setEmailDraft({ ...emailDraft, body: e.target.value })}
            />
            <div className="flex gap-2 md:col-span-2">
              <Button type="button" size="sm" onClick={() => void handleSendEmail()}>
                Send
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setEmailDraft(null)}>
                Cancel
              </Button>
            </div>
          </AccentCardContent>
        </AccentCard>
      ) : null}

      {pdfMessage || (isPdfBusy && !pdfPreview) ? (
        <PdfFeedback
          message={pdfMessage}
          isBusy={isPdfBusy && !pdfPreview}
          busyLabel="Preparing quotation PDF…"
        />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          accent="cyan"
          label="Windows"
          value={String(form.windows.length)}
          sublabel="line items"
        />
        <StatCard
          accent="emerald"
          label="Subtotal"
          value={formatInr(result.totals.subtotalBeforeGst)}
          sublabel={
            form.gstMode === "apply" ? "before GST" : "quotation amount"
          }
        />
        <StatCard
          accent="violet"
          label="GST"
          value={
            form.gstMode === "apply"
              ? formatInr(result.totals.gstAmount)
              : form.gstMode === "terms-only"
                ? "In terms"
                : "Not applied"
          }
          sublabel={
            form.gstMode === "apply"
              ? `${GST_PERCENT}% applied`
              : GST_MODE_LABELS[form.gstMode]
          }
        />
        <StatCard
          accent="amber"
          label="Grand Total"
          value={formatInr(result.totals.grandTotal)}
        />
      </div>

      <AccentCard accent="violet">
        <AccentCardHeader>
          <AccentCardTitle>Quotation Details</AccentCardTitle>
          <AccentCardDescription>
            Customer information and quotation settings
          </AccentCardDescription>
        </AccentCardHeader>
        <AccentCardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="customer-name">Customer Name</Label>
            <Input
              id="customer-name"
              value={form.customerName}
              placeholder="Customer name"
              onChange={(event) => updateFormField("customerName", event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="quotation-date">Quotation Date</Label>
            <Input
              id="quotation-date"
              type="date"
              value={form.quotationDate}
              onChange={(event) => updateFormField("quotationDate", event.target.value)}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="customer-address">Customer Address / Location</Label>
            <Input
              id="customer-address"
              value={form.customerAddress}
              placeholder="Site address or location"
              onChange={(event) => updateFormField("customerAddress", event.target.value)}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={form.subject}
              placeholder="Quotation subject"
              onChange={(event) => updateFormField("subject", event.target.value)}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="gst-mode">GST Option</Label>
            <Select
              value={form.gstMode}
              onValueChange={(value) => updateFormField("gstMode", value as GstMode)}
            >
              <SelectTrigger id="gst-mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="apply">{GST_MODE_LABELS.apply}</SelectItem>
                <SelectItem value="terms-only">{GST_MODE_LABELS["terms-only"]}</SelectItem>
                <SelectItem value="exclude">{GST_MODE_LABELS.exclude}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="pdf-page-mode">PDF Print Layout</Label>
            <Select
              value={form.pdfPageMode}
              onValueChange={(value) =>
                updateFormField("pdfPageMode", value as PdfPageMode)
              }
            >
              <SelectTrigger id="pdf-page-mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">{PDF_PAGE_MODE_LABELS.single}</SelectItem>
                <SelectItem value="dual">{PDF_PAGE_MODE_LABELS.dual}</SelectItem>
              </SelectContent>
            </Select>
            {form.windows.length > 10 && form.pdfPageMode === "single" ? (
              <p className="text-xs text-amber-800">
                Many window rows — consider &quot;Allow up to 2 pages&quot; for easier reading.
              </p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="transportation">Transportation Charges</Label>
            <Input
              id="transportation"
              type="number"
              min={0}
              step="any"
              value={form.transportationCharge || ""}
              placeholder="0"
              onChange={(event) =>
                updateFormField(
                  "transportationCharge",
                  parseNumber(event.target.value, form.transportationCharge),
                )
              }
            />
          </div>
        </AccentCardContent>
      </AccentCard>

      <AccentCard accent="cyan">
        <AccentCardHeader>
          <AccentCardTitle>Window Line Items</AccentCardTitle>
          <AccentCardDescription>
            Area and amount update automatically as you type
          </AccentCardDescription>
        </AccentCardHeader>
        <AccentCardContent className="overflow-x-auto">
          <table className="w-full min-w-[1080px] border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-cyan-200 bg-cyan-50/80 text-left text-xs font-bold uppercase tracking-wide text-cyan-900">
                <th className="w-28 px-2 py-2.5">Preview</th>
                <th className="px-2 py-2.5">Window Type</th>
                <th className="w-24 px-2 py-2.5">Length</th>
                <th className="w-24 px-2 py-2.5">Height</th>
                <th className="w-24 px-2 py-2.5">Unit</th>
                <th className="w-20 px-2 py-2.5">Qty</th>
                <th className="w-28 px-2 py-2.5">Customer rate (₹/sq.ft)</th>
                <th className="w-24 px-2 py-2.5 text-right">Area Sq.Ft.</th>
                <th className="w-28 px-2 py-2.5 text-right">Amount</th>
                <th className="w-12 px-2 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {form.windows.map((row) => {
                const calculated = result.groups
                  .flatMap((group) => group.rows)
                  .find((item) => item.id === row.id);

                return (
                  <tr
                    key={row.id}
                    className="border-b border-slate-100 hover:bg-slate-50/80"
                  >
                    <td className="px-2 py-2 align-top">
                      <ProductPreview
                        data={resolveQuotationPreviewData(row)}
                        mode="thumbnail"
                        variant="bare"
                        className="w-[120px]"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <Select
                        value={row.windowType}
                        onValueChange={(value) =>
                          updateWindowRow(row.id, { windowType: value as WindowTypeId })
                        }
                      >
                        <SelectTrigger className="h-9 min-w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {WINDOW_TYPE_ORDER.map((type) => (
                            <SelectItem key={type} value={type}>
                              {WINDOW_TYPE_LABELS[type]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-2 py-2">
                      <Input
                        type="number"
                        min={0}
                        step="any"
                        className="h-9"
                        value={row.length || ""}
                        onChange={(event) =>
                          updateWindowRow(row.id, {
                            length: parseNumber(event.target.value, row.length),
                          })
                        }
                      />
                    </td>
                    <td className="px-2 py-2">
                      <Input
                        type="number"
                        min={0}
                        step="any"
                        className="h-9"
                        value={row.height || ""}
                        onChange={(event) =>
                          updateWindowRow(row.id, {
                            height: parseNumber(event.target.value, row.height),
                          })
                        }
                      />
                    </td>
                    <td className="px-2 py-2">
                      <Select
                        value={row.unit}
                        onValueChange={(value) =>
                          updateWindowRow(row.id, { unit: value as DimensionUnit })
                        }
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(UNIT_LABELS) as DimensionUnit[]).map((unit) => (
                            <SelectItem key={unit} value={unit}>
                              {UNIT_LABELS[unit]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-2 py-2">
                      <Input
                        type="number"
                        min={1}
                        step={1}
                        className="h-9"
                        value={row.quantity || ""}
                        onChange={(event) =>
                          updateWindowRow(row.id, {
                            quantity: parsePositiveInt(event.target.value, row.quantity),
                          })
                        }
                      />
                    </td>
                    <td className="px-2 py-2">
                      <Input
                        type="number"
                        min={0}
                        step="any"
                        className="h-9"
                        value={row.ratePerSqFt || ""}
                        onChange={(event) =>
                          updateWindowRow(row.id, {
                            ratePerSqFt: parseNumber(event.target.value, row.ratePerSqFt),
                          })
                        }
                      />
                    </td>
                    <td className="px-2 py-2 text-right font-medium tabular-nums text-slate-700">
                      {calculated ? calculated.areaSqFt.toFixed(2) : "0.00"}
                    </td>
                    <td className="px-2 py-2 text-right font-semibold tabular-nums text-emerald-800">
                      {calculated ? formatInr(calculated.amount) : formatInr(0)}
                    </td>
                    <td className="px-2 py-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        disabled={form.windows.length <= 1}
                        onClick={() => removeWindow(row.id)}
                        aria-label="Remove row"
                      >
                        <Trash2 className="size-4 text-rose-600" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={addWindow}>
              <Plus />
              Add Window
            </Button>
          </div>
        </AccentCardContent>
      </AccentCard>

      {showTotals ? (
        <div ref={totalsRef}>
          <AccentCard accent="emerald">
            <AccentCardHeader>
              <AccentCardTitle>Quotation Summary</AccentCardTitle>
              <AccentCardDescription>
                Grouped by window type with subtotals
              </AccentCardDescription>
            </AccentCardHeader>
            <AccentCardContent className="space-y-6">
              {result.groups.map((group) => (
                <div key={group.windowType} className="space-y-2">
                  <SectionLabel>{group.label}</SectionLabel>
                  <div className="overflow-x-auto rounded-xl border border-emerald-100">
                    <table className="w-full min-w-[640px] border-collapse text-sm">
                      <thead>
                        <tr className="bg-emerald-50 text-left text-xs font-bold uppercase tracking-wide text-emerald-900">
                          <th className="px-3 py-2">Size (L × H)</th>
                          <th className="px-3 py-2 text-center">Qty</th>
                          <th className="px-3 py-2 text-right">Rate / Sq.Ft.</th>
                          <th className="px-3 py-2 text-right">Area Sq.Ft.</th>
                          <th className="px-3 py-2 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.rows.map((row) => (
                          <tr key={row.id} className="border-t border-emerald-50">
                            <td className="px-3 py-2">
                              {row.length} × {row.height} {UNIT_LABELS[row.unit]}
                            </td>
                            <td className="px-3 py-2 text-center">{row.quantity}</td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              {formatInr(row.ratePerSqFt)}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              {row.areaSqFt.toFixed(2)}
                            </td>
                            <td className="px-3 py-2 text-right font-medium tabular-nums">
                              {formatInr(row.amount)}
                            </td>
                          </tr>
                        ))}
                        <tr className="border-t-2 border-emerald-200 bg-emerald-50/60 font-bold">
                          <td className="px-3 py-2" colSpan={4}>
                            Subtotal — {group.label}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {formatInr(group.subtotal)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}

              <div className="ml-auto max-w-md space-y-2 rounded-xl border-2 border-emerald-200 bg-emerald-50/50 p-4">
                {(() => {
                  const areaSummary = computeQuotationAreaSummary(result);
                  if (areaSummary.totalSqFt <= 0) return null;
                  return (
                    <div className="space-y-2 border-b border-emerald-200 pb-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-emerald-900">Total Sq.Ft.</span>
                        <span className="font-semibold tabular-nums">
                          {areaSummary.totalSqFt.toFixed(2)} Sq.Ft.
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-emerald-900">Average Rate / Sq.Ft.</span>
                        <span className="font-semibold tabular-nums">
                          {formatInr(areaSummary.averageRatePerSqFt)}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed text-emerald-800">
                        {areaSummary.totalSqFt.toFixed(2)} Sq.Ft. ×{" "}
                        {formatInr(areaSummary.averageRatePerSqFt)} ={" "}
                        <span className="font-semibold text-emerald-950">
                          {formatInr(areaSummary.windowsSubtotal)}
                        </span>{" "}
                        (windows subtotal)
                      </p>
                    </div>
                  );
                })()}
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-emerald-900">Windows Subtotal</span>
                  <span className="font-semibold tabular-nums">
                    {formatInr(result.totals.windowsSubtotal)}
                  </span>
                </div>
                {result.totals.transportationCharge > 0 ? (
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-emerald-900">Transportation</span>
                    <span className="font-semibold tabular-nums">
                      {formatInr(result.totals.transportationCharge)}
                    </span>
                  </div>
                ) : null}
                {(form.customCharges ?? []).map((charge) =>
                  charge.amount > 0 ? (
                    <div key={charge.id} className="flex items-center justify-between text-sm">
                      <span className="font-medium text-emerald-900">{charge.description}</span>
                      <span className="font-semibold tabular-nums">
                        {formatInr(charge.amount)}
                      </span>
                    </div>
                  ) : null,
                )}
                {result.totals.discountAmount && result.totals.discountAmount > 0 ? (
                  <div className="flex items-center justify-between text-sm text-emerald-800">
                    <span className="font-medium">
                      Discount ({result.totals.discountPercent ?? form.discountPercent}%)
                    </span>
                    <span className="font-semibold tabular-nums">
                      −{formatInr(result.totals.discountAmount)}
                    </span>
                  </div>
                ) : null}
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-emerald-900">
                    {form.gstMode === "apply" ? "Total (before GST)" : "Quotation Total"}
                  </span>
                  <span className="font-semibold tabular-nums">
                    {formatInr(result.totals.subtotalBeforeGst)}
                  </span>
                </div>
                {shouldApplyGstInTotal(form.gstMode) ? (
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-emerald-900">
                      GST ({result.totals.gstPercent}%)
                    </span>
                    <span className="font-semibold tabular-nums">
                      {formatInr(result.totals.gstAmount)}
                    </span>
                  </div>
                ) : null}
                <div className="flex items-center justify-between border-t border-emerald-200 pt-2 text-base">
                  <span className="font-bold text-emerald-950">
                    {form.gstMode === "apply" ? "Final Grand Total" : "Grand Total"}
                  </span>
                  <span className="font-bold tabular-nums text-emerald-950">
                    {formatInr(result.totals.grandTotal)}
                  </span>
                </div>
              </div>
            </AccentCardContent>
          </AccentCard>
        </div>
      ) : null}

      <PdfPreviewModal
        open={pdfPreview !== null}
        title={pdfPreview?.title ?? "Quotation Preview"}
        blobUrl={pdfPreview?.url ?? null}
        onClose={closePdfPreview}
        onExport={pdfPreview?.onExport}
        isExporting={isPdfBusy}
        exportLabel="Download / Share PDF"
      />
    </PageShell>
  );
}
