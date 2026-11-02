import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { BusinessRuleError } from "@/lib/business-rules";
import { grossRequirement } from "@/lib/calculations";
import { assertFactoryInScope, resolveScope } from "@/lib/scope";
import type { SessionUser } from "@/lib/permissions";

// transaction-এর ভেতরের client আর সাধারণ prisma, দুটোই এখানে চলে
export type Db = Prisma.TransactionClient;

// রিমোট ডাটাবেসে ডিফল্ট ৫ সেকেন্ড কম পড়ে, তাই সময় বাড়ানো
export const TX_OPTIONS = { timeout: 30_000, maxWait: 10_000 };

export const EPS = 0.00005; // দশমিকের ছোট গোলমাল সামলাতে

// একই মালের উপর দুজন একসাথে স্টক বদলাতে গেলে একজন অপেক্ষা করে (দুজনেই "আছে" দেখে দুবার দেওয়া ঠেকায়)
export async function advisoryLock(db: Db, key: string) {
  await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`;
}

// সবসময় সাজানো ক্রমে লক নেয়, যাতে deadlock না হয়
export async function lockMaterials(db: Db, companyId: string, materialIds: string[]) {
  for (const id of [...new Set(materialIds)].sort()) {
    await advisoryLock(db, `stock:${companyId}:${id}`);
  }
}

// গুদাম (আর ঐচ্ছিক bin) ইউজারের company ও factory-র মধ্যে আছে কিনা
export async function loadWarehouse(user: SessionUser, warehouseId: string, binId?: string) {
  const wh = await prisma.warehouse.findUnique({
    where: { id: warehouseId },
    include: { factory: true },
  });
  if (!wh || !wh.isActive || wh.factory.companyId !== user.companyId) {
    throw new BusinessRuleError("Warehouse not found");
  }
  assertFactoryInScope(await resolveScope(user.id), wh.factoryId);
  if (binId) {
    const bin = await prisma.bin.findUnique({ where: { id: binId } });
    if (!bin || bin.warehouseId !== warehouseId) {
      throw new BusinessRuleError("Bin does not belong to this warehouse");
    }
  }
  return wh;
}

export async function negativeStockAllowed(db: Db, companyId: string) {
  const c = await db.company.findUnique({
    where: { id: companyId },
    select: { allowNegativeStock: true },
  });
  return c?.allowNegativeStock ?? false;
}

type Where = {
  companyId: string;
  materialId: string;
  warehouseId?: string;
  binId?: string;
  lotId?: string;
  rollId?: string;
};

// খাতার যোগফল = হাতে থাকা মাল
export async function onHand(db: Db, w: Where): Promise<number> {
  const r = await db.stockTransaction.aggregate({ _sum: { quantity: true }, where: w });
  return Number(r._sum.quantity ?? 0);
}

// Rejected রোলের মাল ব্যবহারযোগ্য নয়, তাই বাদ
export async function usableOnHand(db: Db, w: Where): Promise<number> {
  if (w.rollId) {
    const roll = await db.fabricRoll.findUnique({
      where: { id: w.rollId },
      select: { inspectionStatus: true },
    });
    if (roll?.inspectionStatus === "REJECTED") return 0;
    return onHand(db, w);
  }
  const total = await onHand(db, w);
  const rejected = await db.fabricRoll.findMany({
    where: { companyId: w.companyId, materialId: w.materialId, inspectionStatus: "REJECTED" },
    select: { id: true },
  });
  if (rejected.length === 0) return total;
  const bad = await db.stockTransaction.aggregate({
    _sum: { quantity: true },
    where: { ...w, rollId: { in: rejected.map((r) => r.id) } },
  });
  return total - Number(bad._sum.quantity ?? 0);
}

// সক্রিয় সংরক্ষণের বাকি পরিমাণ (সংরক্ষিত − ব্যবহৃত)
export async function reservedQty(
  db: Db,
  p: {
    companyId: string;
    materialId: string;
    rollId?: string;
    excludeOrderId?: string; // এই অর্ডারের সংরক্ষণ গোনা হবে না (অন্যদের জন্য রাখা মাল দেখতে)
  }
): Promise<number> {
  const rows = await db.stockReservation.findMany({
    where: {
      companyId: p.companyId,
      materialId: p.materialId,
      status: "ACTIVE",
      ...(p.rollId ? { rollId: p.rollId } : {}),
    },
    select: { orderId: true, quantity: true, consumedQty: true },
  });
  return rows
    .filter((r) => (p.excludeOrderId ? r.orderId !== p.excludeOrderId : true))
    .reduce((s, r) => s + Number(r.quantity) - Number(r.consumedQty), 0);
}

// আসন্ন সরবরাহ = পাঠানো PO-র বাকি পরিমাণ (Draft বা Approved-কে ধরা হয় না, কারণ সেগুলো এখনো যায়নি)
export async function incomingQty(db: Db, companyId: string, materialId: string): Promise<number> {
  const lines = await db.purchaseOrderLine.findMany({
    where: {
      materialId,
      po: { companyId, status: { in: ["SENT", "ACKNOWLEDGED", "PARTIAL_RECEIPT"] } },
    },
    select: { quantity: true, receivedQty: true },
  });
  return lines.reduce((s, l) => s + Math.max(Number(l.quantity) - Number(l.receivedQty), 0), 0);
}

// অর্ডারের Approved BOM অনুযায়ী এই মাল সর্বোচ্চ কত লাগার কথা (অপচয় সহ)
export async function allowedForOrder(db: Db, orderId: string, materialId: string): Promise<number> {
  const lines = await db.orderLine.findMany({
    where: { orderId },
    select: { styleId: true, quantity: true },
  });
  let total = 0;
  for (const l of lines) {
    const bom = await db.bom.findFirst({
      where: { styleId: l.styleId, status: "APPROVED" },
      include: { items: { where: { materialId } } },
    });
    for (const it of bom?.items ?? []) {
      total += grossRequirement(
        { consumption: Number(it.consumption), wastagePct: Number(it.wastagePct) },
        l.quantity
      );
    }
  }
  return total;
}

// এই অর্ডারে এখন পর্যন্ত নেট কত দেওয়া হয়েছে (ইস্যু − ফেরত)
export async function netIssuedForOrder(
  db: Db,
  companyId: string,
  orderId: string,
  materialId: string
): Promise<number> {
  const r = await db.stockTransaction.aggregate({
    _sum: { quantity: true },
    where: { companyId, orderId, materialId, type: { in: ["ISSUE", "RETURN"] } },
  });
  return -Number(r._sum.quantity ?? 0);
}

// MRP-র জন্য: স্পেক সেকশন ১৪ অনুযায়ী stock, incoming, reserved
// reserved = অন্য অর্ডারের জন্য রাখা মাল (এই অর্ডারের নিজের সংরক্ষণ তার কাজেই লাগে)
export async function getStockPosition(
  db: Db,
  companyId: string,
  materialId: string,
  orderId?: string
) {
  const [stock, incoming, reserved] = await Promise.all([
    usableOnHand(db, { companyId, materialId }),
    incomingQty(db, companyId, materialId),
    reservedQty(db, { companyId, materialId, excludeOrderId: orderId }),
  ]);
  return { stock, incoming, reserved };
}

// ===== T3 Textile (start) =====

// Textile stock write: only this file writes StockTransaction for yarn / greige / dyed fabric.
// ISSUE takes stock out (quantity saved as negative), PRODUCTION_IN puts produced stock in.
export async function postStockTx(
  db: Db,
  p: {
    companyId: string;
    materialId: string;
    warehouseId: string;
    type: "ISSUE" | "PRODUCTION_IN";
    quantity: number; // always positive
    unit: string;
    lotId?: string;
    rollId?: string;
    binId?: string;
    orderId?: string;
    refType: string;
    refId: string;
    userId?: string;
    remarks?: string;
  }
) {
  if (!(p.quantity > 0)) throw new BusinessRuleError("Quantity must be more than zero");
  await lockMaterials(db, p.companyId, [p.materialId]);

  if (p.type === "ISSUE") {
    const negOk = await negativeStockAllowed(db, p.companyId);
    const have = await onHand(db, {
      companyId: p.companyId,
      materialId: p.materialId,
      warehouseId: p.warehouseId,
      lotId: p.lotId,
      rollId: p.rollId,
      binId: p.binId,
    });
    if (!negOk && p.quantity > have + EPS) {
      throw new BusinessRuleError(`Not enough stock: only ${have} available, requested ${p.quantity}`);
    }
  }

  return db.stockTransaction.create({
    data: {
      companyId: p.companyId,
      materialId: p.materialId,
      lotId: p.lotId,
      rollId: p.rollId,
      warehouseId: p.warehouseId,
      binId: p.binId,
      type: p.type,
      quantity: p.type === "ISSUE" ? -p.quantity : p.quantity,
      unit: p.unit,
      orderId: p.orderId,
      refType: p.refType,
      refId: p.refId,
      remarks: p.remarks,
      createdById: p.userId,
    },
  });
}

// Produced fabric (greige from knitting, dyed from dyeing): lot + roll + PRODUCTION_IN in one go.
// Roll starts as PENDING, so the normal fabric inspection flow still applies before cutting.
export async function postProducedRoll(
  db: Db,
  p: {
    companyId: string;
    materialId: string;
    warehouseId: string;
    binId?: string;
    lotNo: string;
    rollNo: string;
    color?: string;
    shade?: string;
    gsm?: number;
    widthCm?: number;
    weightKg?: number;
    quantity: number;
    unit: string;
    orderId?: string;
    refType: string;
    refId: string;
    userId?: string;
    remarks?: string;
  }
) {
  if (!(p.quantity > 0)) throw new BusinessRuleError("Quantity must be more than zero");
  await lockMaterials(db, p.companyId, [p.materialId]);

  const lot = await db.inventoryLot.upsert({
    where: {
      companyId_materialId_lotNo: { companyId: p.companyId, materialId: p.materialId, lotNo: p.lotNo },
    },
    update: {},
    create: {
      companyId: p.companyId,
      materialId: p.materialId,
      lotNo: p.lotNo,
      color: p.color,
      shade: p.shade,
    },
  });

  const dup = await db.fabricRoll.findUnique({
    where: { companyId_rollNo: { companyId: p.companyId, rollNo: p.rollNo } },
  });
  if (dup) throw new BusinessRuleError(`Roll number ${p.rollNo} already exists`);

  const roll = await db.fabricRoll.create({
    data: {
      companyId: p.companyId,
      rollNo: p.rollNo,
      materialId: p.materialId,
      lotId: lot.id,
      color: p.color,
      shade: p.shade,
      gsm: p.gsm,
      widthCm: p.widthCm,
      weightKg: p.weightKg,
      quantity: p.quantity,
      warehouseId: p.warehouseId,
      binId: p.binId,
    },
  });

  await postStockTx(db, {
    companyId: p.companyId,
    materialId: p.materialId,
    warehouseId: p.warehouseId,
    type: "PRODUCTION_IN",
    quantity: p.quantity,
    unit: p.unit,
    lotId: lot.id,
    rollId: roll.id,
    binId: p.binId,
    orderId: p.orderId,
    refType: p.refType,
    refId: p.refId,
    userId: p.userId,
    remarks: p.remarks,
  });

  return { lot, roll };
}

// ===== T3 Textile (end) =====

// ===== T5 Import (start) =====
// Opening balance: only way import writes StockTransaction. Type ADJUSTMENT, refType OPENING_BALANCE.
export async function postOpeningBalance(
  db: Db,
  p: {
    companyId: string;
    materialId: string;
    warehouseId: string;
    quantity: number;
    unit: string;
    lotNo?: string;
    refId: string;
    userId?: string;
    remarks?: string;
  }
) {
  if (!(p.quantity > 0)) throw new BusinessRuleError("Quantity must be more than zero");
  await lockMaterials(db, p.companyId, [p.materialId]);
  let lotId: string | undefined;
  if (p.lotNo) {
    const lot = await db.inventoryLot.upsert({
      where: { companyId_materialId_lotNo: { companyId: p.companyId, materialId: p.materialId, lotNo: p.lotNo } },
      update: {},
      create: { companyId: p.companyId, materialId: p.materialId, lotNo: p.lotNo },
    });
    lotId = lot.id;
  }
  return db.stockTransaction.create({
    data: {
      companyId: p.companyId,
      materialId: p.materialId,
      lotId,
      warehouseId: p.warehouseId,
      type: "ADJUSTMENT",
      quantity: p.quantity,
      unit: p.unit,
      refType: "OPENING_BALANCE",
      refId: p.refId,
      remarks: `Opening balance${p.remarks ? `: ${p.remarks}` : ""}`,
      createdById: p.userId,
    },
  });
}
// ===== T5 Import (end) =====