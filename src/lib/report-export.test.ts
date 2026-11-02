import { describe, expect, it } from "vitest";
import {
  csvField,
  exportFileName,
  parseExportFormat,
  toCsv,
  toExportValue,
  toTable,
} from "./report-export";

describe("toExportValue", () => {
  it("empty values become null", () => {
    expect(toExportValue(null)).toBeNull();
    expect(toExportValue(undefined)).toBeNull();
    expect(toExportValue("")).toBeNull();
  });
  it("keeps numbers as numbers, drops NaN/Infinity", () => {
    expect(toExportValue(12.5)).toBe(12.5);
    expect(toExportValue(0)).toBe(0);
    expect(toExportValue(NaN)).toBeNull();
    expect(toExportValue(Infinity)).toBeNull();
  });
  it("formats date, boolean and object", () => {
    expect(toExportValue(new Date("2026-10-25T10:00:00Z"))).toBe("2026-10-25");
    expect(toExportValue(true)).toBe("Yes");
    expect(toExportValue(false)).toBe("No");
    expect(toExportValue({ a: 1 })).toBe('{"a":1}');
  });
});

describe("toTable", () => {
  const columns = [
    { key: "name", label: "Name" },
    { key: "qty", label: "Qty", right: true },
  ];
  it("header first, column order kept, missing key is null", () => {
    const t = toTable(columns, [{ qty: 5, name: "A" }, { name: "B" }]);
    expect(t).toEqual([["Name", "Qty"], ["A", 5], ["B", null]]);
  });
});

describe("csv", () => {
  it("escapes comma, quote and newline", () => {
    expect(csvField("a,b")).toBe('"a,b"');
    expect(csvField('say "hi"')).toBe('"say ""hi"""');
    expect(csvField("l1\nl2")).toBe('"l1\nl2"');
    expect(csvField("plain")).toBe("plain");
    expect(csvField(null)).toBe("");
    expect(csvField(3.5)).toBe("3.5");
  });
  it("guards formula injection but not negative-number text", () => {
    expect(csvField("=SUM(A1)")).toBe("'=SUM(A1)");
    expect(csvField("@cmd")).toBe("'@cmd");
    expect(csvField("-cmd")).toBe("'-cmd");
    expect(csvField("-5")).toBe("-5");
  });
  it("builds CRLF separated csv", () => {
    const csv = toCsv(
      [{ key: "a", label: "A" }, { key: "b", label: "B" }],
      [{ a: "x,y", b: 2 }, { a: "z", b: null }]
    );
    expect(csv).toBe('A,B\r\n"x,y",2\r\nz,');
  });
});

describe("export meta", () => {
  it("parses format", () => {
    expect(parseExportFormat("csv")).toBe("csv");
    expect(parseExportFormat("xlsx")).toBe("xlsx");
    expect(parseExportFormat("pdf")).toBeNull();
    expect(parseExportFormat(undefined)).toBeNull();
  });
  it("builds a safe file name", () => {
    const now = new Date("2026-10-25T10:00:00Z");
    expect(exportFileName("buyer-orders", "xlsx", now)).toBe("buyer-orders-20261025.xlsx");
    expect(exportFileName("../Bad Key!", "csv", now)).toBe("bad-key-20261025.csv");
    expect(exportFileName("!!!", "csv", now)).toBe("report-20261025.csv");
  });
});