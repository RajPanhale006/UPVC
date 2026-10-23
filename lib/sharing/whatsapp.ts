import { loadCompanySettings } from "@/lib/company-settings";
import { formatInr } from "@/lib/profiles";
import type { QuotationForm } from "@/lib/quotation/types";
import { getQuotationDisplayId } from "@/lib/quotation/workflow";

export type WhatsAppShareInput = {
  customerName: string;
  customerPhone: string;
  quotationForm: QuotationForm;
  projectName: string;
  grandTotal: number;
  validUntil?: string;
  companyName?: string;
};

export function sanitizeIndianPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  if (digits.length === 11 && digits.startsWith("0")) return `91${digits.slice(1)}`;
  if (digits.length >= 10 && digits.length <= 15) return digits;
  return null;
}

export function buildWhatsAppQuotationMessage(input: WhatsAppShareInput): string {
  const company = input.companyName ?? loadCompanySettings().companyName;
  const name = input.customerName.trim() || "Customer";
  const qid = getQuotationDisplayId(input.quotationForm);
  const valid = input.validUntil ?? input.quotationForm.validUntil ?? "as per quotation";

  return [
    `Hello ${name},`,
    "",
    `Please find your quotation ${qid} from ${company}.`,
    "",
    `Project: ${input.projectName}`,
    `Total: ${formatInr(input.grandTotal)}`,
    `Valid until: ${valid}`,
    "",
    "Thank you.",
  ].join("\n");
}

export function buildWhatsAppUrl(message: string, phone?: string): string {
  const encoded = encodeURIComponent(message);
  const sanitized = phone ? sanitizeIndianPhone(phone) : null;
  if (sanitized) {
    return `https://wa.me/${sanitized}?text=${encoded}`;
  }
  return `https://wa.me/?text=${encoded}`;
}

export function canShareOnWhatsApp(documentType: string): boolean {
  return documentType === "standard-quotation" || documentType === "premium-proposal";
}

export function blockInternalDocumentShare(documentType: string): boolean {
  return (
    documentType === "labour-cutting-sheet" ||
    documentType === "internal-estimation" ||
    documentType === "workshop-cost-summary" ||
    documentType === "profile-weight-summary"
  );
}
