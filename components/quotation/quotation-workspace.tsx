"use client";

import { useEffect, useState } from "react";
import { FileText, Sparkles } from "lucide-react";

import { PremiumProposalTab } from "@/components/proposal/premium-proposal-tab";
import {
  QuotationTab,
  type QuotationJobContext,
} from "@/components/quotation/quotation-tab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { resolveQuotationSectionMode } from "@/lib/module-menu";
import type { QuotationForm } from "@/lib/quotation";
import { cn } from "@/lib/utils";

type QuotationWorkspaceProps = {
  form: QuotationForm;
  onFormChange: (form: QuotationForm) => void;
  jobContext?: QuotationJobContext;
  activeSubTab?: "quotation" | "premium-proposal";
  onSubTabChange?: (tab: "quotation" | "premium-proposal") => void;
  activeSection?: string;
};

export function QuotationWorkspace({
  form,
  onFormChange,
  jobContext,
  activeSubTab,
  onSubTabChange,
  activeSection,
}: QuotationWorkspaceProps) {
  const sectionMode = resolveQuotationSectionMode(activeSection);
  const [internalTab, setInternalTab] = useState<"quotation" | "premium-proposal">("quotation");
  const tab =
    sectionMode === "premium"
      ? "premium-proposal"
      : sectionMode === "quotation" || sectionMode === "share"
        ? "quotation"
        : (activeSubTab ?? internalTab);

  useEffect(() => {
    if (activeSubTab) setInternalTab(activeSubTab);
  }, [activeSubTab]);

  function handleTabChange(value: string) {
    const next = value as "quotation" | "premium-proposal";
    setInternalTab(next);
    onSubTabChange?.(next);
  }

  if (sectionMode === "premium") {
    return <PremiumProposalTab quotationForm={form} />;
  }

  if (sectionMode === "share") {
    return (
      <QuotationTab form={form} onFormChange={onFormChange} jobContext={jobContext} />
    );
  }

  if (sectionMode === "quotation") {
    return (
      <QuotationTab form={form} onFormChange={onFormChange} jobContext={jobContext} />
    );
  }

  return (
    <Tabs value={tab} onValueChange={handleTabChange} className="flex flex-col gap-0">
      <div className="sticky top-[73px] z-20 border-b border-slate-200/80 bg-white/95 px-4 py-3 backdrop-blur-xl md:px-8">
        <TabsList className="grid h-auto w-full max-w-md grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
          <TabsTrigger
            value="quotation"
            className={cn(
              "gap-2 rounded-lg px-3 py-2 text-sm font-semibold",
              "data-active:bg-white data-active:text-slate-900 data-active:shadow-sm",
            )}
          >
            <FileText className="size-4" />
            Quotation
          </TabsTrigger>
          <TabsTrigger
            value="premium-proposal"
            className={cn(
              "gap-2 rounded-lg px-3 py-2 text-sm font-semibold",
              "data-active:bg-gradient-to-r data-active:from-blue-600 data-active:to-indigo-600 data-active:text-white data-active:shadow-md",
            )}
          >
            <Sparkles className="size-4" />
            Premium Proposal
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="quotation" className="mt-0 outline-none">
        <QuotationTab
          form={form}
          onFormChange={onFormChange}
          jobContext={jobContext}
        />
      </TabsContent>

      <TabsContent value="premium-proposal" className="mt-0 outline-none">
        <PremiumProposalTab quotationForm={form} />
      </TabsContent>
    </Tabs>
  );
}
