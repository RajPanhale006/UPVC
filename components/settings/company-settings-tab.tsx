"use client";

import { useState } from "react";
import { Building2, RotateCcw, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AccentCard,
  AccentCardContent,
  AccentCardDescription,
  AccentCardHeader,
  AccentCardTitle,
  MessageBanner,
  PageHero,
  PageShell,
} from "@/components/workshop/workshop-ui";
import {
  loadCompanySettings,
  readImageFileAsDataUrl,
  resetCompanySettings,
  restoreQuotationReferencePhotosToDefaults,
  saveCompanySettings,
  validateCompanySettings,
  type CompanySettings,
} from "@/lib/company-settings";
import {
  DEFAULT_QUOTATION_REFERENCE_PHOTOS,
  REFERENCE_PHOTO_HINTS,
  referencePhotoDisplaySrc,
} from "@/lib/company-settings/default-reference-photos";
import { WINDOW_TYPE_LABELS, WINDOW_TYPE_ORDER } from "@/lib/quotation/defaults";
import type { WindowTypeId } from "@/lib/quotation/types";
import {
  canEditCompanySettings,
  getCurrentUserName,
  getCurrentUserRole,
  setCurrentUserName,
  setCurrentUserRole,
  type UserRole,
} from "@/lib/jobs/permissions";
import { shouldShowSettingsBlock } from "@/lib/module-menu";
import {
  DEFAULT_TERMS,
  loadTerms,
  resetTermsToDefaults,
  saveTerms,
  TERM_GROUP_LABELS,
  type TermRecord,
} from "@/lib/terms";

type CompanySettingsTabProps = {
  activeSection?: string;
};

export function CompanySettingsTab({ activeSection }: CompanySettingsTabProps) {
  const [settings, setSettings] = useState<CompanySettings>(() => loadCompanySettings());
  const [terms, setTerms] = useState<TermRecord[]>(() => loadTerms());
  const [role, setRole] = useState<UserRole>(() => getCurrentUserRole());
  const [userName, setUserName] = useState(() => getCurrentUserName());
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const canEdit = canEditCompanySettings(role);
  const show = (block: string) => shouldShowSettingsBlock(activeSection, block);
  const sectionMode = Boolean(activeSection);

  function updateField<K extends keyof CompanySettings>(key: K, value: CompanySettings[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  async function handleImage(
    key: "logoDataUrl" | "signatureDataUrl" | "stampDataUrl" | "upiQrDataUrl",
    file: File | null,
  ) {
    if (!file) return;
    const result = await readImageFileAsDataUrl(file);
    if (!result.ok) {
      setErrors([result.error]);
      return;
    }
    updateField(key, result.dataUrl);
  }

  async function handleReferencePhoto(windowType: WindowTypeId, file: File | null) {
    if (!file) return;
    const result = await readImageFileAsDataUrl(file, 800_000);
    if (!result.ok) {
      setErrors([result.error]);
      return;
    }
    setSettings((current) => ({
      ...current,
      quotationReferencePhotos: {
        ...current.quotationReferencePhotos,
        [windowType]: result.dataUrl,
      },
    }));
  }

  function clearReferencePhoto(windowType: WindowTypeId) {
    setSettings((current) => {
      const next = { ...(current.quotationReferencePhotos ?? {}) };
      const defaultPath = DEFAULT_QUOTATION_REFERENCE_PHOTOS[windowType];
      if (defaultPath) {
        next[windowType] = defaultPath;
      } else {
        delete next[windowType];
      }
      return { ...current, quotationReferencePhotos: next };
    });
  }

  function handleRestoreDefaultReferencePhotos() {
    setSettings((current) => restoreQuotationReferencePhotosToDefaults(current));
    setMessage("Restored default reference photos for all window types.");
    setErrors([]);
  }

  function handleSave() {
    const validation = validateCompanySettings(settings);
    if (!validation.ok) {
      setErrors(validation.errors);
      return;
    }
    saveCompanySettings(settings);
    saveTerms(terms);
    setCurrentUserRole(role);
    setCurrentUserName(userName);
    setErrors([]);
    setMessage("Company settings saved.");
  }

  function handleReset() {
    setSettings(resetCompanySettings());
    setTerms(resetTermsToDefaults());
    setMessage("Restored default company settings and terms.");
  }

  const saveActions = canEdit ? (
    <>
      <Button type="button" size="sm" variant="outline" onClick={handleReset}>
        <RotateCcw />
        Reset
      </Button>
      <Button type="button" size="sm" onClick={handleSave}>
        <Save />
        Save
      </Button>
    </>
  ) : null;

  return (
    <PageShell>
      {!sectionMode ? (
        <PageHero
          title="Company Settings"
          description="Branding, bank details, defaults and reusable terms for PDFs."
          icon={Building2}
          actions={saveActions}
        />
      ) : saveActions ? (
        <div className="flex flex-wrap gap-2 px-4 md:px-8">{saveActions}</div>
      ) : null}

      {!canEdit ? (
        <MessageBanner tone="warning">
          Company settings can only be edited by Admin role. Current role: {role}.
        </MessageBanner>
      ) : null}

      {message ? <MessageBanner tone="info">{message}</MessageBanner> : null}
      {errors.length > 0 ? (
        <MessageBanner tone="warning">{errors.join(" · ")}</MessageBanner>
      ) : null}

      {show("users-permissions") ? (
        <AccentCard>
          <AccentCardHeader>
            <AccentCardTitle>User & permissions</AccentCardTitle>
            <AccentCardDescription>Offline role flags for this device.</AccentCardDescription>
          </AccentCardHeader>
          <AccentCardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Your name</Label>
              <Input value={userName} onChange={(e) => setUserName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <select
                className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
              >
                <option value="admin">Admin</option>
                <option value="manager">Partner / Manager</option>
                <option value="sales">Sales User</option>
                <option value="workshop">Workshop User</option>
              </select>
            </div>
          </AccentCardContent>
        </AccentCard>
      ) : null}

      {show("company-details") ? (
        <AccentCard>
          <AccentCardHeader>
            <AccentCardTitle>Company profile</AccentCardTitle>
          </AccentCardHeader>
          <AccentCardContent className="grid gap-4 md:grid-cols-2">
            {(
              [
                ["companyName", "Company name"],
                ["tagline", "Tagline"],
                ["businessDescription", "Business description"],
                ["address", "Address"],
                ["phone1", "Phone 1"],
                ["phone2", "Phone 2"],
                ["email", "Email"],
                ["website", "Website"],
                ["authorizedSignatoryName", "Authorized signatory"],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="space-y-2">
                <Label>{label}</Label>
                <Input
                  value={String(settings[key] ?? "")}
                  disabled={!canEdit}
                  onChange={(e) => updateField(key, e.target.value)}
                />
              </div>
            ))}
          </AccentCardContent>
        </AccentCard>
      ) : null}

      {show("logo-branding") ? (
        <AccentCard>
          <AccentCardHeader>
            <AccentCardTitle>Logo and branding</AccentCardTitle>
            <AccentCardDescription>Logo and footer text shown on PDFs.</AccentCardDescription>
          </AccentCardHeader>
          <AccentCardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Footer text</Label>
              <Input
                value={String(settings.footerText ?? "")}
                disabled={!canEdit}
                onChange={(e) => updateField("footerText", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Logo</Label>
              <Input
                type="file"
                accept="image/*"
                disabled={!canEdit}
                onChange={(e) => void handleImage("logoDataUrl", e.target.files?.[0] ?? null)}
              />
              {settings.logoDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={settings.logoDataUrl} alt="Logo preview" className="h-16 object-contain" />
              ) : null}
            </div>
          </AccentCardContent>
        </AccentCard>
      ) : null}

      {show("gst-bank") ? (
        <AccentCard>
          <AccentCardHeader>
            <AccentCardTitle>GST and bank details</AccentCardTitle>
            <AccentCardDescription>Tax and payment details for customer documents.</AccentCardDescription>
          </AccentCardHeader>
          <AccentCardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>GST number</Label>
              <Input
                value={String(settings.gstNumber ?? "")}
                disabled={!canEdit}
                onChange={(e) => updateField("gstNumber", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>PAN</Label>
              <Input
                value={String(settings.panNumber ?? "")}
                disabled={!canEdit}
                onChange={(e) => updateField("panNumber", e.target.value)}
              />
            </div>
            {(
              [
                ["bankName", "Bank name"],
                ["accountName", "Account name"],
                ["accountNumber", "Account number"],
                ["ifsc", "IFSC"],
                ["upiId", "UPI ID"],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="space-y-2">
                <Label>{label}</Label>
                <Input
                  value={String(settings[key] ?? "")}
                  disabled={!canEdit}
                  onChange={(e) => updateField(key, e.target.value)}
                />
              </div>
            ))}
          </AccentCardContent>
        </AccentCard>
      ) : null}

      {show("signature-stamp") ? (
        <AccentCard>
          <AccentCardHeader>
            <AccentCardTitle>Signature and stamp</AccentCardTitle>
            <AccentCardDescription>Images used on signed PDF documents.</AccentCardDescription>
          </AccentCardHeader>
          <AccentCardContent className="grid gap-4 md:grid-cols-2">
            {(
              [
                ["signatureDataUrl", "Authorised signature"],
                ["stampDataUrl", "Company stamp"],
                ["upiQrDataUrl", "UPI QR code"],
              ] as const
            ).map(([field, label]) => (
              <div key={field} className="space-y-2">
                <Label>{label}</Label>
                <Input
                  type="file"
                  accept="image/*"
                  disabled={!canEdit}
                  onChange={(e) => void handleImage(field, e.target.files?.[0] ?? null)}
                />
                {settings[field] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={settings[field]} alt={label} className="h-16 object-contain" />
                ) : null}
              </div>
            ))}
          </AccentCardContent>
        </AccentCard>
      ) : null}

      {show("pdf-settings") ? (
        <AccentCard>
          <AccentCardHeader>
            <AccentCardTitle>Quotation reference photos</AccentCardTitle>
            <AccentCardDescription>
              One photo per window type appears on the last quotation PDF page. Default reference
              photos are included — upload a new image to replace any type. Missing photos use the
              technical diagram instead.
            </AccentCardDescription>
          </AccentCardHeader>
          <AccentCardContent className="space-y-4">
            {canEdit ? (
              <Button type="button" size="sm" variant="outline" onClick={handleRestoreDefaultReferencePhotos}>
                <RotateCcw className="size-4" />
                Restore default photos
              </Button>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {WINDOW_TYPE_ORDER.map((windowType) => {
                const photo = settings.quotationReferencePhotos?.[windowType];
                return (
                  <div
                    key={windowType}
                    className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3"
                  >
                    <Label>{WINDOW_TYPE_LABELS[windowType]}</Label>
                    <p className="text-xs text-slate-500">{REFERENCE_PHOTO_HINTS[windowType]}</p>
                    <Input
                      type="file"
                      accept="image/*"
                      disabled={!canEdit}
                      onChange={(e) =>
                        void handleReferencePhoto(windowType, e.target.files?.[0] ?? null)
                      }
                    />
                    {photo ? (
                      <div className="space-y-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={referencePhotoDisplaySrc(photo)}
                          alt={WINDOW_TYPE_LABELS[windowType]}
                          className="h-28 w-full rounded-lg border border-slate-200 object-contain bg-white"
                        />
                        {canEdit ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => clearReferencePhoto(windowType)}
                          >
                            {DEFAULT_QUOTATION_REFERENCE_PHOTOS[windowType]
                              ? "Reset to default"
                              : "Remove"}
                          </Button>
                        ) : null}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">
                        No photo — upload one or the technical diagram is used on the PDF.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </AccentCardContent>
        </AccentCard>
      ) : null}

      {show("pdf-settings") ? (
        <AccentCard>
          <AccentCardHeader>
            <AccentCardTitle>PDF settings</AccentCardTitle>
            <AccentCardDescription>Default values for quotation documents.</AccentCardDescription>
          </AccentCardHeader>
          <AccentCardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Default quotation validity (days)</Label>
              <Input
                type="number"
                disabled={!canEdit}
                value={settings.defaultQuotationValidityDays}
                onChange={(e) =>
                  updateField(
                    "defaultQuotationValidityDays",
                    Number.parseInt(e.target.value, 10) || 15,
                  )
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Default advance %</Label>
              <Input
                type="number"
                disabled={!canEdit}
                value={settings.defaultAdvancePercent}
                onChange={(e) =>
                  updateField(
                    "defaultAdvancePercent",
                    Number.parseInt(e.target.value, 10) || 50,
                  )
                }
              />
            </div>
          </AccentCardContent>
        </AccentCard>
      ) : null}

      {show("terms") ? (
        <AccentCard>
          <AccentCardHeader>
            <AccentCardTitle>Terms library</AccentCardTitle>
            <AccentCardDescription>Reusable terms included in quotations and proposals.</AccentCardDescription>
          </AccentCardHeader>
          <AccentCardContent className="space-y-3">
            {terms.map((term) => (
              <div key={term.id} className="rounded-xl border border-slate-200 p-3">
                <p className="text-sm font-semibold text-slate-900">
                  {term.title} · {TERM_GROUP_LABELS[term.group]}
                </p>
                <p className="text-sm text-slate-600">{term.content}</p>
                <label className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                  <input
                    type="checkbox"
                    checked={term.defaultInclude}
                    disabled={!canEdit}
                    onChange={(e) =>
                      setTerms((current) =>
                        current.map((t) =>
                          t.id === term.id ? { ...t, defaultInclude: e.target.checked } : t,
                        ),
                      )
                    }
                  />
                  Include by default
                </label>
              </div>
            ))}
            {terms.length === 0 ? (
              <Button type="button" variant="outline" size="sm" onClick={() => setTerms(DEFAULT_TERMS)}>
                Load defaults
              </Button>
            ) : null}
          </AccentCardContent>
        </AccentCard>
      ) : null}

      {show("app-preferences") ? (
        <AccentCard>
          <AccentCardHeader>
            <AccentCardTitle>App preferences</AccentCardTitle>
            <AccentCardDescription>
              Theme, language and dashboard defaults are stored on this device.
            </AccentCardDescription>
          </AccentCardHeader>
          <AccentCardContent>
            <MessageBanner tone="info">
              App preferences use your current role ({role}) and saved job data on this device.
              Additional preference controls can be added here without changing business logic.
            </MessageBanner>
          </AccentCardContent>
        </AccentCard>
      ) : null}
    </PageShell>
  );
}
