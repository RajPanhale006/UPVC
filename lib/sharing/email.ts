import { loadCompanySettings } from "@/lib/company-settings";
import type { QuotationForm } from "@/lib/quotation/types";
import { getQuotationDisplayId } from "@/lib/quotation/workflow";
import { formatInr } from "@/lib/profiles";

export type EmailSendRequest = {
  to: string;
  cc?: string;
  subject: string;
  body: string;
  attachmentBlob?: Blob;
  attachmentName?: string;
  sendCopyToCompany?: boolean;
};

export type EmailSendResult =
  | { ok: true; sentAt: string }
  | { ok: false; error: string; requiresProvider: boolean };

/** Server-side email provider abstraction — configure API route or external service. */
export async function sendQuotationEmail(
  request: EmailSendRequest,
): Promise<EmailSendResult> {
  if (typeof window === "undefined") {
    return {
      ok: false,
      error: "Email can only be sent from the client runtime",
      requiresProvider: true,
    };
  }

  try {
    const response = await fetch("/api/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: request.to,
        cc: request.cc,
        subject: request.subject,
        body: request.body,
        sendCopyToCompany: request.sendCopyToCompany ?? false,
        attachmentName: request.attachmentName,
      }),
    });

    if (response.status === 404 || response.status === 501) {
      return {
        ok: false,
        error: "Email provider not configured. Set up /api/email/send on the server.",
        requiresProvider: true,
      };
    }

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      return {
        ok: false,
        error: data.error ?? `Email send failed (${response.status})`,
        requiresProvider: false,
      };
    }

    return { ok: true, sentAt: new Date().toISOString() };
  } catch {
    return {
      ok: false,
      error: "Email provider not configured. Deploy with a secure server-side email API.",
      requiresProvider: true,
    };
  }
}

export type EmailDraftInput = {
  customerName: string;
  quotationForm: QuotationForm;
  projectName: string;
  grandTotal: number;
  validUntil?: string;
};

export function buildDefaultEmailSubject(input: EmailDraftInput): string {
  const company = loadCompanySettings().companyName;
  const qid = getQuotationDisplayId(input.quotationForm);
  return `Quotation ${qid} from ${company}`;
}

export function buildDefaultEmailBody(input: EmailDraftInput): string {
  const company = loadCompanySettings().companyName;
  const name = input.customerName.trim() || "Customer";
  const qid = getQuotationDisplayId(input.quotationForm);
  const valid = input.validUntil ?? input.quotationForm.validUntil ?? "as per quotation";

  return [
    `Dear ${name},`,
    "",
    `Thank you for considering ${company}.`,
    "",
    `Please find attached your quotation for ${input.projectName}.`,
    "",
    `Quotation Number: ${qid}`,
    `Grand Total: ${formatInr(input.grandTotal)}`,
    `Valid Until: ${valid}`,
    "",
    "Regards,",
    company,
  ].join("\n");
}

export function validateEmailAddress(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function buildMailtoFallback(request: EmailSendRequest): string {
  const params = new URLSearchParams();
  if (request.cc) params.set("cc", request.cc);
  params.set("subject", request.subject);
  params.set("body", request.body);
  return `mailto:${encodeURIComponent(request.to)}?${params.toString()}`;
}
