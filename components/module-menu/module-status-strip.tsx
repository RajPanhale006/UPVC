"use client";

import { StatusStrip } from "@/components/dashboard/status-strip";

type ModuleStatusStripProps = {
  jobId: string;
  productCount: number;
  lastSavedLabel: string;
  isOnline: boolean;
  onOpenActiveJob?: () => void;
};

export function ModuleStatusStrip(props: ModuleStatusStripProps) {
  return <StatusStrip {...props} />;
}
