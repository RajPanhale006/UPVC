import type { WindowTypeId } from "@/lib/quotation/types";

export type CompanySettings = {
  companyName: string;
  tagline: string;
  businessLine: string;
  businessDescription: string;
  address: string;
  /** Legacy combined phones — kept for backward compatibility. */
  phones: string;
  phone1: string;
  phone2: string;
  email: string;
  website: string;
  gstNumber: string;
  panNumber: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  ifsc: string;
  upiId: string;
  upiQrDataUrl: string;
  logoDataUrl: string;
  signatureDataUrl: string;
  stampDataUrl: string;
  primaryBrandColor: string;
  secondaryBrandColor: string;
  accentColor: string;
  footerText: string;
  defaultQuotationValidityDays: number;
  defaultAdvancePercent: number;
  defaultGstPercent: number;
  warrantyText: string;
  termsAndConditions: string;
  civilWorkExclusion: string;
  electricalWorkExclusion: string;
  colourVariationDisclaimer: string;
  preparedByDefault: string;
  authorizedSignatoryName: string;
  profileWarrantyDefault: string;
  hardwareWarrantyDefault: string;
  glassWarrantyDefault: string;
  installationWarrantyDefault: string;
  /** Reference product photos shown on the last page of quotation PDFs. */
  quotationReferencePhotos: Partial<Record<WindowTypeId, string>>;
};
