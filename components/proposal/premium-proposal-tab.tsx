"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Copy,
  Download,
  Eye,
  MessageCircle,
  RotateCcw,
  Save,
  Sparkles,
} from "lucide-react";

import { PdfFeedback } from "@/components/pdf/pdf-feedback";
import { PdfPreviewModal } from "@/components/pdf/pdf-preview-modal";
import {
  ProductPreview,
  resolveQuotationPreviewData,
} from "@/components/product-preview";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  getDefaultCompanySettings,
  loadCompanySettings,
  saveCompanySettings,
} from "@/lib/company-settings";
import { pdfToBlobUrl, revokePdfBlobUrl } from "@/lib/pdf/preview";
import { calculateQuotation, QUOTATION_STANDARD_TERMS, type QuotationForm } from "@/lib/quotation";
import {
  buildPremiumProposalPdfAsync,
  duplicatePremiumProposal,
  enhanceImageDataUrl,
  exportPremiumProposalPdf,
  getDefaultPremiumProposal,
  getDefaultWindowDetail,
  loadPremiumProposal,
  PROPOSAL_STEP_LABELS,
  readImageFileAsDataUrl,
  resetPremiumProposal,
  savePremiumProposal,
  WHATSAPP_MESSAGE_TEMPLATE,
  mergeWindowDetail,
  type PremiumProposal,
  type ProposalMediaKind,
  type ProposalStatus,
  type ProposalStepId,
} from "@/lib/proposal";

type PremiumProposalTabProps = {
  quotationForm: QuotationForm;
};

function parseNumber(value: string, fallback: number): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function createMediaId(): string {
  return `media-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function PremiumProposalTab({ quotationForm }: PremiumProposalTabProps) {
  const [proposal, setProposal] = useState(getDefaultPremiumProposal);
  const [company, setCompany] = useState(getDefaultCompanySettings);
  const [hydrated, setHydrated] = useState(false);
  const [activeStep, setActiveStep] = useState<ProposalStepId>("Cover");
  const [pdfMessage, setPdfMessage] = useState<string | null>(null);
  const [isPdfBusy, setIsPdfBusy] = useState(false);
  const [pdfPreview, setPdfPreview] = useState<{ url: string; title: string } | null>(null);

  const quotationResult = useMemo(
    () => calculateQuotation(quotationForm),
    [quotationForm],
  );

  /* eslint-disable react-hooks/set-state-in-effect -- client-only localStorage hydration */
  useEffect(() => {
    const loadedCompany = loadCompanySettings();
    const loadedProposal = loadPremiumProposal();
    setCompany(loadedCompany);
    setProposal({
      ...loadedProposal,
      projectName: loadedProposal.projectName || quotationForm.subject,
      projectLocation: loadedProposal.projectLocation || quotationForm.customerAddress,
      preparedBy: loadedProposal.preparedBy || loadedCompany.preparedByDefault,
      profileWarranty:
        loadedProposal.profileWarranty || loadedCompany.profileWarrantyDefault,
      hardwareWarranty:
        loadedProposal.hardwareWarranty || loadedCompany.hardwareWarrantyDefault,
      glassWarranty: loadedProposal.glassWarranty || loadedCompany.glassWarrantyDefault,
      installationWarranty:
        loadedProposal.installationWarranty ||
        loadedCompany.installationWarrantyDefault,
    });
    setHydrated(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!hydrated) return;
    savePremiumProposal(proposal);
  }, [proposal, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    saveCompanySettings(company);
  }, [company, hydrated]);

  function updateProposal(patch: Partial<PremiumProposal>) {
    setProposal((current) => ({ ...current, ...patch }));
  }

  function closePdfPreview() {
    setPdfPreview((prev) => {
      revokePdfBlobUrl(prev?.url ?? null);
      return null;
    });
  }

  async function handlePreviewPdf() {
    setPdfMessage(null);
    setIsPdfBusy(true);
    try {
      const doc = await buildPremiumProposalPdfAsync({
        proposal,
        quotationForm,
        company,
      });
      const url = pdfToBlobUrl(doc);
      setPdfPreview((prev) => {
        revokePdfBlobUrl(prev?.url ?? null);
        return {
          url,
          title: `${proposal.proposalNumber} — Premium Proposal Preview`,
        };
      });
    } catch {
      setPdfMessage("Could not generate proposal preview.");
    } finally {
      setIsPdfBusy(false);
    }
  }

  async function handleExportPdf() {
    setIsPdfBusy(true);
    setPdfMessage(null);
    try {
      await exportPremiumProposalPdf({
        proposal,
        quotationForm,
        company,
      });
      setPdfMessage("Premium proposal PDF downloaded.");
    } catch {
      setPdfMessage("Could not export premium proposal PDF.");
    } finally {
      setIsPdfBusy(false);
    }
  }

  async function handleImageUpload(kind: ProposalMediaKind, file: File) {
    try {
      const dataUrl = await readImageFileAsDataUrl(file);
      updateProposal({
        media: [
          ...proposal.media.filter((item) => item.kind !== kind),
          {
            id: createMediaId(),
            kind,
            dataUrl,
            caption: "",
            fileName: file.name,
          },
        ],
      });
      setPdfMessage(`${kind} image added.`);
    } catch (error) {
      setPdfMessage(error instanceof Error ? error.message : "Could not upload image.");
    }
  }

  async function handleEnhanceImage(id: string) {
    const item = proposal.media.find((m) => m.id === id);
    if (!item) return;
    try {
      const enhanced = await enhanceImageDataUrl(item.dataUrl);
      updateProposal({
        media: proposal.media.map((m) =>
          m.id === id ? { ...m, dataUrl: enhanced } : m,
        ),
      });
      setPdfMessage("Image enhanced (brightness/contrast only). Original preserved in history.");
    } catch {
      setPdfMessage("Could not enhance image.");
    }
  }

  function buildWhatsAppMessage(): string {
    return WHATSAPP_MESSAGE_TEMPLATE.replace(
      "[Customer Name]",
      quotationForm.customerName || "Customer",
    ).replace("[Project Name]", proposal.projectName || quotationForm.subject || "your project");
  }

  function handleShareWhatsApp() {
    const message = encodeURIComponent(buildWhatsAppMessage());
    window.open(`https://wa.me/?text=${message}`, "_blank", "noopener,noreferrer");
  }

  async function handleCopyShareMessage() {
    try {
      await navigator.clipboard.writeText(buildWhatsAppMessage());
      setPdfMessage("WhatsApp message copied to clipboard.");
    } catch {
      setPdfMessage("Could not copy message.");
    }
  }

  const calculatedRows = quotationResult.groups.flatMap((group) => group.rows);

  function renderStepContent() {
    switch (activeStep) {
      case "Cover":
        return (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Proposal number</Label>
                <Input
                  value={proposal.proposalNumber}
                  onChange={(e) => updateProposal({ proposalNumber: e.target.value })}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Proposal date</Label>
                  <Input
                    type="date"
                    value={proposal.proposalDate}
                    onChange={(e) => updateProposal({ proposalDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Valid until</Label>
                  <Input
                    type="date"
                    value={proposal.validUntil}
                    onChange={(e) => updateProposal({ validUntil: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Prepared by</Label>
                <Input
                  value={proposal.preparedBy}
                  onChange={(e) => updateProposal({ preparedBy: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Project name</Label>
                <Input
                  value={proposal.projectName}
                  onChange={(e) => updateProposal({ projectName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Project location</Label>
                <Input
                  value={proposal.projectLocation}
                  onChange={(e) => updateProposal({ projectLocation: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Cover image</Label>
                <Input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleImageUpload("cover", file);
                  }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Introduction (editable)</Label>
              <textarea
                className="min-h-[260px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                value={proposal.introduction}
                onChange={(e) => updateProposal({ introduction: e.target.value })}
              />
            </div>
          </div>
        );

      case "Overview":
        return (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["Window category", "windowCategory"],
                ["Profile brand summary", "profileBrandSummary"],
                ["Glass specification", "glassSpecificationSummary"],
                ["Installation timeline", "installationTimeline"],
              ].map(([label, key]) => (
                <div key={key} className="space-y-2">
                  <Label>{label}</Label>
                  <Input
                    value={proposal[key as keyof PremiumProposal] as string}
                    onChange={(e) => updateProposal({ [key]: e.target.value } as Partial<PremiumProposal>)}
                  />
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <Label>Client requirement summary</Label>
              <textarea
                className="min-h-[100px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={proposal.requirementSummary}
                onChange={(e) => updateProposal({ requirementSummary: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Our understanding of your requirement</Label>
              <textarea
                className="min-h-[120px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={proposal.understandingText}
                onChange={(e) => updateProposal({ understandingText: e.target.value })}
              />
            </div>
          </div>
        );

      case "Windows":
        return (
          <div className="space-y-4">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={proposal.showItemPrices}
                onCheckedChange={(checked) =>
                  updateProposal({ showItemPrices: checked === true })
                }
              />
              Show item price in premium proposal
            </label>
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-4">
                {calculatedRows.map((row, index) => {
                  const detail = mergeWindowDetail(
                    row,
                    index,
                    proposal.windowDetails[row.id],
                  );
                  return (
                    <AccentCard key={row.id} accent="cyan">
                      <AccentCardHeader>
                        <AccentCardTitle>
                          {detail.code} — {WINDOW_LABEL(row.windowType)}
                        </AccentCardTitle>
                        <AccentCardDescription>
                          {row.length} × {row.height} {row.unit} · Qty {row.quantity} ·{" "}
                          {row.areaSqFt.toFixed(2)} sq.ft · {formatInr(row.amount)}
                        </AccentCardDescription>
                      </AccentCardHeader>
                      <AccentCardContent className="grid gap-3 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                          <ProductPreview
                            data={resolveQuotationPreviewData(row)}
                            mode="compact"
                            className="max-w-xs"
                          />
                        </div>
                        {(
                          [
                            ["code", "Window code"],
                            ["roomOrLocation", "Room / location"],
                            ["profileBrand", "Profile brand"],
                            ["profileColour", "Profile colour"],
                            ["glassType", "Glass type"],
                            ["glassThickness", "Glass thickness"],
                            ["handleType", "Handle type"],
                            ["meshDetails", "Mesh details"],
                          ] as const
                        ).map(([field, label]) => (
                          <div key={field} className="space-y-1">
                            <Label>{label}</Label>
                            <Input
                              value={detail[field]}
                              onChange={(e) =>
                                updateProposal({
                                  windowDetails: {
                                    ...proposal.windowDetails,
                                    [row.id]: {
                                      ...(proposal.windowDetails[row.id] ??
                                        getDefaultWindowDetail()),
                                      [field]: e.target.value,
                                    },
                                  },
                                })
                              }
                            />
                          </div>
                        ))}
                      </AccentCardContent>
                    </AccentCard>
                  );
                })}
              </div>
              {quotationForm.windows[0] ? (
                <ProductPreview
                  data={resolveQuotationPreviewData(quotationForm.windows[0])}
                  className="xl:sticky xl:top-32"
                />
              ) : null}
            </div>
          </div>
        );

      case "Pricing":
        return (
          <div className="space-y-4">
            <MessageBanner tone="info">
              Commercial values are read from the existing Quotation tab calculation. Edit
              prices there — this section only controls presentation options.
            </MessageBanner>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                accent="blue"
                label="Quotation subtotal"
                value={formatInr(quotationResult.totals.subtotalBeforeGst)}
              />
              <StatCard
                accent="violet"
                label="GST"
                value={formatInr(quotationResult.totals.gstAmount)}
              />
              <StatCard
                accent="emerald"
                label="Grand total"
                value={formatInr(quotationResult.totals.grandTotal)}
              />
              <StatCard
                accent="amber"
                label="Windows"
                value={String(
                  quotationForm.windows.reduce((sum, row) => sum + row.quantity, 0),
                )}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Proposed installation amount (optional presentation line)</Label>
                <Input
                  inputMode="decimal"
                  value={String(proposal.installationAmount)}
                  onChange={(e) =>
                    updateProposal({ installationAmount: parseNumber(e.target.value, 0) })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Advance amount (display)</Label>
                <Input
                  inputMode="decimal"
                  value={String(proposal.advanceAmount)}
                  onChange={(e) =>
                    updateProposal({ advanceAmount: parseNumber(e.target.value, 0) })
                  }
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={proposal.showAverageRate}
                onCheckedChange={(checked) =>
                  updateProposal({ showAverageRate: checked === true })
                }
              />
              Show average rate per square foot in PDF
            </label>
          </div>
        );

      case "Terms":
        return (
          <div className="space-y-3">
            <MessageBanner tone="info">
              Premium Proposal uses the same terms and conditions as your existing Quotation
              PDF. Edit GST mode on the Quotation tab if the GST terms line should change.
            </MessageBanner>
            <ol className="list-decimal space-y-2 rounded-xl border border-slate-200 bg-white p-4 pl-8 text-sm">
              {QUOTATION_STANDARD_TERMS.map((term) => (
                <li key={term}>{term}</li>
              ))}
            </ol>
          </div>
        );

      case "Approval":
        return (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Acceptance place</Label>
              <Input
                value={proposal.acceptancePlace}
                onChange={(e) => updateProposal({ acceptancePlace: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Proposal status</Label>
              <Select
                value={proposal.status}
                onValueChange={(v) =>
                  updateProposal({ status: v as ProposalStatus })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["draft", "sent", "viewed", "accepted", "rejected", "expired"] as const).map(
                    (status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case "Preview":
        return (
          <div className="space-y-4">
            <MessageBanner tone="info">
              Premium Proposal PDF is designed as a 3–4 page document: Cover · Window designs ·
              Quote total · Terms &amp; approval.
            </MessageBanner>
            <div className="grid gap-3 sm:grid-cols-2">
              <StatCard accent="indigo" label="Customer" value={quotationForm.customerName || "—"} />
              <StatCard accent="cyan" label="Proposal No." value={proposal.proposalNumber} />
              <StatCard
                accent="emerald"
                label="Grand total (quotation)"
                value={formatInr(quotationResult.totals.grandTotal)}
              />
              <StatCard accent="amber" label="Pages" value="3–4 pages" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => handlePreviewPdf()}>
                <Eye />
                Preview PDF
              </Button>
              <Button type="button" onClick={() => handleExportPdf()} disabled={isPdfBusy}>
                <Download />
                Download PDF
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  }

  function renderCompanySettings() {
    return (
      <AccentCard accent="indigo">
        <AccentCardHeader>
          <AccentCardTitle>Company settings (used in Premium Proposal PDF)</AccentCardTitle>
          <AccentCardDescription>
            These details are saved locally and reused automatically. Quotation PDF letterhead
            remains unchanged.
          </AccentCardDescription>
        </AccentCardHeader>
        <AccentCardContent className="grid gap-3 sm:grid-cols-2">
          {(
            [
              ["companyName", "Company name"],
              ["tagline", "Tagline"],
              ["businessLine", "Business line"],
              ["address", "Address"],
              ["phones", "Phone"],
              ["email", "Email"],
              ["website", "Website"],
              ["gstNumber", "GST number"],
            ] as const
          ).map(([field, label]) => (
            <div key={field} className="space-y-1">
              <Label>{label}</Label>
              <Input
                value={company[field]}
                onChange={(e) => setCompany({ ...company, [field]: e.target.value })}
              />
            </div>
          ))}
        </AccentCardContent>
      </AccentCard>
    );
  }

  return (
    <PageShell className="gap-5">
      <PageHero
        icon={Sparkles}
        accent="indigo"
        title="Premium Proposal"
        description="Colourful client-facing proposal using the same quotation data, pricing and GST calculations."
        actions={
          <>
            <Button type="button" variant="outline" onClick={() => savePremiumProposal(proposal)}>
              <Save />
              Save Draft
            </Button>
            <Button type="button" variant="outline" onClick={() => handlePreviewPdf()}>
              <Eye />
              Preview PDF
            </Button>
            <Button type="button" onClick={() => handleExportPdf()} disabled={isPdfBusy}>
              <Download />
              Generate PDF
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setProposal(duplicatePremiumProposal(proposal))}
            >
              <Copy />
              Duplicate
            </Button>
            <Button type="button" variant="outline" onClick={handleShareWhatsApp}>
              <MessageCircle />
              WhatsApp
            </Button>
            <Button type="button" variant="outline" onClick={() => void handleCopyShareMessage()}>
              <Copy />
              Copy message
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setProposal(resetPremiumProposal());
                setPdfMessage("Premium proposal reset.");
              }}
            >
              <RotateCcw />
              Reset proposal
            </Button>
          </>
        }
      />

      {pdfMessage || isPdfBusy ? (
        <PdfFeedback
          message={pdfMessage}
          isBusy={isPdfBusy}
          busyLabel="Generating premium proposal PDF…"
        />
      ) : null}

      <PdfPreviewModal
        open={pdfPreview != null}
        title={pdfPreview?.title ?? "Premium Proposal Preview"}
        blobUrl={pdfPreview?.url ?? null}
        onClose={closePdfPreview}
        onExport={() => handleExportPdf()}
        isExporting={isPdfBusy}
        exportLabel="Download Premium Proposal PDF"
      />

      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="space-y-1 rounded-[18px] border border-slate-200 bg-white p-2 shadow-sm">
          {PROPOSAL_STEP_LABELS.map((step) => (
            <button
              key={step}
              type="button"
              onClick={() => setActiveStep(step)}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                activeStep === step
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {activeStep === step ? (
                <CheckCircle2 className="size-4 shrink-0" />
              ) : (
                <span className="size-4 shrink-0 rounded-full border border-slate-300" />
              )}
              {step}
            </button>
          ))}
        </aside>

        <div className="space-y-4">
          <SectionLabel>{activeStep}</SectionLabel>
          <AccentCard accent="violet">
            <AccentCardContent className="pt-6">{renderStepContent()}</AccentCardContent>
          </AccentCard>
          {activeStep === "Cover" ? renderCompanySettings() : null}
        </div>
      </div>
    </PageShell>
  );
}

function formatInr(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

function WINDOW_LABEL(type: string): string {
  return type.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
