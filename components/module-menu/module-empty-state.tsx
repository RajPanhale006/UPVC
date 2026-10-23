"use client";

import { ShieldOff } from "lucide-react";

export function ModuleEmptyState() {
  return (
    <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
      <ShieldOff className="mx-auto size-10 text-slate-400" aria-hidden />
      <h3 className="mt-3 text-base font-bold text-slate-900">No actions available</h3>
      <p className="mt-1 text-sm text-slate-600">
        Your role does not have access to items in this menu.
      </p>
    </section>
  );
}
