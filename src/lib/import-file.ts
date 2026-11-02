import ExcelJS from "exceljs";
import { BusinessRuleError } from "./business-rules";
import { parseCsv } from "./import-parse";

export const MAX_IMPORT_ROWS = 5000;
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

function cellStr(v: ExcelJS.CellValue): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object") {
    if ("result" in v) return cellStr((v as { result?: ExcelJS.CellValue }).result ?? null);
    if ("richText" in v) return (v as { richText: { text: string }[] }).richText.map((t) => t.text).join("");
    if ("text" in v) return String((v as { text: unknown }).text);
    return "";
  }
  return String(v);
}

// .xlsx (first sheet) ba .csv -> string table (row 0 = header)
export async function fileToTable(name: string, bytes: Uint8Array): Promise<string[][]> {
  const lower = name.toLowerCase();
  if (lower.endsWith(".csv")) return parseCsv(new TextDecoder().decode(bytes));
  if (!lower.endsWith(".xlsx")) throw new BusinessRuleError("Upload an .xlsx or .csv file");
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(Buffer.from(bytes) as unknown as ExcelJS.Buffer);
  const ws = wb.worksheets[0];
  if (!ws) throw new BusinessRuleError("The workbook has no sheet");
  if (ws.rowCount > MAX_IMPORT_ROWS + 1) {
    throw new BusinessRuleError(`Too many rows (max ${MAX_IMPORT_ROWS})`);
  }
  const table: string[][] = [];
  for (let r = 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const line: string[] = [];
    for (let c = 1; c <= ws.columnCount; c++) line.push(cellStr(row.getCell(c).value).trim());
    table.push(line);
  }
  return table;
}