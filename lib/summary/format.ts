export function formatMmWhole(value: number): string {
  return `${Math.round(value)} mm`;
}

export function formatMmPair(width: number, height: number): string {
  return `${Math.round(width)} × ${Math.round(height)} mm`;
}

export function formatSqft(value: number): string {
  return `${value.toFixed(2)} sq.ft`;
}

export function formatNotApplicable(): string {
  return "Not Applicable";
}

export function formatRunFt(value: number): string {
  return `${value.toFixed(2)} ft`;
}

export function formatWeightKg(value: number): string {
  return `${value.toFixed(2)} kg`;
}

export function formatWeightPerFt(value: number): string {
  return `${value.toFixed(3)} kg/ft`;
}
