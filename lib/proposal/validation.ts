import type { PaymentScheduleItem } from "./types";

export function calculatePaymentScheduleTotal(
  items: PaymentScheduleItem[],
  grandTotal: number,
): number {
  return items.reduce((sum, item) => {
    if (item.kind === "percent") {
      return sum + (grandTotal * item.value) / 100;
    }
    return sum + item.value;
  }, 0);
}

export function validatePaymentSchedule(
  items: PaymentScheduleItem[],
  grandTotal: number,
): { valid: boolean; total: number; difference: number } {
  const total = Math.round(calculatePaymentScheduleTotal(items, grandTotal) * 100) / 100;
  const difference = Math.round((total - grandTotal) * 100) / 100;
  return {
    valid: Math.abs(difference) < 0.05,
    total,
    difference,
  };
}

export function getPaymentPercentTotal(items: PaymentScheduleItem[]): number {
  return items
    .filter((item) => item.kind === "percent")
    .reduce((sum, item) => sum + item.value, 0);
}
