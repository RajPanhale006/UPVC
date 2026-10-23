import type { ModuleMenuId } from "@/lib/module-menu";

export type ModuleSectionConfig = {
  id: string;
  title: string;
  description?: string;
};

export type ModuleSectionScreenProps = {
  menuId: ModuleMenuId;
  sectionId?: string;
  jobId?: string;
  onBackToMenu: () => void;
  onBackToHome: () => void;
  children: React.ReactNode;
};
