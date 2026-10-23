import {
  COMPANY_ADDRESS,
  COMPANY_BUSINESS_LINE,
  COMPANY_EMAIL,
  COMPANY_NAME,
  COMPANY_PHONES,
  COMPANY_TAGLINE,
  COMPANY_WEBSITE,
} from "@/lib/brand";

import { getDefaultQuotationReferencePhotos } from "./default-reference-photos";
import type { CompanySettings } from "./types";

export function getDefaultCompanySettings(): CompanySettings {
  return {
    companyName: COMPANY_NAME,
    tagline: COMPANY_TAGLINE,
    businessLine: COMPANY_BUSINESS_LINE,
    businessDescription: COMPANY_BUSINESS_LINE,
    address: COMPANY_ADDRESS,
    phones: COMPANY_PHONES,
    phone1: "9665123238",
    phone2: "9850611971",
    email: COMPANY_EMAIL,
    website: COMPANY_WEBSITE,
    gstNumber: "",
    panNumber: "",
    bankName: "",
    accountName: "",
    accountNumber: "",
    ifsc: "",
    upiId: "",
    upiQrDataUrl: "",
    logoDataUrl: "",
    signatureDataUrl: "",
    stampDataUrl: "",
    primaryBrandColor: "#2563eb",
    secondaryBrandColor: "#1e40af",
    accentColor: "#059669",
    footerText: "Thank you for your business.",
    defaultQuotationValidityDays: 15,
    defaultAdvancePercent: 50,
    defaultGstPercent: 18,
    warrantyText: "",
    termsAndConditions: "",
    civilWorkExclusion: "Civil work is excluded unless specified in writing.",
    electricalWorkExclusion: "Electrical work is excluded from this quotation.",
    colourVariationDisclaimer: "Minor colour variation may occur between batches.",
    preparedByDefault: "",
    authorizedSignatoryName: "",
    profileWarrantyDefault:
      "UPVC profile warranty as per manufacturer terms, subject to proper use and maintenance.",
    hardwareWarrantyDefault:
      "Hardware warranty as per supplier terms for manufacturing defects under normal use.",
    glassWarrantyDefault:
      "Glass warranty as per glass supplier terms for manufacturing defects.",
    installationWarrantyDefault:
      "Installation workmanship warranty as agreed in writing for the specific project scope.",
    quotationReferencePhotos: getDefaultQuotationReferencePhotos(),
  };
}
