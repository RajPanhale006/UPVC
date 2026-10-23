"use client";

import { ArrowLeft } from "lucide-react";

import { PartnerActiveJobStrip } from "@/components/partner-workspace/partner-active-job-strip";
import type { DoorHardwareMasterSettings } from "@/lib/door-hardware";
import type { WorkshopJob } from "@/lib/jobs";
import type { ProfileRateSettings } from "@/lib/profiles";
import type { QuotationForm } from "@/lib/quotation";

import { SimpleQuoteSheet } from "./simple-quote-sheet";

type SimpleQuoteScreenProps = {
  job: WorkshopJob;
  profileRates: ProfileRateSettings;
  doorHardwareMaster: DoorHardwareMasterSettings;
  quotationForm: QuotationForm;
  isOnline: boolean;
  onBack: () => void;
  onJobChange: (job: WorkshopJob) => void;
  onQuotationChange: (form: QuotationForm) => void;
  onProfileRatesChange: (settings: ProfileRateSettings) => void;
  onOpenQuotation: () => void;
  onOpenMaterialDetails?: () => void;
};

export function SimpleQuoteScreen({
  job,
  profileRates,
  doorHardwareMaster,
  quotationForm,
  isOnline,
  onBack,
  onJobChange,
  onQuotationChange,
  onProfileRatesChange,
  onOpenQuotation,
  onOpenMaterialDetails,
}: SimpleQuoteScreenProps) {
  return (
    <div className="min-h-full bg-[#f4f7fc] pb-[calc(7rem+env(safe-area-inset-bottom))]">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-[#f4f7fc]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center gap-2 px-3 py-2.5">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to Home"
            className="flex size-9 shrink-0 items-center justify-center rounded-lg text-slate-700 transition hover:bg-slate-100"
          >
            <ArrowLeft className="size-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-bold text-slate-900">Quick Quote Sheet</h1>
            <p className="truncate text-[11px] text-slate-600">
              Excel-style entry — sizes, track type, quantity, instant quotation
            </p>
          </div>
        </div>
        <PartnerActiveJobStrip
          jobId={job.id}
          projectName={job.projectName}
          productCount={job.products.length}
          isOnline={isOnline}
          onOpenJob={onBack}
          compact
        />
      </header>

      <div className="mx-auto max-w-4xl px-4 py-4">
        <SimpleQuoteSheet
          job={job}
          profileRates={profileRates}
          doorHardwareMaster={doorHardwareMaster}
          quotationForm={quotationForm}
          onJobChange={onJobChange}
          onQuotationChange={onQuotationChange}
          onProfileRatesChange={onProfileRatesChange}
          onOpenQuotation={onOpenQuotation}
          onOpenMaterialDetails={onOpenMaterialDetails}
        />
      </div>
    </div>
  );
}
