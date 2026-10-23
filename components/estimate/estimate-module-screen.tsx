"use client";

import { ArrowLeft } from "lucide-react";

import { PartnerActiveJobStrip } from "@/components/partner-workspace/partner-active-job-strip";
import { ProjectEstimatePanel } from "@/components/partner-workspace/project-estimate-panel";
import type { DoorHardwareMasterSettings } from "@/lib/door-hardware";
import type { WorkshopJob } from "@/lib/jobs";
import type { ProfileRateSettings } from "@/lib/profiles";
import type { QuotationForm } from "@/lib/quotation";

type EstimateModuleScreenProps = {
  job: WorkshopJob;
  profileRates: ProfileRateSettings;
  doorHardwareMaster: DoorHardwareMasterSettings;
  quotationForm: QuotationForm;
  isOnline: boolean;
  onBack: () => void;
  onJobChange: (job: WorkshopJob) => void;
  onQuotationChange: (form: QuotationForm) => void;
  onOpenQuotation: () => void;
  onSelectProduct: (productId: string) => void;
};

export function EstimateModuleScreen({
  job,
  profileRates,
  doorHardwareMaster,
  quotationForm,
  isOnline,
  onBack,
  onJobChange,
  onQuotationChange,
  onOpenQuotation,
  onSelectProduct,
}: EstimateModuleScreenProps) {
  return (
    <div className="min-h-full bg-[#f4f7fc] pb-[calc(7rem+env(safe-area-inset-bottom))]">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-[#f4f7fc]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-3 py-2.5">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to Home"
            className="flex size-9 shrink-0 items-center justify-center rounded-lg text-slate-700 transition hover:bg-slate-100"
          >
            <ArrowLeft className="size-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-bold text-slate-900">Estimate</h1>
            <p className="truncate text-[11px] text-slate-600">
              Preliminary customer estimate from saved products
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

      <div className="mx-auto max-w-3xl px-4 py-4">
        <ProjectEstimatePanel
          job={job}
          profileRates={profileRates}
          doorHardwareMaster={doorHardwareMaster}
          quotationForm={quotationForm}
          onJobChange={onJobChange}
          onQuotationChange={onQuotationChange}
          onSelectProduct={onSelectProduct}
          onConvertToQuotation={onOpenQuotation}
        />
      </div>
    </div>
  );
}
