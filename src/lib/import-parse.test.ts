import { describe, expect, it } from "vitest";
import { parseColors, parseCsv, parseSizes, sha256Hex, tableToRecords } from "./import-parse";

describe("parseCsv", () => {
  it("handles quotes, escaped quotes, CRLF and BOM", () => {
    const t = parseCsv('\uFEFFa,b\r\n"x,y","say ""hi"""\r\nz,');
    expect(t).toEqual([["a", "b"], ["x,y", 'say "hi"'], ["z", ""]]);
  });
  it("handles newline inside quotes", () => {
    expect(parseCsv('a\n"l1\nl2"')).toEqual([["a"], ["l1\nl2"]]);
  });
});

describe("tableToRecords", () => {
  const cols = [
    { key: "code", label: "Code", required: true },
    { key: "name", label: "Name", required: true },
  ];
  it("maps headers loosely, skips blank rows, keeps sheet row numbers", () => {
    const r = tableToRecords([["CODE ", "name"], ["B1", "Nike"], ["", ""], ["B2", "Adidas"]], cols);
    expect(r.missingColumns).toEqual([]);
    expect(r.records).toEqual([
      { rowNo: 2, values: { code: "B1", name: "Nike" } },
      { rowNo: 4, values: { code: "B2", name: "Adidas" } },
    ]);
  });
  it("reports missing and unknown columns", () => {
    const r = tableToRecords([["Code", "Extra"], ["B1", "x"]], cols);
    expect(r.missingColumns).toEqual(["Name"]);
    expect(r.unknownColumns).toEqual(["Extra"]);
  });
});

describe("helpers", () => {
  it("sha256 matches known value", () => {
    expect(sha256Hex("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
  it("parses colors and sizes", () => {
    expect(parseColors("BLK:Black; WHT")).toEqual([{ code: "BLK", name: "Black" }, { code: "WHT", name: "WHT" }]);
    expect(parseSizes("S; M;L;M")).toEqual(["S", "M", "L"]);
  });
});