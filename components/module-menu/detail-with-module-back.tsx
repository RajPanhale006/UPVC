"use client";

import type { ReactNode } from "react";

import { ModuleBackBar } from "./module-back-bar";
import type { ModuleMenuId } from "@/lib/module-menu";

type DetailWithModuleBackProps = {
  returnMenu: ModuleMenuId | null;
  onBackToMenu: () => void;
  onBackToHome: () => void;
  children: ReactNode;
};

export function DetailWithModuleBack({
  returnMenu,
  onBackToMenu,
  onBackToHome,
  children,
}: DetailWithModuleBackProps) {
  if (!returnMenu) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-full flex-col">
      <ModuleBackBar
        returnMenu={returnMenu}
        onBackToMenu={onBackToMenu}
        onBackToHome={onBackToHome}
      />
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}
