import QRCode from "qrcode";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { buildCode } from "@/lib/barcode";
import { BusinessRuleError } from "@/lib/business-rules";
import { nextCartonNo } from "@/lib/numbering";
import { cartonCbm } from "@/lib/shipping-calc";
import { assertFactoryInScope, factoryWhere } from "@/lib/scope";
import { assertRecordInScope, found, listFilter } from "@/lib/service-helpers";
import { TX_OPTIONS, advisoryLock } from "@/lib/stock";
import type { CartonStatus } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import { BaseService } from "./base.service";

const PACK_TYPES = ["SOLID", "ASSORTMENT", "RATIO", "PREPACK"] as const;
const num = z.number().positive();

const planSchema = z.object({
  orderId: z.string().min(1),
  styleId: z.string().min(1),
  packType: z.enum(PACK_TYPES).optional(),
  pcsPerCarton: z.number().int().positive().optional(),
  ratio: z.record(z.string(), z.number().int().positive()).optional(), // যেমন {"S":1,"M":2,"L":1}
  cartonLengthCm: num.optional(),
  cartonWidthCm: num.optional(),
  cartonHeightCm: num.optional(),
  remarks: z.string().max(300).optional(),
});

const lineSchema = z.object({
  productionOrderId: z.string().min(1),
  colorId: z.string().min(1),
  sizeId: z.string().min(1),
  quantity: z.number().int().positive(),
});

const detailSchema = z.object({
  grossWeightKg: num.optional(),
  netWeightKg: num.optional(),
  lengthCm: num.optional(),
  widthCm: num.optional(),
  heightCm: num.optional(),
});

const createSchema = detailSchema.extend({
  orderId: z.string().min(1),
  packType: z.enum(PACK_TYPES).optional(),
  lines: z.array(lineSchema).min(1),
});

class PackingService extends BaseService {
  // ---------- প্যাকিং কনফিগ (বায়ার/স্টাইল অনুযায়ী) ----------
  async savePlan(input: unknown) {
    const user = await this.guard("packing.edit");
    const { ratio, ...d } = planSchema.parse(input);
    const order = found(await prisma.order.findUnique({ where: { id: d.orderId } }), "Order");
    await assertRecordInScope(user, order.companyId);
    const style = found(await prisma.style.findUnique({ where: { id: d.styleId } }), "Style");
    if (style.companyId !== user.companyId) throw new BusinessRuleError("Style not found");
    const data = { ...d, ratio: ratio as Prisma.InputJsonValue | undefined };
    const row = await prisma.packingPlan.upsert({
      where: { orderId_styleId: { orderId: d.orderId, styleId: d.styleId } },
      update: data,
      create: { ...data, companyId: user.companyId },
    });
    await this.audit({ user, action: "UPDATE", entity: "PackingPlan", entityId: row.id, after: row });
    return row;
  }

  async plans(orderId: string) {
    const user = await this.guard("packing.view");
    const order = found(await prisma.order.findUnique({ where: { id: orderId } }), "Order");
    await assertRecordInScope(user, order.companyId);
    return prisma.packingPlan.findMany({ where: { orderId } });
  }

  // ---------- Carton ----------
  private async loadCarton(id: string) {
    const user = await this.guard("packing.view");
    const c = found(await prisma.carton.findUnique({ where: { id }, include: { lines: true, shipmentLine: true } }), "Carton");
    await assertRecordInScope(user, c.companyId);
    assertFactoryInScope(await this.scopeOf(user), c.factoryId);
    return { user, c };
  }

  async createCarton(input: unknown) {
    const user = await this.guard("packing.create");
    const d = createSchema.parse(input);
    assertGrossNet(d.grossWeightKg, d.netWeightKg);

    const order = found(await prisma.order.findUnique({ where: { id: d.orderId } }), "Order");
    await assertRecordInScope(user, order.companyId);
    if (order.status !== "IN_PRODUCTION" && order.status !== "PARTIALLY_SHIPPED") {
      throw new BusinessRuleError("Packing is possible only for an order in production");
    }

    // একই (production order, color, size) দুবার এলে যোগ করে নিই
    const merged = new Map<string, z.infer<typeof lineSchema>>();
    for (const l of d.lines) {
      const k = `${l.productionOrderId}|${l.colorId}|${l.sizeId}`;
      const prev = merged.get(k);
      merged.set(k, prev ? { ...prev, quantity: prev.quantity + l.quantity } : l);
    }
    const lines = [...merged.values()];

    const poIds = [...new Set(lines.map((l) => l.productionOrderId))].sort();
    const pos = await prisma.productionOrder.findMany({ where: { id: { in: poIds } } });
    if (pos.length !== poIds.length) throw new BusinessRuleError("Production order not found");
    const poById = new Map(pos.map((p) => [p.id, p]));
    for (const p of pos) {
      if (p.orderId !== order.id) throw new BusinessRuleError(`${p.productionNo} belongs to another order`);
      if (!["IN_PROGRESS", "PAUSED", "COMPLETED"].includes(p.status)) {
        throw new BusinessRuleError(`${p.productionNo} is not in progress`);
      }
    }
    const factoryIds = new Set(pos.map((p) => p.factoryId));
    if (factoryIds.size > 1) throw new BusinessRuleError("A carton cannot mix production orders of different factories");
    const factoryId = pos[0].factoryId;
    assertFactoryInScope(await this.scopeOf(user), factoryId);

    const [colors, sizes] = await Promise.all([
      prisma.styleColor.findMany({ where: { id: { in: lines.map((l) => l.colorId) } } }),
      prisma.styleSize.findMany({ where: { id: { in: lines.map((l) => l.sizeId) } } }),
    ]);
    const colorById = new Map(colors.map((c) => [c.id, c]));
    const sizeById = new Map(sizes.map((s) => [s.id, s]));
    for (const l of lines) {
      const styleId = poById.get(l.productionOrderId)!.styleId;
      if (colorById.get(l.colorId)?.styleId !== styleId) throw new BusinessRuleError("Color does not belong to the style");
      if (sizeById.get(l.sizeId)?.styleId !== styleId) throw new BusinessRuleError("Size does not belong to the style");
    }

    const { lines: _ignore, ...header } = d;
    void _ignore;
    const cartonNo = await nextCartonNo(user.companyId);
    const row = await prisma.$transaction(async (tx) => {
      for (const id of poIds) await advisoryLock(tx, `packing:${id}`);
      // প্যাক করা ≤ Finishing থেকে আসা (Finished Goods)
      for (const id of poIds) {
        const add = lines.filter((l) => l.productionOrderId === id).reduce((s, l) => s + l.quantity, 0);
        const [fin, packed] = await Promise.all([
          tx.finishingLog.aggregate({ _sum: { outputQty: true }, where: { productionOrderId: id } }),
          tx.cartonLine.aggregate({ _sum: { quantity: true }, where: { productionOrderId: id } }),
        ]);
        const finished = fin._sum.outputQty ?? 0;
        const already = packed._sum.quantity ?? 0;
        if (already + add > finished) {
          throw new BusinessRuleError(
            `${poById.get(id)!.productionNo}: packed ${already + add} cannot be more than finished ${finished}`
          );
        }
      }
      return tx.carton.create({
        data: {
          ...header,
          companyId: user.companyId,
          factoryId,
          cartonNo,
          barcode: buildCode("CARTON", cartonNo),
          createdById: user.id,
          lines: {
            create: lines.map((l) => ({ ...l, styleId: poById.get(l.productionOrderId)!.styleId })),
          },
        },
        include: { lines: true },
      });
    }, TX_OPTIONS);
    await this.audit({ user, action: "CREATE", entity: "Carton", entityId: row.id, after: row });
    return row;
  }

  async updateDetails(id: string, input: unknown) {
    const user = await this.guard("packing.edit");
    const d = detailSchema.parse(input);
    const { c } = await this.loadCarton(id);
    if (c.status !== "OPEN") throw new BusinessRuleError("Only an open carton can be edited");
    assertGrossNet(
      d.grossWeightKg ?? (c.grossWeightKg ? Number(c.grossWeightKg) : undefined),
      d.netWeightKg ?? (c.netWeightKg ? Number(c.netWeightKg) : undefined)
    );
    const row = await prisma.carton.update({ where: { id }, data: d });
    await this.audit({ user, action: "UPDATE", entity: "Carton", entityId: id, before: c, after: row });
    return row;
  }

  // বন্ধ করতে ওজন ও মাপ লাগে (Packing list-এর জন্য)
  async close(id: string) {
    const user = await this.guard("packing.edit");
    const { c } = await this.loadCarton(id);
    if (c.status !== "OPEN") throw new BusinessRuleError("The carton is not open");
    if (!c.grossWeightKg || !c.netWeightKg || !c.lengthCm || !c.widthCm || !c.heightCm) {
      throw new BusinessRuleError("Enter gross weight, net weight and dimensions before closing");
    }
    const row = await prisma.carton.update({ where: { id }, data: { status: "CLOSED", closedAt: new Date() } });
    await this.audit({ user, action: "UPDATE", entity: "Carton", entityId: id, before: { status: c.status }, after: { status: row.status } });
    return row;
  }

  // শিপমেন্টে না দিলে আবার খোলা যায়
  async reopen(id: string) {
    const user = await this.guard("packing.edit");
    const { c } = await this.loadCarton(id);
    if (c.status !== "CLOSED") throw new BusinessRuleError("Only a closed carton can be reopened");
    if (c.shipmentLine) throw new BusinessRuleError("This carton is allocated to a shipment. Remove it from the shipment first");
    const row = await prisma.carton.update({ where: { id }, data: { status: "OPEN", closedAt: null } });
    await this.audit({ user, action: "UPDATE", entity: "Carton", entityId: id, before: { status: c.status }, after: { status: row.status } });
    return row;
  }

  // ভুল হলে খোলা carton মুছে নতুন বানান
  async remove(id: string) {
    const user = await this.guard("packing.edit");
    const { c } = await this.loadCarton(id);
    if (c.status !== "OPEN") throw new BusinessRuleError("Only an open carton can be deleted");
    await prisma.carton.delete({ where: { id } });
    await this.audit({ user, action: "DELETE", entity: "Carton", entityId: id, before: c });
    return { ok: true };
  }

  async list(filter: { orderId?: string; status?: CartonStatus } = {}) {
    const user = await this.guard("packing.view");
    return prisma.carton.findMany({
      where: {
        ...(await listFilter(user)),
        ...factoryWhere(await this.scopeOf(user)),
        ...(filter.orderId ? { orderId: filter.orderId } : {}),
        ...(filter.status ? { status: filter.status } : {}),
      },
      include: { lines: true },
      orderBy: { cartonNo: "asc" },
      take: 500,
    });
  }

  async get(id: string) {
    return (await this.loadCarton(id)).c;
  }

  // ---------- Packing list (carton ধরে, সাথে মোট) ----------
  async packingList(by: { orderId?: string; shipmentId?: string }) {
    const user = await this.guard("packing.view");
    if (!by.orderId && !by.shipmentId) throw new BusinessRuleError("Give an order or a shipment");
    const scope = await this.scopeOf(user);
    const cartons = await prisma.carton.findMany({
      where: {
        ...(await listFilter(user)),
        ...factoryWhere(scope),
        status: { in: ["CLOSED", "SHIPPED"] },
        ...(by.orderId ? { orderId: by.orderId } : {}),
        ...(by.shipmentId ? { shipmentLine: { shipmentId: by.shipmentId } } : {}),
      },
      include: { lines: true },
      orderBy: { cartonNo: "asc" },
    });
    const names = await this.names(cartons.flatMap((c) => c.lines));
    const rows = cartons.map((c) => {
      const qty = c.lines.reduce((s, l) => s + l.quantity, 0);
      const cbm = cartonCbm(Number(c.lengthCm), Number(c.widthCm), Number(c.heightCm));
      return {
        cartonNo: c.cartonNo, barcode: c.barcode, packType: c.packType, status: c.status,
        grossWeightKg: Number(c.grossWeightKg), netWeightKg: Number(c.netWeightKg),
        lengthCm: Number(c.lengthCm), widthCm: Number(c.widthCm), heightCm: Number(c.heightCm), cbm, qty,
        lines: c.lines.map((l) => ({
          style: names.style.get(l.styleId), color: names.color.get(l.colorId),
          size: names.size.get(l.sizeId), quantity: l.quantity,
        })),
      };
    });
    const sum = (f: (r: (typeof rows)[number]) => number) => Math.round(rows.reduce((s, r) => s + f(r), 0) * 1000) / 1000;
    return {
      cartons: rows,
      totals: { cartons: rows.length, qty: sum((r) => r.qty), grossWeightKg: sum((r) => r.grossWeightKg), netWeightKg: sum((r) => r.netWeightKg), cbm: sum((r) => r.cbm) },
    };
  }

  // ---------- Finished Goods: Order → Style → Color → Size → Carton (সেকশন ৩৮) ----------
  async finishedGoods(orderId: string) {
    const user = await this.guard("packing.view");
    const order = found(await prisma.order.findUnique({ where: { id: orderId } }), "Order");
    await assertRecordInScope(user, order.companyId);
    const lines = await prisma.cartonLine.findMany({
      where: { carton: { orderId, status: "CLOSED" } },
      include: { carton: { select: { cartonNo: true } } },
    });
    const names = await this.names(lines);
    return lines.map((l) => ({
      style: names.style.get(l.styleId), color: names.color.get(l.colorId),
      size: names.size.get(l.sizeId), cartonNo: l.carton.cartonNo, quantity: l.quantity,
    }));
  }

  private async names(lines: { styleId: string; colorId: string; sizeId: string }[]) {
    const [styles, colors, sizes] = await Promise.all([
      prisma.style.findMany({ where: { id: { in: [...new Set(lines.map((l) => l.styleId))] } }, select: { id: true, styleNo: true } }),
      prisma.styleColor.findMany({ where: { id: { in: [...new Set(lines.map((l) => l.colorId))] } }, select: { id: true, name: true } }),
      prisma.styleSize.findMany({ where: { id: { in: [...new Set(lines.map((l) => l.sizeId))] } }, select: { id: true, label: true } }),
    ]);
    return {
      style: new Map(styles.map((s) => [s.id, s.styleNo])),
      color: new Map(colors.map((c) => [c.id, c.name])),
      size: new Map(sizes.map((s) => [s.id, s.label])),
    };
  }

  // Carton-এর লেবেল (QR)
  async label(cartonNo: string) {
    const user = await this.guard("scan.use");
    const c = found(
      await prisma.carton.findUnique({
        where: { companyId_cartonNo: { companyId: user.companyId, cartonNo } },
        include: { lines: true },
      }),
      "Carton"
    );
    assertFactoryInScope(await this.scopeOf(user), c.factoryId);
    const names = await this.names(c.lines);
    return {
      code: c.barcode,
      qrDataUrl: await QRCode.toDataURL(c.barcode, { margin: 1, width: 240 }),
      cartonNo: c.cartonNo,
      qty: c.lines.reduce((s, l) => s + l.quantity, 0),
      lines: c.lines.map((l) => ({
        style: names.style.get(l.styleId), color: names.color.get(l.colorId),
        size: names.size.get(l.sizeId), quantity: l.quantity,
      })),
    };
  }
}

function assertGrossNet(gross?: number, net?: number) {
  if (gross !== undefined && net !== undefined && gross > 0 && net > 0 && net > gross) {
    throw new BusinessRuleError("Net weight cannot be more than gross weight");
  }
}

export const packingService = new PackingService();