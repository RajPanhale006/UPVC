"use client";

import { getCurrentUserRole } from "@/lib/jobs/permissions";

import {
  getHomeModulesForRole,
  type DashboardActionId,
} from "./dashboard-config";
import { QuickActionCard } from "./quick-action-card";

type QuickActionGridProps = {
  onAction: (id: DashboardActionId) => void;
};

export function QuickActionGrid({ onAction }: QuickActionGridProps) {
  const modules = getHomeModulesForRole(getCurrentUserRole());
  const primaryModules = modules.filter((m) => m.priority === "primary");
  const grid = modules.filter((m) => m.priority === "grid");
  const footer = modules.find((m) => m.priority === "footer");

  return (
    <div className="space-y-6">
      {primaryModules.length > 0 ? (
        <div className="space-y-4">
          {primaryModules.map((primary) => (
            <QuickActionCard
              key={primary.id}
              title={primary.title}
              helper={primary.helper}
              icon={primary.icon}
              iconColor={primary.iconColor}
              iconRing={primary.iconRing}
              cardBg={primary.cardBg}
              cardBorder={primary.cardBorder}
              priority="primary"
              recommended={primary.recommended}
              spanFull
              onClick={() => onAction(primary.id)}
            />
          ))}
        </div>
      ) : null}

      {grid.length > 0 ? (
        <div className="grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
          {grid.map((action) => (
            <QuickActionCard
              key={action.id}
              title={action.title}
              helper={action.helper}
              icon={action.icon}
              iconColor={action.iconColor}
              iconRing={action.iconRing}
              cardBg={action.cardBg}
              cardBorder={action.cardBorder}
              priority="default"
              onClick={() => onAction(action.id)}
            />
          ))}
        </div>
      ) : null}

      {footer ? (
        <QuickActionCard
          title={footer.title}
          helper={footer.helper}
          icon={footer.icon}
          iconColor={footer.iconColor}
          iconRing={footer.iconRing}
          cardBg={footer.cardBg}
          cardBorder={footer.cardBorder}
          priority="default"
          spanFull
          onClick={() => onAction(footer.id)}
        />
      ) : null}
    </div>
  );
}
