import { prisma } from "@/lib/prisma";
import { BusinessRuleError } from "@/lib/business-rules";
import { found } from "@/lib/service-helpers";
import { advisoryLock, postOpeningBalance, TX_OPTIONS, type Db } from "@/lib/stock";
import { MAX_IMPORT_ROWS } from "@/lib/import-file";
import { parseColors, parseSizes, tableToRecords } from "@/lib/import-parse";
import {
  IMPORTERS,
  buyerRow,
  groupOrderRows,
  materialRow,
  openingStockRow,
  openPoRow,
  groupPoRows,
  orderRow,
  styleRow,
  supplierRow,
  validateRecords,
  type ImportType,
  type ValidatedRow,
} from "@/lib/import-schemas";
import { snapshotMoney } from "./currency.service";
import { BaseService } from "./base.service";

type Ctx = { companyId: string; factoryIds: string[]; userId: string; batchId: string; apply: boolean };
type Eval = { rowNo: number; status: "OK" | "ERROR" | "SKIPPED"; errors: string[] };
type Item = { rowNo: number; data: Record<string, string> };
type Mark = (rowNo: number, status: "ERROR" | "SKIPPED", msg: string) => void;
type Ok = (rowNo: number) => boolean;
type Handler = (db: Db, c: Ctx, items: Item[], mark: Mark, ok: Ok) => Promise<void>;

const lc = (s: string) => s.toLowerCase();

const buyers: Handler = async (db, c, items, mark, ok) => {
  const have = new Set((await db.buyer.findMany({ where: { companyId: c.companyId }, select: { code: true } })).map((x) => lc(x.code)));
  const rows = items.map((i) => ({ rowNo: i.rowNo, p: buyerRow.parse(i.data) }));
  for (const { rowNo, p } of rows) if (have.has(lc(p.code))) mark(rowNo, "SKIPPED", "Buyer code already exists");
  if (!c.apply) return;
  for (const { rowNo, p } of rows) if (ok(rowNo)) await db.buyer.create({ data: { ...p, companyId: c.companyId } });
};

const suppliers: Handler = async (db, c, items, mark, ok) => {
  const have = new Set((await db.supplier.findMany({ where: { companyId: c.companyId }, select: { code: true } })).map((x) => lc(x.code)));
  const rows = items.map((i) => ({ rowNo: i.rowNo, p: supplierRow.parse(i.data) }));
  for (const { rowNo, p } of rows) if (have.has(lc(p.code))) mark(rowNo, "SKIPPED", "Supplier code already exists");
  if (!c.apply) return;
  for (const { rowNo, p } of rows) if (ok(rowNo)) await db.supplier.create({ data: { ...p, companyId: c.companyId } });
};

const materials: Handler = async (db, c, items, mark, ok) => {
  const have = new Set((await db.material.findMany({ where: { companyId: c.companyId }, select: { code: true } })).map((x) => lc(x.code)));
  const cats = new Map((await db.materialCategory.findMany({ where: { companyId: c.companyId }, select: { id: true, code: true } })).map((x) => [lc(x.code), x.id]));
  const rows = items.map((i) => ({ rowNo: i.rowNo, p: materialRow.parse(i.data) }));
  for (const { rowNo, p } of rows) {
    if (!cats.has(lc(p.categoryCode))) mark(rowNo, "ERROR", `Material category ${p.categoryCode} not found`);
    else if (have.has(lc(p.code))) mark(rowNo, "SKIPPED", "Material code already exists");
  }
  if (!c.apply) return;
  for (const { rowNo, p } of rows) {
    if (!ok(rowNo)) continue;
    await db.material.create({
      data: {
        companyId: c.companyId, categoryId: cats.get(lc(p.categoryCode))!, code: p.code, name: p.name,
        unit: p.unit, description: p.description, reorderPoint: p.reorderPoint,
      },
    });
  }
};

const styles: Handler = async (db, c, items, mark, ok) => {
  const have = new Set((await db.style.findMany({ where: { companyId: c.companyId }, select: { styleNo: true } })).map((x) => lc(x.styleNo)));
  const buyerMap = new Map((await db.buyer.findMany({ where: { companyId: c.companyId }, select: { id: true, code: true, status: true } })).map((x) => [lc(x.code), x]));
  const seasonMap = new Map((await db.season.findMany({ where: { companyId: c.companyId }, select: { id: true, code: true, name: true } })).map((x) => [lc(x.code), x]));
  const rows = items.map((i) => ({ rowNo: i.rowNo, p: styleRow.parse(i.data) }));
  for (const { rowNo, p } of rows) {
    const b = buyerMap.get(lc(p.buyerCode));
    const colors = parseColors(p.colors ?? "");
    if (!b) mark(rowNo, "ERROR", `Buyer ${p.buyerCode} not found`);
    else if (b.status !== "ACTIVE") mark(rowNo, "ERROR", `Buyer ${p.buyerCode} is not active`);
    else if (p.seasonCode && !seasonMap.has(lc(p.seasonCode))) mark(rowNo, "ERROR", `Season ${p.seasonCode} not found`);
    else if (new Set(colors.map((x) => lc(x.code))).size !== colors.length) mark(rowNo, "ERROR", "Duplicate color code in Colors");
    else if (have.has(lc(p.styleNo))) mark(rowNo, "SKIPPED", "Style number already exists");
  }
  if (!c.apply) return;
  for (const { rowNo, p } of rows) {
    if (!ok(rowNo)) continue;
    const season = p.seasonCode ? seasonMap.get(lc(p.seasonCode)) : undefined;
    const st = await db.style.create({
      data: {
        companyId: c.companyId, styleNo: p.styleNo, buyerId: buyerMap.get(lc(p.buyerCode))!.id, name: p.name,
        seasonId: season?.id, season: season?.name, category: p.category, garmentType: p.garmentType,
        gender: p.gender, fabricType: p.fabricType, composition: p.composition, gsm: p.gsm, createdById: c.userId,
      },
    });
    const colors = parseColors(p.colors ?? "");
    if (colors.length) {
      await db.styleColor.createMany({ data: colors.map((x, i) => ({ styleId: st.id, code: x.code, name: x.name, sortOrder: i })) });
    }
    const sizes = parseSizes(p.sizes ?? "");
    if (sizes.length) {
      await db.styleSize.createMany({ data: sizes.map((label, i) => ({ styleId: st.id, label, sortOrder: i })) });
    }
  }
};

const orders: Handler = async (db, c, items, mark, ok) => {
  const parsed = items.map((i) => ({ rowNo: i.rowNo, data: orderRow.parse(i.data) }));
  const { orders: groups } = groupOrderRows(parsed);
  const [buyerList, styleList, seasonList, existingOrders] = await Promise.all([
    db.buyer.findMany({ where: { companyId: c.companyId }, select: { id: true, code: true, status: true } }),
    db.style.findMany({
      where: { companyId: c.companyId },
      select: { id: true, styleNo: true, buyerId: true, status: true, colors: { select: { id: true, code: true } }, sizes: { select: { id: true, label: true } } },
    }),
    db.season.findMany({ where: { companyId: c.companyId }, select: { id: true, code: true } }),
    db.order.findMany({ where: { companyId: c.companyId, buyerPoNo: { not: null } }, select: { buyerId: true, buyerPoNo: true } }),
  ]);
  const buyerMap = new Map(buyerList.map((x) => [lc(x.code), x]));
  const styleMap = new Map(styleList.map((x) => [lc(x.styleNo), x]));
  const seasonMap = new Map(seasonList.map((x) => [lc(x.code), x.id]));
  const existing = new Set(existingOrders.map((o) => `${o.buyerId}|${lc(o.buyerPoNo ?? "")}`));

  for (const g of groups) {
    const all = g.lines.flatMap((l) => l.cells.map((x) => x.rowNo));
    const buyer = buyerMap.get(lc(g.buyerCode));
    if (!buyer) { all.forEach((n) => mark(n, "ERROR", `Buyer ${g.buyerCode} not found`)); continue; }
    if (buyer.status !== "ACTIVE") { all.forEach((n) => mark(n, "ERROR", `Buyer ${g.buyerCode} is not active`)); continue; }
    if (existing.has(`${buyer.id}|${lc(g.buyerPoNo)}`)) {
      all.forEach((n) => mark(n, "SKIPPED", "Order with this buyer PO already exists"));
      continue;
    }
    if (g.seasonCode && !seasonMap.has(lc(g.seasonCode))) {
      all.forEach((n) => mark(n, "ERROR", `Season ${g.seasonCode} not found`));
      continue;
    }
    for (const l of g.lines) {
      const st = styleMap.get(lc(l.styleNo));
      if (!st || st.buyerId !== buyer.id) { l.cells.forEach((x) => mark(x.rowNo, "ERROR", `Style ${l.styleNo} not found for buyer ${g.buyerCode}`)); continue; }
      if (st.status === "ARCHIVED") { l.cells.forEach((x) => mark(x.rowNo, "ERROR", `Style ${l.styleNo} is archived`)); continue; }
      if (l.cells.reduce((s, x) => s + x.quantity, 0) <= 0) { l.cells.forEach((x) => mark(x.rowNo, "ERROR", `Style ${l.styleNo} has zero total quantity`)); continue; }
      for (const x of l.cells) {
        if (!st.colors.some((k) => lc(k.code) === lc(x.colorCode))) mark(x.rowNo, "ERROR", `Color ${x.colorCode} is not on style ${l.styleNo}`);
        if (!st.sizes.some((k) => lc(k.label) === lc(x.sizeLabel))) mark(x.rowNo, "ERROR", `Size ${x.sizeLabel} is not on style ${l.styleNo}`);
      }
    }
  }
  if (!c.apply) return;

  await advisoryLock(db, `seq:order:${c.companyId}`);
  const now = new Date();
  const prefix = `ORD-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}-`;
  let n = await db.order.count({ where: { companyId: c.companyId, orderNo: { startsWith: prefix } } });
  for (const g of groups) {
    if (!g.lines.every((l) => l.cells.every((x) => ok(x.rowNo)))) continue;
    const buyer = buyerMap.get(lc(g.buyerCode))!;
    const currency = g.currency ?? "USD";
    const total = g.lines.reduce((s, l) => s + l.unitPrice * l.cells.reduce((q, x) => q + x.quantity, 0), 0);
    const snap = await snapshotMoney({ amount: total, currency, companyId: c.companyId });
    n++;
    await db.order.create({
      data: {
        companyId: c.companyId,
        orderNo: `${prefix}${String(n).padStart(4, "0")}`,
        buyerId: buyer.id,
        buyerPoNo: g.buyerPoNo,
        seasonId: g.seasonCode ? seasonMap.get(lc(g.seasonCode)) : undefined,
        currency,
        orderDate: g.orderDate,
        shipDate: g.shipDate,
        createdById: c.userId,
        baseCurrency: snap.baseCurrency,
        exchangeRate: snap.exchangeRate,
        rateDate: snap.rateDate,
        lines: {
          create: g.lines.map((l) => {
            const st = styleMap.get(lc(l.styleNo))!;
            return {
              styleId: st.id,
              quantity: l.cells.reduce((q, x) => q + x.quantity, 0),
              unitPrice: l.unitPrice,
              matrix: {
                create: l.cells.map((x) => ({
                  colorId: st.colors.find((k) => lc(k.code) === lc(x.colorCode))!.id,
                  sizeId: st.sizes.find((k) => lc(k.label) === lc(x.sizeLabel))!.id,
                  quantity: x.quantity,
                })),
              },
            };
          }),
        },
      },
    });
  }
};

const openingStock: Handler = async (db, c, items, mark, ok) => {
  const mats = new Map((await db.material.findMany({ where: { companyId: c.companyId }, select: { id: true, code: true, unit: true } })).map((x) => [lc(x.code), x]));
  const whs = new Map(
    (
      await db.warehouse.findMany({
        where: { isActive: true, factory: { companyId: c.companyId, id: { in: c.factoryIds } } },
        select: { id: true, code: true, factory: { select: { code: true } } },
      })
    ).map((w) => [`${lc(w.factory.code)}|${lc(w.code)}`, w.id])
  );
  const rows = items.map((i) => ({ rowNo: i.rowNo, p: openingStockRow.parse(i.data) }));
  const matIds = [...new Set(rows.map((r) => mats.get(lc(r.p.materialCode))?.id).filter((x): x is string => !!x))];
  const lots = new Map(
    (await db.inventoryLot.findMany({ where: { companyId: c.companyId, materialId: { in: matIds } }, select: { id: true, materialId: true, lotNo: true } }))
      .map((l) => [`${l.materialId}|${lc(l.lotNo)}`, l.id])
  );
  const done = new Set(
    (await db.stockTransaction.findMany({
      where: { companyId: c.companyId, refType: "OPENING_BALANCE", materialId: { in: matIds } },
      select: { materialId: true, warehouseId: true, lotId: true },
    })).map((t) => `${t.materialId}|${t.warehouseId}|${t.lotId ?? ""}`)
  );
  for (const { rowNo, p } of rows) {
    const m = mats.get(lc(p.materialCode));
    const w = whs.get(`${lc(p.factoryCode)}|${lc(p.warehouseCode)}`);
    if (!m) { mark(rowNo, "ERROR", `Material ${p.materialCode} not found`); continue; }
    if (!w) { mark(rowNo, "ERROR", `Warehouse ${p.warehouseCode} not found in factory ${p.factoryCode}`); continue; }
    const lotId = p.lotNo ? lots.get(`${m.id}|${lc(p.lotNo)}`) : "";
    if (lotId !== undefined && done.has(`${m.id}|${w}|${lotId}`)) {
      mark(rowNo, "SKIPPED", "Opening balance already exists for this material, warehouse and lot");
    }
  }
  if (!c.apply) return;
  for (const { rowNo, p } of rows) {
    if (!ok(rowNo)) continue;
    const m = mats.get(lc(p.materialCode))!;
    await postOpeningBalance(db, {
      companyId: c.companyId,
      materialId: m.id,
      warehouseId: whs.get(`${lc(p.factoryCode)}|${lc(p.warehouseCode)}`)!,
      quantity: p.quantity,
      unit: m.unit,
      lotNo: p.lotNo,
      refId: c.batchId,
      userId: c.userId,
      remarks: p.remarks,
    });
  }
};
const openPos: Handler = async (db, c, items, mark, ok) => {
  const { pos } = groupPoRows(items.map((i) => ({ rowNo: i.rowNo, data: openPoRow.parse(i.data) })));
  const [supList, matList, existingPos] = await Promise.all([
    db.supplier.findMany({ where: { companyId: c.companyId }, select: { id: true, code: true, status: true } }),
    db.material.findMany({ where: { companyId: c.companyId }, select: { id: true, code: true, unit: true } }),
    db.purchaseOrder.findMany({ where: { companyId: c.companyId }, select: { poNo: true } }),
  ]);
  const supMap = new Map(supList.map((x) => [lc(x.code), x]));
  const matMap = new Map(matList.map((x) => [lc(x.code), x]));
  const existing = new Set(existingPos.map((p) => lc(p.poNo)));

  for (const g of pos) {
    const all = g.lines.map((l) => l.rowNo);
    const sup = supMap.get(lc(g.supplierCode));
    if (!sup) { all.forEach((n) => mark(n, "ERROR", `Supplier ${g.supplierCode} not found`)); continue; }
    if (sup.status !== "ACTIVE") { all.forEach((n) => mark(n, "ERROR", `Supplier ${g.supplierCode} is not active`)); continue; }
    if (existing.has(lc(g.poNo))) { all.forEach((n) => mark(n, "SKIPPED", "PO number already exists")); continue; }
    let bad = false;
    for (const l of g.lines) {
      if (!matMap.has(lc(l.materialCode))) { mark(l.rowNo, "ERROR", `Material ${l.materialCode} not found`); bad = true; }
    }
    if (bad) continue;
    const qty = g.lines.reduce((s, l) => s + l.quantity, 0);
    const got = g.lines.reduce((s, l) => s + l.receivedQty, 0);
    if (got >= qty) all.forEach((n) => mark(n, "SKIPPED", "PO is fully received, so it is not open"));
  }
  if (!c.apply) return;

  for (const g of pos) {
    if (!g.lines.every((l) => ok(l.rowNo))) continue;
    const currency = g.currency ?? "USD";
    const total = g.lines.reduce((s, l) => s + l.quantity * l.rate, 0);
    const got = g.lines.reduce((s, l) => s + l.receivedQty, 0);
    const snap = await snapshotMoney({ amount: total, currency, companyId: c.companyId });
    const now = new Date();
    await db.purchaseOrder.create({
      data: {
        companyId: c.companyId,
        poNo: g.poNo,
        supplierId: supMap.get(lc(g.supplierCode))!.id,
        currency,
        deliveryDate: g.deliveryDate,
        status: got > 0 ? "PARTIAL_RECEIPT" : "SENT",
        approvedAt: now,
        sentAt: now,
        createdById: c.userId,
        baseCurrency: snap.baseCurrency,
        exchangeRate: snap.exchangeRate,
        rateDate: snap.rateDate,
        baseTotal: Math.round(total * Number(snap.exchangeRate) * 100) / 100,
        lines: {
          create: g.lines.map((l) => {
            const m = matMap.get(lc(l.materialCode))!;
            return { materialId: m.id, quantity: l.quantity, receivedQty: l.receivedQty, unit: m.unit, rate: l.rate };
          }),
        },
      },
    });
  }
};

const HANDLERS: Record<ImportType, Handler> = {
  BUYERS: buyers,
  SUPPLIERS: suppliers,
  MATERIALS: materials,
  STYLES: styles,
  ORDERS: orders,
  OPENING_STOCK: openingStock,
    OPEN_POS: openPos,
};

async function evaluate(db: Db, type: ImportType, c: Ctx, rows: ValidatedRow[]): Promise<Eval[]> {
  const out = new Map<number, Eval>(rows.map((r) => [r.rowNo, { rowNo: r.rowNo, status: r.status, errors: [...r.errors] }]));
  const mark: Mark = (n, status, msg) => {
    const e = out.get(n);
    if (!e) return;
    if (status === "SKIPPED" && e.status === "ERROR") return;
    e.status = status;
    e.errors.push(msg);
  };
  const ok: Ok = (n) => out.get(n)?.status === "OK";
  const items = rows.filter((r) => r.status === "OK").map((r) => ({ rowNo: r.rowNo, data: r.data }));
  await HANDLERS[type](db, c, items, mark, ok);
  return [...out.values()];
}

const count = (ev: Eval[], s: Eval["status"]) => ev.filter((e) => e.status === s).length;

class ImportService extends BaseService {
  private async load(companyId: string, id: string) {
    const b = found(await prisma.importBatch.findUnique({ where: { id } }), "Import batch");
    if (b.companyId !== companyId) throw new BusinessRuleError("Import batch not found");
    return b;
  }

  async validate(input: { type: string; fileName: string; hash: string; table: string[][] }) {
    const user = await this.guard("import.run");
    if (!(input.type in IMPORTERS)) throw new BusinessRuleError("Unknown import type");
    const type = input.type as ImportType;

    const dup = await prisma.importBatch.findFirst({
      where: { companyId: user.companyId, type, fileHash: input.hash, status: "IMPORTED" },
    });
    if (dup) throw new BusinessRuleError("This exact file was already imported");

    const { records, missingColumns } = tableToRecords(input.table, IMPORTERS[type].columns);
    if (missingColumns.length) throw new BusinessRuleError(`Missing columns: ${missingColumns.join(", ")}`);
    if (records.length === 0) throw new BusinessRuleError("The file has no data rows");
    if (records.length > MAX_IMPORT_ROWS) throw new BusinessRuleError(`Too many rows (max ${MAX_IMPORT_ROWS})`);

    const scope = await this.scopeOf(user);
    const validated = validateRecords(type, records);
    const ev = await evaluate(prisma, type, {
      companyId: user.companyId, factoryIds: scope.factoryIds, userId: user.id, batchId: "", apply: false,
    }, validated);

    const errorRows = count(ev, "ERROR");
    const batch = await prisma.$transaction(async (tx) => {
      const b = await tx.importBatch.create({
        data: {
          companyId: user.companyId, type, fileName: input.fileName.slice(0, 200), fileHash: input.hash,
          status: errorRows > 0 ? "HAS_ERRORS" : "VALIDATED",
          totalRows: ev.length, okRows: count(ev, "OK"), errorRows, skippedRows: count(ev, "SKIPPED"),
          createdById: user.id,
        },
      });
      const byNo = new Map(validated.map((v) => [v.rowNo, v.data]));
      await tx.importRow.createMany({
        data: ev.map((e) => ({ batchId: b.id, rowNo: e.rowNo, data: byNo.get(e.rowNo) ?? {}, status: e.status, errors: e.errors })),
      });
      return b;
    }, TX_OPTIONS);
    await this.audit({
      user, action: "CREATE", entity: "ImportBatch", entityId: batch.id,
      after: { type, fileName: input.fileName, totalRows: batch.totalRows, errorRows },
    });
    return { id: batch.id };
  }

  async get(id: string) {
    const user = await this.guard("import.run");
    const batch = await this.load(user.companyId, id);
    const [bad, rest] = await Promise.all([
      prisma.importRow.findMany({ where: { batchId: id, status: "ERROR" }, orderBy: { rowNo: "asc" }, take: 200 }),
      prisma.importRow.findMany({ where: { batchId: id, status: { not: "ERROR" } }, orderBy: { rowNo: "asc" }, take: 100 }),
    ]);
    return { batch, errorRows: bad, otherRows: rest };
  }

  async listBatches() {
    const user = await this.guard("import.run");
    return prisma.importBatch.findMany({ where: { companyId: user.companyId }, orderBy: { createdAt: "desc" }, take: 30 });
  }

  // All or nothing: ek DB transaction. Error thakle kichu-i import hoy na.
  async confirm(id: string) {
    const user = await this.guard("import.run");
    const batch0 = await this.load(user.companyId, id);
    const scope = await this.scopeOf(user);
    const type = batch0.type as ImportType;
    try {
      const res = await prisma.$transaction(async (tx) => {
        await advisoryLock(tx, `import:${user.companyId}:${type}`);
        const batch = found(await tx.importBatch.findUnique({ where: { id } }), "Import batch");
        if (batch.status === "HAS_ERRORS") throw new BusinessRuleError("This batch has errors. Fix the file and upload again");
        if (batch.status === "IMPORTED") throw new BusinessRuleError("This batch is already imported");
        if (batch.status !== "VALIDATED") throw new BusinessRuleError("This batch cannot be imported");
        if (batch.okRows === 0) throw new BusinessRuleError("No new rows to import");

        const stored = await tx.importRow.findMany({ where: { batchId: id }, orderBy: { rowNo: "asc" } });
        const rows: ValidatedRow[] = stored.map((r) => ({
          rowNo: r.rowNo, data: r.data as Record<string, string>, status: "OK", errors: [],
        }));
        const c: Ctx = { companyId: user.companyId, factoryIds: scope.factoryIds, userId: user.id, batchId: id, apply: false };
        const ev = await evaluate(tx, type, c, rows);
        const bad = ev.find((e) => e.status === "ERROR");
        if (bad) throw new BusinessRuleError(`Row ${bad.rowNo}: ${bad.errors[0]}`);
        await evaluate(tx, type, { ...c, apply: true }, rows);
        await tx.importBatch.update({
          where: { id },
          data: {
            status: "IMPORTED", importedById: user.id, importedAt: new Date(),
            okRows: count(ev, "OK"), skippedRows: count(ev, "SKIPPED"),
          },
        });
        return { imported: count(ev, "OK"), skipped: count(ev, "SKIPPED") };
      }, TX_OPTIONS);
      await this.audit({ user, action: "UPDATE", entity: "ImportBatch", entityId: id, before: { status: batch0.status }, after: { status: "IMPORTED", ...res } });
      return res;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Import failed";
      if (batch0.status === "VALIDATED") {
        await prisma.importBatch.updateMany({ where: { id, status: "VALIDATED" }, data: { status: "FAILED", failReason: msg.slice(0, 500) } });
      }
      throw err;
    }
  }
}

export const importService = new ImportService();