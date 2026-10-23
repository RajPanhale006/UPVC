"use client";

import type { WorkshopJob } from "@/lib/jobs";
import { getCurrentUserRole } from "@/lib/jobs/permissions";
import {
  canAccessModuleMenu,
  getModuleMenu,
  type ModuleMenuAction,
  type ModuleMenuId,
} from "@/lib/module-menu";

import { formatTimeAgo, useOnlineStatus } from "@/components/dashboard/dashboard-utils";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";

import { ModuleActionGrid } from "./module-action-grid";
import { ModuleMenuHeader } from "./module-menu-header";
import { ModuleStatusStrip } from "./module-status-strip";

type ModuleMenuScreenProps = {
  menuId: ModuleMenuId;
  job: WorkshopJob;
  onBack: () => void;
  onAction: (action: ModuleMenuAction) => void;
  onOpenActiveJob: () => void;
  onOpenSettings: () => void;
};

export function ModuleMenuScreen({
  menuId,
  job,
  onBack,
  onAction,
  onOpenActiveJob,
  onOpenSettings,
}: ModuleMenuScreenProps) {
  const isOnline = useOnlineStatus();
  const menu = getModuleMenu(menuId);

  if (!canAccessModuleMenu(menuId, getCurrentUserRole())) {
    return (
      <div className="page-enter min-h-full bg-[#f4f7fc] pb-[calc(6.5rem+env(safe-area-inset-bottom))] md:pb-8">
        <ModuleMenuHeader title={menu.title} subtitle={menu.subtitle} onBack={onBack} />
        <div className="px-4 pt-4">
          <ModuleEmptyStateFallback onBack={onBack} />
        </div>
      </div>
    );
  }

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
        <ModuleMenuHeader title={menu.title} subtitle={menu.subtitle} onBack={onBack} />

        <ModuleStatusStrip
          jobId={job.id}
          productCount={job.products.length}
          lastSavedLabel={formatTimeAgo(job.updatedAt)}
          isOnline={isOnline}
          onOpenActiveJob={onOpenActiveJob}
        />

        <div className="px-4 pt-5 pb-4">
          <ModuleActionGrid menuId={menuId} actions={menu.actions} onAction={onAction} />
        </div>
      </div>
    </div>
  );
}

function ModuleEmptyStateFallback({ onBack }: { onBack: () => void }) {
  return (
    <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
      <h3 className="text-base font-bold text-slate-900">Access restricted</h3>
      <p className="mt-1 text-sm text-slate-600">This module is not available for your role.</p>
      <button
        type="button"
        onClick={onBack}
        className="mt-4 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white"
      >
        Back to Home
      </button>
    </section>
  );
}
