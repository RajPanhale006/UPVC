"use client";

import { getCurrentUserRole } from "@/lib/jobs/permissions";
import {
  filterModuleActions,
  isActionRecommendedForRole,
  type ModuleMenuAction,
} from "@/lib/module-menu";

import { ModuleActionCard } from "./module-action-card";
import { ModuleEmptyState } from "./module-empty-state";

type ModuleActionGridProps = {
  menuId: import("@/lib/module-menu").ModuleMenuId;
  actions: ModuleMenuAction[];
  onAction: (action: ModuleMenuAction) => void;
};

export function ModuleActionGrid({ menuId, actions, onAction }: ModuleActionGridProps) {
  const role = getCurrentUserRole();
  const visible = filterModuleActions(actions, role);

  if (visible.length === 0) {
    return <ModuleEmptyState />;
  }

  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-8 min-[360px]:grid-cols-2 md:grid-cols-3 md:gap-y-9 lg:grid-cols-4">
      {visible.map((action) => (
        <ModuleActionCard
          key={action.id}
          title={action.title}
          helper={action.helper}
          icon={action.icon}
          iconColor={action.iconColor}
          iconRing={action.iconRing}
          cardBg={action.cardBg}
          cardBorder={action.cardBorder}
          recommended={
            action.recommended ?? isActionRecommendedForRole(action.id, menuId, role)
          }
          recommendedLabel={action.recommendedLabel}
          spanFull={action.spanFull}
          onClick={() => onAction(action)}
        />
      ))}
    </div>
  );
}
