// Report export-er pure helper (CSV + Excel shared). DB/IO nai, tai test kora jay.

export type ExportColumn = { key: string; label: string; right?: boolean };
export type ExportRow = Record<string, unknown>;
export type ExportCell = string | number | null;
export type ExportFormat = "csv" | "xlsx";

// Excel-e UTF-8 CSV thikmoto khulte BOM lage (route handler response-e jog hobe)
export const CSV_BOM = "\uFEFF";

// Ekta cell-er export value. Number number-i thake (Excel-e sum kora jay).
export function toExportValue(v: unknown): ExportCell {
  if (v === null || v === undefined || v === "") return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v.toISOString().slice(0, 10);
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

// Header + data rows, column order onujayi. CSV ar Excel dutor-i source eta.
export function toTable(columns: ExportColumn[], rows: ExportRow[]): ExportCell[][] {
  const header: ExportCell[] = columns.map((c) => c.label);
  const body = rows.map((row) => columns.map((c) => toExportValue(row[c.key])));
  return [header, ...body];
}

// Spreadsheet formula injection ঠেকাতে (=, +, @ diye shuru text)
function guardFormula(s: string): string {
  return /^[=+@\t\r]/.test(s) || /^-[^0-9.]/.test(s) ? `'${s}` : s;
}

export function csvField(c: ExportCell): string {
  if (c === null) return "";
  if (typeof c === "number") return String(c);
  const s = guardFormula(c);
  return /[",\r\n]/.test(s) || s !== s.trim() ? `"${s.replace(/"/g, '""')}"` : s;
}

// BOM chhara CSV text (CRLF line ending)
export function toCsv(columns: ExportColumn[], rows: ExportRow[]): string {
  return toTable(columns, rows)
    .map((line) => line.map(csvField).join(","))
    .join("\r\n");
}

export function parseExportFormat(s: string | null | undefined): ExportFormat | null {
  return s === "csv" || s === "xlsx" ? s : null;
}

// e.g. buyer-orders-20261025.xlsx (tarikh UTC)
export function exportFileName(reportKey: string, format: ExportFormat, now: Date = new Date()): string {
  const key = reportKey.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "") || "report";
  const ymd = now.toISOString().slice(0, 10).replace(/-/g, "");
  return `${key}-${ymd}.${format}`;
}