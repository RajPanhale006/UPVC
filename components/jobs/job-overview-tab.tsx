"use client";

import { Briefcase, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AccentCard,
  AccentCardContent,
  AccentCardHeader,
  AccentCardTitle,
  PageHero,
  PageShell,
  StatCard,
} from "@/components/workshop/workshop-ui";
import { JOB_STATUS_LABELS, updateJobFields, type JobStatus, type WorkshopJob } from "@/lib/jobs";
import { getQuotationDisplayId } from "@/lib/quotation/workflow";

type JobOverviewTabProps = {
  job: WorkshopJob;
  onJobChange: (job: WorkshopJob) => void;
};

export function JobOverviewTab({ job, onJobChange }: JobOverviewTabProps) {
  function patch(fields: Parameters<typeof updateJobFields>[1]) {
    onJobChange(updateJobFields(job, fields));
  }

  return (
    <PageShell>
      <PageHero
        title="Job Overview"
        description="Customer, project details and job status."
        icon={Briefcase}
        actions={
          <Button type="button" size="sm" onClick={() => onJobChange(job)}>
            <Save />
            Saved locally
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Job ID" value={job.id} />
        <StatCard label="Products" value={String(job.products.length)} />
        <StatCard
          label="Quotation"
          value={getQuotationDisplayId(job.quotation)}
        />
      </div>

      <AccentCard>
        <AccentCardHeader>
          <AccentCardTitle>Customer & Project</AccentCardTitle>
        </AccentCardHeader>
        <AccentCardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="customerName">Customer name</Label>
            <Input
              id="customerName"
              value={job.customerName}
              onChange={(e) => patch({ customerName: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="customerPhone">Customer phone</Label>
            <Input
              id="customerPhone"
              value={job.customerPhone}
              onChange={(e) => patch({ customerPhone: e.target.value })}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="projectName">Project name</Label>
            <Input
              id="projectName"
              value={job.projectName}
              onChange={(e) => patch({ projectName: e.target.value })}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="billingAddress">Billing address</Label>
            <Input
              id="billingAddress"
              value={job.billingAddress}
              onChange={(e) => patch({ billingAddress: e.target.value })}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="siteAddress">Site address</Label>
            <Input
              id="siteAddress"
              value={job.siteAddress}
              onChange={(e) => patch({ siteAddress: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Job status</Label>
            <Select
              value={job.status}
              onValueChange={(v) => patch({ status: v as JobStatus })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(JOB_STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="jobNotes">Notes</Label>
            <Input
              id="jobNotes"
              value={job.notes}
              onChange={(e) => patch({ notes: e.target.value })}
            />
          </div>
        </AccentCardContent>
      </AccentCard>
    </PageShell>
  );
}
