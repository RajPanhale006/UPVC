"use client";

import type { ModuleMenuId } from "@/lib/module-menu";

import { ModuleSectionHeader } from "./module-section-header";

type ModuleSectionScreenProps = {
  menuId: ModuleMenuId;
  sectionId?: string;
  jobId?: string;
  onBackToMenu: () => void;
  onBackToHome: () => void;
  children: React.ReactNode;
};

export function ModuleSectionScreen({
  menuId,
  sectionId,
  jobId,
  onBackToMenu,
  onBackToHome,
  children,
}: ModuleSectionScreenProps) {
  return (
    <div className="flex min-h-full flex-col bg-[#f4f7fc]">
      <ModuleSectionHeader
        menuId={menuId}
        sectionId={sectionId}
        jobId={jobId}
        onBackToMenu={onBackToMenu}
        onBackToHome={onBackToHome}
      />
      <div className="min-h-0 flex-1 pb-[calc(6.5rem+env(safe-area-inset-bottom))]">
        {children}
      </div>
    </div>
  );
}
