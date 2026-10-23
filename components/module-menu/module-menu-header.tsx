"use client";

import { ArrowLeft } from "lucide-react";

type ModuleMenuHeaderProps = {
  title: string;
  subtitle: string;
  onBack: () => void;
};

export function ModuleMenuHeader({ title, subtitle, onBack }: ModuleMenuHeaderProps) {
  return (
    <header className="px-4 pt-2">
      <button
        type="button"
        onClick={onBack}
        aria-label="Back to Home dashboard"
        className="mb-3 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Home
      </button>
      <h1 className="text-xl font-bold text-slate-900">{title}</h1>
      <p className="mt-0.5 text-sm text-slate-600">{subtitle}</p>
    </header>
  );
}
