import type { CompanySettings } from "./types";

/** Resolve company fields for PDF generation with safe fallbacks. */
export function resolveCompanyForPdf(settings: CompanySettings): {
  name: string;
  tagline: string;
  businessLine: string;
  address: string;
  phones: string;
  email: string;
  website: string;
  gstNumber: string;
  footerText: string;
  bankDetailsLine: string | null;
} {
  const phones = [settings.phone1, settings.phone2].filter(Boolean).join(" / ") || settings.phones;
  const bankParts = [
    settings.bankName && `Bank: ${settings.bankName}`,
    settings.accountName && `A/C: ${settings.accountName}`,
    settings.accountNumber && `No: ${settings.accountNumber}`,
    settings.ifsc && `IFSC: ${settings.ifsc}`,
    settings.upiId && `UPI: ${settings.upiId}`,
  ].filter(Boolean);

  return {
    name: settings.companyName.trim() || "Company Name",
    tagline: settings.tagline.trim(),
    businessLine: settings.businessDescription.trim() || settings.businessLine.trim(),
    address: settings.address.trim(),
    phones: phones.trim(),
    email: settings.email.trim(),
    website: settings.website.trim(),
    gstNumber: settings.gstNumber.trim(),
    footerText: settings.footerText.trim(),
    bankDetailsLine: bankParts.length > 0 ? bankParts.join(" · ") : null,
  };
}

export function getDefaultQuotationValidityDays(settings: CompanySettings): number {
  return settings.defaultQuotationValidityDays > 0
    ? settings.defaultQuotationValidityDays
    : 15;
}

export function getDefaultAdvancePercent(settings: CompanySettings): number {
  return settings.defaultAdvancePercent > 0 ? settings.defaultAdvancePercent : 50;
}

export function getDefaultGstPercent(settings: CompanySettings): number {
  return settings.defaultGstPercent > 0 ? settings.defaultGstPercent : 18;
}
