import ExcelJS from "exceljs";
import { toTable, type ExportColumn, type ExportRow } from "./report-export";

// Excel sheet name: max 31 char, [ ] : * ? / \ nishiddho
function sheetName(title: string): string {
  const s = title.replace(/[\[\]:*?/\\]/g, " ").trim().slice(0, 31);
  return s || "Report";
}

export async function buildXlsx(opts: {
  title: string;
  columns: ExportColumn[];
  rows: ExportRow[];
  summary?: string;
}): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "MERCHFLOW";
  wb.created = new Date();
  const ws = wb.addWorksheet(sheetName(opts.title));

  let headerRowNo = 1;
  if (opts.summary) {
    ws.addRow([opts.summary]).font = { bold: true };
    ws.addRow([]);
    headerRowNo = 3;
  }

  const [header, ...body] = toTable(opts.columns, opts.rows);
  const hr = ws.addRow(header);
  hr.font = { bold: true };
  hr.eachCell((c) => {
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8EEF7" } };
    c.border = { bottom: { style: "thin" } };
  });

  for (const line of body) {
    const row = ws.addRow(line);
    row.eachCell({ includeEmpty: true }, (cell, colNo) => {
      const v = cell.value;
      if (typeof v === "number") cell.numFmt = Number.isInteger(v) ? "#,##0" : "#,##0.00";
      if (opts.columns[colNo - 1]?.right) cell.alignment = { horizontal: "right" };
    });
  }

  opts.columns.forEach((c, i) => {
    const longest = Math.max(
      c.label.length,
      ...body.map((l) => String(l[i] ?? "").length)
    );
    ws.getColumn(i + 1).width = Math.min(Math.max(longest + 2, 10), 50);
  });
  ws.views = [{ state: "frozen", ySplit: headerRowNo }];

  const buf = await wb.xlsx.writeBuffer();
  return new Uint8Array(buf as ArrayBuffer);
}