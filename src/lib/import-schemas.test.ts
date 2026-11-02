import { describe, expect, it } from "vitest";
import { validateRecords } from "./import-schemas";

const rec = (rowNo: number, values: Record<string, string>) => ({ rowNo, values });
const buyer = (o: Record<string, string>) => ({
  code: "", name: "", country: "", region: "", address: "", currency: "", paymentTerms: "",
  shipmentTerms: "", category: "", ...o,
});

describe("BUYERS validation", () => {
  it("accepts a good row, flags missing name, bad currency and in-file duplicate", () => {
    const rows = validateRecords("BUYERS", [
      rec(2, buyer({ code: "HM", name: "H&M", currency: "usd" })),
      rec(3, buyer({ code: "ZR" })),
      rec(4, buyer({ code: "NK", name: "Nike", currency: "US" })),
      rec(5, buyer({ code: "hm", name: "H&M again" })),
    ]);
    expect(rows.map((r) => r.status)).toEqual(["OK", "ERROR", "ERROR", "ERROR"]);
    expect(rows[1].errors[0].startsWith("name")).toBe(true);
    expect(rows[2].errors[0].startsWith("currency")).toBe(true);
    expect(rows[3].errors).toContain("Duplicate of row 2 in this file");
  });
});

describe("OPENING_STOCK validation", () => {
  const row = (o: Record<string, string>) => ({
    materialCode: "FAB1", factoryCode: "F1", warehouseCode: "W1", lotNo: "", quantity: "100", remarks: "", ...o,
  });
  it("needs positive quantity and rejects same material/warehouse/lot twice", () => {
    const rows = validateRecords("OPENING_STOCK", [
      rec(2, row({})),
      rec(3, row({ quantity: "0" })),
      rec(4, row({ quantity: "1,500.5", lotNo: "L1" })),
      rec(5, row({})),
    ]);
    expect(rows.map((r) => r.status)).toEqual(["OK", "ERROR", "OK", "ERROR"]);
    expect(rows[3].errors).toContain("Duplicate of row 2 in this file");
  });
});

describe("ORDERS validation", () => {
  const o = (rowNo: number, v: Record<string, string>) =>
    rec(rowNo, {
      buyerCode: "HM", buyerPoNo: "PO1", styleNo: "POLO-1", colorCode: "BLK", sizeLabel: "M", quantity: "100",
      unitPrice: "5", currency: "", orderDate: "", shipDate: "", seasonCode: "", ...v,
    });
  it("same order, many cells is fine", () => {
    const rows = validateRecords("ORDERS", [o(2, {}), o(3, { sizeLabel: "L" }), o(4, { colorCode: "WHT" })]);
    expect(rows.every((r) => r.status === "OK")).toBe(true);
  });
  it("flags duplicate cell and price mismatch on the later row", () => {
    const rows = validateRecords("ORDERS", [o(2, {}), o(3, {}), o(4, { sizeLabel: "L", unitPrice: "6" })]);
    expect(rows.map((r) => r.status)).toEqual(["OK", "ERROR", "ERROR"]);
    expect(rows[1].errors[0]).toContain("Duplicate color/size");
    expect(rows[2].errors[0]).toContain("Unit price");
  });
  it("rejects bad quantity", () => {
    const rows = validateRecords("ORDERS", [o(2, { quantity: "abc" })]);
    expect(rows[0].status).toBe("ERROR");
  });
});

describe("SUPPLIERS validation", () => {
  it("category is case-insensitive but must be known", () => {
    const base = { code: "S1", name: "Sup", country: "", address: "", currency: "", leadTimeDays: "", paymentTerms: "" };
    const rows = validateRecords("SUPPLIERS", [
      rec(2, { ...base, category: "fabric" }),
      rec(3, { ...base, code: "S2", category: "magic" }),
    ]);
    expect(rows.map((r) => r.status)).toEqual(["OK", "ERROR"]);
  });
});

describe("OPEN_POS validation", () => {
  const p = (rowNo: number, v: Record<string, string>) =>
    rec(rowNo, {
      poNo: "PO-1", supplierCode: "S1", currency: "", deliveryDate: "", materialCode: "FAB1",
      quantity: "100", receivedQty: "", rate: "2", ...v,
    });
  it("many materials in one PO is fine, blank received means 0", () => {
    const rows = validateRecords("OPEN_POS", [p(2, {}), p(3, { materialCode: "FAB2" })]);
    expect(rows.every((r) => r.status === "OK")).toBe(true);
  });
  it("flags duplicate material, supplier mismatch and received over ordered", () => {
    const rows = validateRecords("OPEN_POS", [
      p(2, {}),
      p(3, {}),
      p(4, { materialCode: "FAB2", supplierCode: "S2" }),
      p(5, { materialCode: "FAB3", receivedQty: "150" }),
    ]);
    expect(rows.map((r) => r.status)).toEqual(["OK", "ERROR", "ERROR", "ERROR"]);
    expect(rows[1].errors[0]).toContain("Duplicate material");
    expect(rows[2].errors[0]).toContain("Supplier");
    expect(rows[3].errors[0]).toContain("Received qty");
  });
});