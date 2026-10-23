"use client";

import type { ReactNode } from "react";

import type { ModuleMenuId } from "@/lib/module-menu";

import { ModuleSectionScreen } from "./module-section-screen";

type ModuleSectionRendererProps = {
  returnMenu: ModuleMenuId | null;
  moduleSection?: string;
  jobId?: string;
  onBackToMenu: () => void;
  onBackToHome: () => void;
  children: ReactNode;
};

export function ModuleSectionRenderer({
  returnMenu,
  moduleSection,
  jobId,
  onBackToMenu,
  onBackToHome,
  children,
}: ModuleSectionRendererProps) {
  if (!returnMenu) {
    return <>{children}</>;
  }

  return (
    <ModuleSectionScreen
      menuId={returnMenu}
      sectionId={moduleSection}
      jobId={jobId}
      onBackToMenu={onBackToMenu}
      onBackToHome={onBackToHome}
    >
      {children}
    </ModuleSectionScreen>
  );
}
