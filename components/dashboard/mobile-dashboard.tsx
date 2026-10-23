"use client";

import { useState } from "react";

import { Bot } from "lucide-react";

import type { WorkshopJob } from "@/lib/jobs";
import { isNativeApp } from "@/lib/capacitor/platform";
import { canUseAiAssistant } from "@/lib/assistant";

import type { DashboardActionId } from "./dashboard-config";
import { DashboardHeader } from "./dashboard-header";
import { DashboardTabs, type DashboardTabId } from "./dashboard-tabs";
import { QuickActionGrid } from "./quick-action-grid";
import { RecentDocuments } from "./recent-documents";
import { RecentJobs } from "./recent-jobs";
import { StatusStrip } from "./status-strip";
import { APP_MADE_BY } from "@/lib/brand";

import { formatTimeAgo, useOnlineStatus } from "./dashboard-utils";

type MobileDashboardProps = {
  job: WorkshopJob;
  onAction: (action: DashboardActionId) => void;
  onContinueJob: (jobId: string) => void;
  onOpenActiveJob: () => void;
  onOpenSettings: () => void;
  onOpenDocuments: () => void;
  onOpenAssistant?: () => void;
};

export function MobileDashboard({
  job,
  onAction,
  onContinueJob,
  onOpenActiveJob,
  onOpenSettings,
  onOpenDocuments,
  onOpenAssistant,
}: MobileDashboardProps) {
  const [tab, setTab] = useState<DashboardTabId>("quick-actions");
  const isOnline = useOnlineStatus();

  return (
    <div className="page-enter min-h-full bg-[#f4f7fc] pb-[calc(6.5rem+env(safe-area-inset-bottom))] md:pb-8">
      <div className="md:hidden">
        <DashboardHeader
          isOnline={isOnline}
          onMenuClick={onOpenSettings}
          onProfileClick={onOpenSettings}
        />
      </div>

      <div className="mx-auto max-w-5xl space-y-4 py-4">
        <DashboardTabs active={tab} onChange={setTab} />

        <StatusStrip
          jobId={job.id}
          productCount={job.products.length}
          lastSavedLabel={formatTimeAgo(job.updatedAt)}
          isOnline={isOnline}
          onOpenActiveJob={onOpenActiveJob}
        />

        {tab === "quick-actions" ? (
          <div className="px-4 pt-5 pb-4">
            {canUseAiAssistant() && onOpenAssistant && !isNativeApp() ? (
              <button
                type="button"
                onClick={onOpenAssistant}
                className="mb-4 flex w-full items-center gap-3 rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-50 to-indigo-50 px-4 py-3 text-left shadow-sm transition hover:border-violet-300"
              >
                <span className="flex size-10 items-center justify-center rounded-xl bg-violet-600 text-white">
                  <Bot className="size-5" />
                </span>
                <span>
                  <span className="block text-sm font-bold text-slate-900">AI Assistant</span>
                  <span className="block text-xs text-slate-600">
                    Create products, calculate and navigate by voice or text
                  </span>
                </span>
              </button>
            ) : null}
            <QuickActionGrid onAction={onAction} />
          </div>
        ) : (
          <div className="space-y-6 px-4 pb-6">
            <RecentJobs
              activeJobId={job.id}
              onContinue={onContinueJob}
              onAddWindow={() => onAction("new-window")}
              onAddDoor={() => onAction("new-door")}
            />
            <RecentDocuments
              onOpenDocuments={onOpenDocuments}
              onSelectJob={onContinueJob}
            />
          </div>
        )}

        <p className="px-4 pt-2 text-center text-xs font-medium text-slate-400">{APP_MADE_BY}</p>
      </div>
    </div>
  );
}
