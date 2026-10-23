"use client";

import { JobActivityTab } from "@/components/jobs/job-activity-tab";
import { JobDocumentsTab } from "@/components/jobs/job-documents-tab";
import { JobOverviewTab } from "@/components/jobs/job-overview-tab";
import { JobProductsPanel } from "@/components/jobs/job-products-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { WorkshopJob } from "@/lib/jobs";

type JobWorkspaceProps = {
  job: WorkshopJob;
  onJobChange: (job: WorkshopJob) => void;
  onNavigate?: (tab: string) => void;
  section?: "overview" | "products" | "documents" | "activity";
};

export function JobWorkspace({
  job,
  onJobChange,
  onNavigate,
  section = "overview",
}: JobWorkspaceProps) {
  const tab = section;

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => {
        if (
          value === "overview" ||
          value === "products" ||
          value === "documents" ||
          value === "activity"
        ) {
          onNavigate?.(value);
        }
      }}
      className="flex flex-col gap-0"
    >
      <div className="sticky top-[73px] z-20 border-b border-slate-200/80 bg-white/95 px-4 py-3 backdrop-blur-xl md:px-8">
        <TabsList className="grid h-auto w-full max-w-2xl grid-cols-4 gap-1 rounded-xl bg-slate-100 p-1">
          {(
            [
              ["overview", "Overview"],
              ["products", "Products"],
              ["documents", "Documents"],
              ["activity", "Activity"],
            ] as const
          ).map(([value, label]) => (
            <TabsTrigger
              key={value}
              value={value}
              className="rounded-lg px-3 py-2 text-sm font-semibold data-active:bg-white data-active:shadow-sm"
            >
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      <TabsContent value="overview" className="mt-0 outline-none">
        <JobOverviewTab job={job} onJobChange={onJobChange} />
      </TabsContent>
      <TabsContent value="products" className="mt-0 outline-none">
        <JobProductsPanel
          job={job}
          onJobChange={onJobChange}
          onOpenCutting={() => onNavigate?.("calculator")}
          onOpenSummary={() => onNavigate?.("summary")}
          onOpenEstimate={() => onNavigate?.("estimation")}
          onOpenQuotation={() => onNavigate?.("quotation")}
        />
      </TabsContent>
      <TabsContent value="documents" className="mt-0 outline-none">
        <JobDocumentsTab job={job} onJobChange={onJobChange} />
      </TabsContent>
      <TabsContent value="activity" className="mt-0 outline-none">
        <JobActivityTab job={job} />
      </TabsContent>
    </Tabs>
  );
}
