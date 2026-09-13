// src/lib/utils/export.ts
import * as XLSX from "xlsx";

export function exportToExcel(
  data: any[],
  filename: string,
  sheetName: string = "Sheet1",
) {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Auto-size columns
  const maxWidth = 30;
  const colWidths = Object.keys(data[0] || {}).map((key) => ({
    wch: Math.min(
      Math.max(
        key.length,
        ...data.map((row) => String(row[key] || "").length),
      ) + 2,
      maxWidth,
    ),
  }));
  worksheet["!cols"] = colWidths;

  XLSX.writeFile(
    workbook,
    `${filename}_${new Date().toISOString().split("T")[0]}.xlsx`,
  );
}

export function exportToCSV(data: any[], filename: string) {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(","),
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          // Escape quotes and wrap in quotes if contains comma
          if (
            typeof value === "string" &&
            (value.includes(",") || value.includes('"'))
          ) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value ?? "";
        })
        .join(","),
    ),
  ].join("\n");

  const blob = new Blob(["\ufeff" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}_${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

export function exportMultiSheet(
  sheets: { name: string; data: any[] }[],
  filename: string,
) {
  const workbook = XLSX.utils.book_new();

  sheets.forEach((sheet) => {
    if (sheet.data.length > 0) {
      const worksheet = XLSX.utils.json_to_sheet(sheet.data);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
    }
  });

  XLSX.writeFile(
    workbook,
    `${filename}_${new Date().toISOString().split("T")[0]}.xlsx`,
  );
}
