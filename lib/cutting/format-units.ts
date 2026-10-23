import { MM_PER_FOOT, MM_PER_INCH } from "@/lib/units/conversion";

export function mmToInches(mm: number): number {
  return mm / MM_PER_INCH;
}

export function mmToFeet(mm: number): number {
  return mm / MM_PER_FOOT;
}

export function formatInches(mm: number): string {
  return `${mmToInches(mm).toFixed(2)}"`;
}

export function formatFtInches(mm: number): string {
  const totalInches = mmToInches(mm);
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches - feet * 12;
  return `${feet}' ${inches.toFixed(2)}"`;
}

export function formatMmInches(mm: number): string {
  return `${Math.round(mm)} mm (${formatInches(mm)})`;
}

export function formatCrossSectionMm(wMm: number, hMm: number): string {
  return `${Math.round(wMm)} × ${Math.round(hMm)} mm`;
}

export function lengthToRunningFt(lengthMm: number, qty: number): number {
  return Math.round(((lengthMm * qty) / MM_PER_FOOT) * 100) / 100;
}
