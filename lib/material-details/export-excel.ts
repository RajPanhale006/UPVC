import type { MaterialDetailsJobResult } from "./types";

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export async function exportMaterialDetailsExcel(
  data: MaterialDetailsJobResult,
  filename?: string,
): Promise<void> {
  const XLSX = await import("xlsx");

  const summaryRows: (string | number)[][] = [
    ["Material Details Sheet"],
    ["Job ID", data.jobId],
    ["Customer", data.customerName],
    ["Project", data.projectName],
    ["Generated", new Date(data.generatedAt).toLocaleString()],
    ["Total area (sq.ft)", data.totalAreaSqft],
    ["Grand material total", data.grandMaterialTotal],
    ["Grand labour total", data.grandLabourTotal],
    ["Grand overhead total", data.grandOverheadTotal],
    ["Grand workshop total", data.grandWorkshopTotal],
    [],
    ["Product", "Category", "Item", "Specification", "Qty", "Unit", "Rate", "Amount", "Notes"],
  ];

  for (const product of data.products.filter((p) => p.isValid)) {
    for (const line of product.lines) {
      summaryRows.push([
        product.label,
        line.category,
        line.item,
        line.specification ?? "",
        line.quantity,
        line.unit,
        round2(line.rate),
        round2(line.amount),
        line.note ?? "",
      ]);
    }
    summaryRows.push([
      product.label,
      "TOTAL",
      "Workshop total",
      "",
      product.quantity,
      "windows",
      "",
      round2(product.workshopTotal),
      "",
    ]);
    summaryRows.push([]);
  }

  const workbook = XLSX.utils.book_new();
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Material Details");

  for (const product of data.products.filter((p) => p.isValid)) {
    const sheetName = product.label.slice(0, 28).replace(/[\\/?*[\]]/g, "-") || "Product";
    const rows: (string | number)[][] = [
      [product.label],
      ["Qty", product.quantity],
      ["Size mm", `${Math.round(product.widthMm)} × ${Math.round(product.heightMm)}`],
      ["Area sq.ft", product.areaSqft],
      ["Track", product.trackLabel ?? ""],
      [],
      ["Category", "Item", "Specification", "Qty", "Unit", "Rate", "Amount", "Notes"],
      ...product.lines.map((line) => [
        line.category,
        line.item,
        line.specification ?? "",
        line.quantity,
        line.unit,
        round2(line.rate),
        round2(line.amount),
        line.note ?? "",
      ]),
    ];

    if (product.profileRows.length > 0) {
      rows.push([]);
      rows.push(["Profile", "Code", "Run ft", "Weight kg", "Rate/kg", "Cost"]);
      for (const row of product.profileRows) {
        rows.push([
          row.profileName,
          row.profileCode,
          round2(row.costingRunFt),
          row.totalWeight ?? "",
          row.ratePerKg ?? "",
          round2(row.totalCost),
        ]);
      }
    }

    rows.push([]);
    rows.push(["Material total", product.materialTotal]);
    rows.push(["Labour total", product.labourTotal]);
    rows.push(["Overhead total", product.overheadTotal]);
    rows.push(["Workshop total", product.workshopTotal]);

    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), sheetName);
  }

  XLSX.writeFile(workbook, filename ?? `material-details-${data.jobId}.xlsx`);
}
