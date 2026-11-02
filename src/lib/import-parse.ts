// Import-er pure parse helper (DB/IO nai). Excel cell string-e convert hoye ekhane ashbe.
import { createHash } from "node:crypto";

export type ImportColumn = { key: string; label: string; required?: boolean };
export type ImportRecord = { rowNo: number; values: Record<string, string> };

export function sha256Hex(data: Uint8Array | string): string {
  return createHash("sha256").update(data).digest("hex");
}

// Quote, escaped quote, CRLF, BOM sob handle kore. Blank row-o rakhe (row number thikmoto thakar jonno).
export function parseCsv(text: string): string[][] {
  const s = text.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQ = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inQ) {
      if (ch === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i++;
        } else inQ = false;
      } else field += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && s[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

export const normHeader = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

// table[0] = header. Header key ba label, je kono ekta match korle hobe.
export function tableToRecords(table: string[][], columns: ImportColumn[]) {
  const header = (table[0] ?? []).map(normHeader);
  const colIndex = new Map<string, number>();
  const missingColumns: string[] = [];
  for (const c of columns) {
    const idx = header.findIndex((h) => h === normHeader(c.key) || h === normHeader(c.label));
    if (idx >= 0) colIndex.set(c.key, idx);
    else if (c.required) missingColumns.push(c.label);
  }
  const known = new Set(columns.flatMap((c) => [normHeader(c.key), normHeader(c.label)]));
  const unknownColumns = (table[0] ?? []).filter((h, i) => h.trim() !== "" && !known.has(header[i]));

  const records: ImportRecord[] = [];
  for (let r = 1; r < table.length; r++) {
    const line = table[r];
    if (!line.some((c) => c.trim() !== "")) continue;
    const values: Record<string, string> = {};
    for (const c of columns) {
      const idx = colIndex.get(c.key);
      values[c.key] = idx === undefined ? "" : (line[idx] ?? "").trim();
    }
    records.push({ rowNo: r + 1, values }); // rowNo = sheet row (header = 1)
  }
  return { records, missingColumns, unknownColumns };
}

// "BLK:Black;WHT:White" -> [{code, name}]
export function parseColors(s: string): { code: string; name: string }[] {
  return s
    .split(/[;|]/)
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => {
      const [code, ...rest] = x.split(":");
      const c = code.trim();
      return { code: c, name: rest.join(":").trim() || c };
    });
}

// "S;M;L" -> ["S","M","L"]
export function parseSizes(s: string): string[] {
  return [...new Set(s.split(/[;|,]/).map((x) => x.trim()).filter(Boolean))];
}