// Importer-er column list, Zod row schema, in-file duplicate ar order grouping. Pure.
import { z } from "zod";
import type { ImportColumn, ImportRecord } from "./import-parse";

export type ImportType = "BUYERS" | "SUPPLIERS" | "MATERIALS" | "STYLES" | "ORDERS" | "OPENING_STOCK" | "OPEN_POS";

const blank = (v: unknown) => (v === "" || v === null || v === undefined ? undefined : v);
const req = (max: number) => z.string().trim().min(1).max(max);
const optStr = (max: number) => z.preprocess(blank, z.string().trim().max(max).optional());
const upper = (v: unknown) => (typeof v === "string" ? v.trim().toUpperCase() : v);
const toNum = (v: unknown) => (typeof v === "string" ? Number(v.replace(/,/g, "")) : v);
const optDate = z.preprocess(blank, z.coerce.date().optional());
const currency = z.preprocess((v) => upper(blank(v)), z.string().length(3).optional());

const SUPPLIER_CATEGORIES = [
  "FABRIC", "YARN", "TRIMS", "ACCESSORIES", "PACKAGING", "WASHING", "PRINTING", "EMBROIDERY", "TRANSPORT",
] as const;

const c = (key: string, label: string, required = false): ImportColumn => ({ key, label, required });

export const buyerRow = z.object({
  code: req(20), name: req(150), country: optStr(80), region: optStr(80), address: optStr(300),
  currency, paymentTerms: optStr(150), shipmentTerms: optStr(150), category: optStr(80),
});

export const supplierRow = z.object({
  code: req(20), name: req(150),
  category: z.preprocess(upper, z.enum(SUPPLIER_CATEGORIES)),
  country: optStr(80), address: optStr(300), currency,
  leadTimeDays: z.preprocess((v) => toNum(blank(v)), z.number().int().nonnegative().optional()),
  paymentTerms: optStr(150),
});

export const materialRow = z.object({
  categoryCode: req(20), code: req(30), name: req(150), unit: z.preprocess(upper, z.string().min(1).max(10)),
  description: optStr(500),
  reorderPoint: z.preprocess((v) => toNum(blank(v)), z.number().nonnegative().optional()),
});

export const styleRow = z.object({
  styleNo: req(40), buyerCode: req(20), name: req(150), seasonCode: optStr(20), category: optStr(80),
  garmentType: optStr(80), gender: optStr(40), fabricType: optStr(100), composition: optStr(200),
  gsm: z.preprocess((v) => toNum(blank(v)), z.number().int().positive().optional()),
  colors: optStr(500), sizes: optStr(300),
});

export const orderRow = z.object({
  buyerCode: req(20), buyerPoNo: req(60), styleNo: req(40), colorCode: req(20), sizeLabel: req(20),
  quantity: z.preprocess(toNum, z.number().int().nonnegative()),
  unitPrice: z.preprocess(toNum, z.number().nonnegative()),
  currency, orderDate: optDate, shipDate: optDate, seasonCode: optStr(20),
});

export const openingStockRow = z.object({
  materialCode: req(30), factoryCode: req(20), warehouseCode: req(20), lotNo: optStr(60),
  quantity: z.preprocess(toNum, z.number().positive()),
  remarks: optStr(300),
});

export const openPoRow = z.object({
  poNo: req(40), supplierCode: req(20), currency, deliveryDate: optDate,
  materialCode: req(30),
  quantity: z.preprocess(toNum, z.number().positive()),
  receivedQty: z.preprocess((v) => toNum(blank(v)), z.number().nonnegative().default(0)),
  rate: z.preprocess(toNum, z.number().nonnegative()),
});

type PoParsed = z.infer<typeof openPoRow>;

export type GroupedPo = {
  key: string;
  poNo: string;
  supplierCode: string;
  currency?: string;
  deliveryDate?: Date;
  lines: { rowNo: number; materialCode: string; quantity: number; receivedQty: number; rate: number }[];
};

// PO = poNo. Line = materialCode. Conflict hole oi row-er error.
export function groupPoRows(rows: { rowNo: number; data: PoParsed }[]) {
  const pos = new Map<string, GroupedPo>();
  const errors: { rowNo: number; message: string }[] = [];
  for (const { rowNo, data: d } of rows) {
    const key = d.poNo.toLowerCase();
    let p = pos.get(key);
    if (!p) {
      p = { key, poNo: d.poNo, supplierCode: d.supplierCode, currency: d.currency, deliveryDate: d.deliveryDate, lines: [] };
      pos.set(key, p);
    } else if (d.supplierCode.toLowerCase() !== p.supplierCode.toLowerCase()) {
      errors.push({ rowNo, message: `Supplier ${d.supplierCode} differs from ${p.supplierCode} used earlier in this PO` });
      continue;
    } else if (d.currency && p.currency && d.currency !== p.currency) {
      errors.push({ rowNo, message: `Currency ${d.currency} differs from ${p.currency} used earlier in this PO` });
      continue;
    }
    const dup = p.lines.find((l) => l.materialCode.toLowerCase() === d.materialCode.toLowerCase());
    if (dup) {
      errors.push({ rowNo, message: `Duplicate material in this PO, already in row ${dup.rowNo}` });
      continue;
    }
    if (d.receivedQty > d.quantity) {
      errors.push({ rowNo, message: "Received qty cannot be more than ordered qty" });
      continue;
    }
    p.lines.push({ rowNo, materialCode: d.materialCode, quantity: d.quantity, receivedQty: d.receivedQty, rate: d.rate });
  }
  return { pos: [...pos.values()], errors };
}

export const IMPORTERS: Record<ImportType, { label: string; columns: ImportColumn[]; schema: z.ZodType }> = {
  BUYERS: {
    label: "Buyers", schema: buyerRow,
    columns: [c("code", "Code", true), c("name", "Name", true), c("country", "Country"), c("region", "Region"),
      c("address", "Address"), c("currency", "Currency"), c("paymentTerms", "Payment terms"),
      c("shipmentTerms", "Shipment terms"), c("category", "Category")],
  },
  SUPPLIERS: {
    label: "Suppliers", schema: supplierRow,
    columns: [c("code", "Code", true), c("name", "Name", true), c("category", "Category", true), c("country", "Country"),
      c("address", "Address"), c("currency", "Currency"), c("leadTimeDays", "Lead time days"),
      c("paymentTerms", "Payment terms")],
  },
  MATERIALS: {
    label: "Materials", schema: materialRow,
    columns: [c("categoryCode", "Category code", true), c("code", "Code", true), c("name", "Name", true),
      c("unit", "Unit", true), c("description", "Description"), c("reorderPoint", "Reorder point")],
  },
  STYLES: {
    label: "Styles", schema: styleRow,
    columns: [c("styleNo", "Style no", true), c("buyerCode", "Buyer code", true), c("name", "Name", true),
      c("seasonCode", "Season code"), c("category", "Category"), c("garmentType", "Garment type"),
      c("gender", "Gender"), c("fabricType", "Fabric type"), c("composition", "Composition"), c("gsm", "GSM"),
      c("colors", "Colors (CODE:Name;CODE:Name)"), c("sizes", "Sizes (S;M;L)")],
  },
  ORDERS: {
    label: "Orders (one row per color/size)", schema: orderRow,
    columns: [c("buyerCode", "Buyer code", true), c("buyerPoNo", "Buyer PO no", true), c("styleNo", "Style no", true),
      c("colorCode", "Color code", true), c("sizeLabel", "Size", true), c("quantity", "Quantity", true),
      c("unitPrice", "Unit price", true), c("currency", "Currency"), c("orderDate", "Order date"),
      c("shipDate", "Ship date"), c("seasonCode", "Season code")],
  },
  OPEN_POS: {
    label: "Open POs (one row per material)", schema: openPoRow,
    columns: [c("poNo", "PO no", true), c("supplierCode", "Supplier code", true), c("currency", "Currency"),
      c("deliveryDate", "Delivery date"), c("materialCode", "Material code", true), c("quantity", "Quantity", true),
      c("receivedQty", "Received qty"), c("rate", "Rate", true)],
  },
  OPENING_STOCK: {
    label: "Opening stock", schema: openingStockRow,
    columns: [c("materialCode", "Material code", true), c("factoryCode", "Factory code", true),
      c("warehouseCode", "Warehouse code", true), c("lotNo", "Lot no"), c("quantity", "Quantity", true),
      c("remarks", "Remarks")],
  },
};

// File-er bhitore natural key (Order-e ek order-e onek row, tai ekhane nai)
const NATURAL_KEY: Partial<Record<ImportType, (v: Record<string, string>) => string>> = {
  BUYERS: (v) => v.code.toLowerCase(),
  SUPPLIERS: (v) => v.code.toLowerCase(),
  MATERIALS: (v) => v.code.toLowerCase(),
  STYLES: (v) => v.styleNo.toLowerCase(),
  OPENING_STOCK: (v) =>
    [v.materialCode, v.factoryCode, v.warehouseCode, v.lotNo].map((x) => x.toLowerCase()).join("|"),
};

export type ValidatedRow = {
  rowNo: number;
  data: Record<string, string>; // raw, import-er somoy abar parse hobe
  status: "OK" | "ERROR";
  errors: string[];
};

type OrderParsed = z.infer<typeof orderRow>;

export type GroupedOrder = {
  key: string;
  buyerCode: string;
  buyerPoNo: string;
  currency?: string;
  orderDate?: Date;
  shipDate?: Date;
  seasonCode?: string;
  lines: {
    styleNo: string;
    unitPrice: number;
    cells: { colorCode: string; sizeLabel: string; quantity: number; rowNo: number }[];
  }[];
};

// Order = buyerCode + buyerPoNo. Line = styleNo. Conflict hole oi row-er error.
export function groupOrderRows(rows: { rowNo: number; data: OrderParsed }[]) {
  const orders = new Map<string, GroupedOrder>();
  const errors: { rowNo: number; message: string }[] = [];
  for (const { rowNo, data: d } of rows) {
    const key = `${d.buyerCode.toLowerCase()}|${d.buyerPoNo.toLowerCase()}`;
    let o = orders.get(key);
    if (!o) {
      o = { key, buyerCode: d.buyerCode, buyerPoNo: d.buyerPoNo, currency: d.currency, orderDate: d.orderDate,
        shipDate: d.shipDate, seasonCode: d.seasonCode, lines: [] };
      orders.set(key, o);
    } else if (d.currency && o.currency && d.currency !== o.currency) {
      errors.push({ rowNo, message: `Currency ${d.currency} differs from ${o.currency} used earlier in this order` });
      continue;
    }
    let line = o.lines.find((l) => l.styleNo.toLowerCase() === d.styleNo.toLowerCase());
    if (!line) {
      line = { styleNo: d.styleNo, unitPrice: d.unitPrice, cells: [] };
      o.lines.push(line);
    } else if (line.unitPrice !== d.unitPrice) {
      errors.push({ rowNo, message: `Unit price ${d.unitPrice} differs from ${line.unitPrice} for style ${d.styleNo}` });
      continue;
    }
    const dup = line.cells.find(
      (x) => x.colorCode.toLowerCase() === d.colorCode.toLowerCase() && x.sizeLabel.toLowerCase() === d.sizeLabel.toLowerCase()
    );
    if (dup) {
      errors.push({ rowNo, message: `Duplicate color/size, already in row ${dup.rowNo}` });
      continue;
    }
    line.cells.push({ colorCode: d.colorCode, sizeLabel: d.sizeLabel, quantity: d.quantity, rowNo });
  }
  return { orders: [...orders.values()], errors };
}

export function validateRecords(type: ImportType, records: ImportRecord[]): ValidatedRow[] {
  const { schema } = IMPORTERS[type];
  const keyFn = NATURAL_KEY[type];
  const seen = new Map<string, number>();
  const out: ValidatedRow[] = [];
  const okOrderRows: { rowNo: number; data: OrderParsed }[] = [];

  for (const r of records) {
    const res = schema.safeParse(r.values);
    const errors = res.success
      ? []
      : res.error.issues.map((i) => `${i.path.join(".") || "row"}: ${i.message}`);
    if (res.success && keyFn) {
      const k = keyFn(r.values);
      const first = seen.get(k);
      if (first !== undefined) errors.push(`Duplicate of row ${first} in this file`);
      else seen.set(k, r.rowNo);
    }
    if (res.success && errors.length === 0 && type === "ORDERS") {
      okOrderRows.push({ rowNo: r.rowNo, data: res.data as OrderParsed });
    }
    out.push({ rowNo: r.rowNo, data: r.values, status: errors.length ? "ERROR" : "OK", errors });
  }

  if (type === "ORDERS") {
    for (const e of groupOrderRows(okOrderRows).errors) {
      const row = out.find((x) => x.rowNo === e.rowNo);
      if (row) {
        row.status = "ERROR";
        row.errors.push(e.message);
      }
    }
  }
    if (type === "OPEN_POS") {
    const okPo = out
      .filter((x) => x.status === "OK")
      .map((x) => ({ rowNo: x.rowNo, data: openPoRow.parse(x.data) }));
    for (const e of groupPoRows(okPo).errors) {
      const row = out.find((x) => x.rowNo === e.rowNo);
      if (row) {
        row.status = "ERROR";
        row.errors.push(e.message);
      }
    }
  }
  return out;
}