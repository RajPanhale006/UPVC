"use client";

import { ArrowLeft } from "lucide-react";

import { PartnerActiveJobStrip } from "@/components/partner-workspace/partner-active-job-strip";
import type { DoorHardwareMasterSettings } from "@/lib/door-hardware";
import type { WorkshopJob } from "@/lib/jobs";
import type { ProfileRateSettings } from "@/lib/profiles";
import type { CuttingJobMeta } from "@/lib/summary/types";

import { MaterialDetailsTab } from "./material-details-tab";

type MaterialDetailsScreenProps = {
  job: WorkshopJob;
  profileRates: ProfileRateSettings;
  doorHardwareMaster: DoorHardwareMasterSettings;
  cuttingJobMeta?: CuttingJobMeta;
  isOnline: boolean;
  onBack: () => void;
};

export function MaterialDetailsScreen({
  job,
  profileRates,
  doorHardwareMaster,
  cuttingJobMeta,
  isOnline,
  onBack,
}: MaterialDetailsScreenProps) {
  return (
    <div className="min-h-full bg-[#f4f7fc] pb-[calc(7rem+env(safe-area-inset-bottom))]">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-[#f4f7fc]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-3 py-2.5">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to Home"
            className="flex size-9 shrink-0 items-center justify-center rounded-lg text-slate-700 transition hover:bg-slate-100"
          >
            <ArrowLeft className="size-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-bold text-slate-900">Material Details</h1>
            <p className="truncate text-[11px] text-slate-600">
              Profiles, glass, mesh, hardware, labour — per window with rates
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

      <div className="mx-auto max-w-5xl px-4 py-4">
        <MaterialDetailsTab
          job={job}
          profileRates={profileRates}
          doorHardwareMaster={doorHardwareMaster}
          cuttingJobMeta={cuttingJobMeta}
        />
      </div>
    </div>
  );
}
