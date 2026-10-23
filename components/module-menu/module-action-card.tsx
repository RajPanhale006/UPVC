"use client";

import type { LucideIcon } from "lucide-react";

import { QuickActionCard } from "@/components/dashboard/quick-action-card";

type ModuleActionCardProps = {
  title: string;
  helper: string;
  icon: LucideIcon;
  iconColor: string;
  iconRing: string;
  cardBg: string;
  cardBorder: string;
  recommended?: boolean;
  recommendedLabel?: string;
  spanFull?: boolean;
  onClick: () => void;
};

export function ModuleActionCard(props: ModuleActionCardProps) {
  return (
    <QuickActionCard
      title={props.title}
      helper={props.helper}
      icon={props.icon}
      iconColor={props.iconColor}
      iconRing={props.iconRing}
      cardBg={props.cardBg}
      cardBorder={props.cardBorder}
      recommended={props.recommended}
      recommendedLabel={props.recommendedLabel}
      spanFull={props.spanFull}
      onClick={props.onClick}
    />
  );
}
