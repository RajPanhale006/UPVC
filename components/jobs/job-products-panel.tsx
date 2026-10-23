"use client";

import {
  Copy,
  DoorOpen,
  LayoutGrid,
  PanelTop,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AccentCard,
  AccentCardContent,
  AccentCardDescription,
  AccentCardHeader,
  AccentCardTitle,
  PageHero,
  PageShell,
} from "@/components/workshop/workshop-ui";
import {
  addProductToJob,
  duplicateProduct,
  getActiveProduct,
  getCurrentUserName,
  removeProduct,
  reorderProducts,
  setActiveProduct,
  updateProductQuantity,
  type WorkshopJob,
} from "@/lib/jobs";

type JobProductsPanelProps = {
  job: WorkshopJob;
  onJobChange: (job: WorkshopJob) => void;
  onOpenCutting?: () => void;
  onOpenSummary?: () => void;
  onOpenEstimate?: () => void;
  onOpenQuotation?: () => void;
};

export function JobProductsPanel({
  job,
  onJobChange,
  onOpenCutting,
  onOpenSummary,
  onOpenEstimate,
  onOpenQuotation,
}: JobProductsPanelProps) {
  const user = getCurrentUserName();
  const active = getActiveProduct(job);

  function selectProduct(productId: string) {
    onJobChange(setActiveProduct(job, productId));
  }

  return (
    <PageShell>
      <PageHero
        title="Products"
        description="Manage windows and doors in this job."
        icon={LayoutGrid}
        actions={
          <>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onJobChange(addProductToJob(job, "window", user))}
            >
              <PanelTop />
              Add Window
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onJobChange(addProductToJob(job, "door", user))}
            >
              <DoorOpen />
              Add Door
            </Button>
          </>
        }
      />

      <AccentCard>
        <AccentCardHeader>
          <AccentCardTitle>Job products</AccentCardTitle>
          <AccentCardDescription>
            Active product syncs with Cutting, Summary, Estimate and Quotation actions.
          </AccentCardDescription>
        </AccentCardHeader>
        <AccentCardContent className="space-y-3">
          {job.products
            .slice()
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((product, index) => {
              const isActive = product.id === active?.id;
              return (
                <div
                  key={product.id}
                  className={`flex flex-col gap-3 rounded-xl border p-4 md:flex-row md:items-center md:justify-between ${
                    isActive ? "border-blue-300 bg-blue-50/50" : "border-slate-200"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">
                      {product.id} · {product.label}
                    </p>
                    <p className="text-sm text-slate-500">
                      {product.productKind === "door" ? "Door" : "Window"}
                      {product.location ? ` · ${product.location}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      className="w-20"
                      value={product.estimationInputs.numberOfWindows}
                      onChange={(e) =>
                        onJobChange(
                          updateProductQuantity(
                            job,
                            product.id,
                            Number.parseInt(e.target.value, 10),
                          ),
                        )
                      }
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant={isActive ? "default" : "outline"}
                      onClick={() => selectProduct(product.id)}
                    >
                      {isActive ? "Active" : "Open"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => onJobChange(duplicateProduct(job, product.id, user))}
                    >
                      <Copy />
                    </Button>
                    {index > 0 ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const ids = job.products.map((p) => p.id);
                          const tmp = ids[index - 1]!;
                          ids[index - 1] = ids[index]!;
                          ids[index] = tmp;
                          onJobChange(reorderProducts(job, ids));
                        }}
                      >
                        ↑
                      </Button>
                    ) : null}
                    {index < job.products.length - 1 ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const ids = job.products.map((p) => p.id);
                          const tmp = ids[index + 1]!;
                          ids[index + 1] = ids[index]!;
                          ids[index] = tmp;
                          onJobChange(reorderProducts(job, ids));
                        }}
                      >
                        ↓
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={job.products.length <= 1}
                      onClick={() => onJobChange(removeProduct(job, product.id, user))}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>
              );
            })}
        </AccentCardContent>
      </AccentCard>

      {active ? (
        <AccentCard>
          <AccentCardHeader>
            <AccentCardTitle>Quick actions — {active.id}</AccentCardTitle>
          </AccentCardHeader>
          <AccentCardContent className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={onOpenCutting}>
              Open in Cutting
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={onOpenSummary}>
              Open in Summary
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={onOpenEstimate}>
              Open in Estimate
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={onOpenQuotation}>
              Add to Quotation
            </Button>
          </AccentCardContent>
        </AccentCard>
      ) : null}
    </PageShell>
  );
}
