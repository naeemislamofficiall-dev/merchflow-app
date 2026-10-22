import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { BusinessRuleError } from "@/lib/business-rules";
import { assertRecordInScope, found, listFilter } from "@/lib/service-helpers";
import { assertFactoryInScope, factoryWhere } from "@/lib/scope";
import { nextPackingListNo } from "@/lib/numbering-extra";
import { round2 } from "@/lib/finance-calc";
import { shipmentService } from "./shipment.service";
import { BaseService } from "./base.service";

// প্যাকিং লিস্টে জমানো কার্টনের ছবি (Json হিসেবে ডাটাবেসে থাকে)
export type PackingListSnapshot = {
  shipmentNo: string;
  buyerName: string;
  mode: string;
  port: string | null;
  destination: string | null;
  plannedShipDate: string;
  cartons: {
    cartonNo: string;
    orderNo: string;
    grossKg: number | null;
    netKg: number | null;
    lengthCm: number | null;
    widthCm: number | null;
    heightCm: number | null;
    cbm: number | null;
    pcs: number;
    lines: { styleNo: string; color: string; size: string; qty: number }[];
  }[];
};

const createSchema = z.object({
  shipmentId: z.string().min(1, "Select a shipment"),
  remarks: z.string().max(300).optional(),
});

function requireStatus(current: string, allowed: string[], what: string) {
  if (!allowed.includes(current)) {
    throw new BusinessRuleError(`You cannot ${what} when the packing list is ${current.toLowerCase()}`);
  }
}

const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));

class PackingListService extends BaseService {
  // শিপমেন্টের এখনকার কার্টন থেকে ছবি আর মোট হিসাব বানায়
  private async build(shipmentId: string) {
    const shipment = await shipmentService.get(shipmentId); // permission আর scope এখানেই যাচাই হয়
    if (shipment.status === "CANCELLED") throw new BusinessRuleError("This shipment is cancelled");

    const cartons = await prisma.carton.findMany({
      where: { shipmentLine: { shipmentId } },
      include: { lines: true },
      orderBy: { cartonNo: "asc" },
    });
    if (cartons.length === 0) throw new BusinessRuleError("Add cartons to the shipment first");

    const lines = cartons.flatMap((c) => c.lines);
    const [orders, styles, colors, sizes, buyer] = await Promise.all([
      prisma.order.findMany({
        where: { id: { in: [...new Set(cartons.map((c) => c.orderId))] } },
        select: { id: true, orderNo: true },
      }),
      prisma.style.findMany({
        where: { id: { in: [...new Set(lines.map((l) => l.styleId))] } },
        select: { id: true, styleNo: true },
      }),
      prisma.styleColor.findMany({
        where: { id: { in: [...new Set(lines.map((l) => l.colorId))] } },
        select: { id: true, name: true },
      }),
      prisma.styleSize.findMany({
        where: { id: { in: [...new Set(lines.map((l) => l.sizeId))] } },
        select: { id: true, label: true },
      }),
      prisma.buyer.findUnique({ where: { id: shipment.buyerId }, select: { name: true } }),
    ]);
    const orderNo = new Map(orders.map((o) => [o.id, o.orderNo]));
    const styleNo = new Map(styles.map((s) => [s.id, s.styleNo]));
    const colorName = new Map(colors.map((c) => [c.id, c.name]));
    const sizeLabel = new Map(sizes.map((s) => [s.id, s.label]));

    const snapshot: PackingListSnapshot = {
      shipmentNo: shipment.shipmentNo,
      buyerName: buyer?.name ?? "-",
      mode: shipment.mode,
      port: shipment.port,
      destination: shipment.destination,
      plannedShipDate: shipment.plannedShipDate.toISOString().slice(0, 10),
      cartons: cartons.map((c) => {
        const l = num(c.lengthCm), w = num(c.widthCm), h = num(c.heightCm);
        return {
          cartonNo: c.cartonNo,
          orderNo: orderNo.get(c.orderId) ?? "-",
          grossKg: num(c.grossWeightKg),
          netKg: num(c.netWeightKg),
          lengthCm: l,
          widthCm: w,
          heightCm: h,
          cbm: l && w && h ? Math.round(((l * w * h) / 1_000_000) * 10000) / 10000 : null,
          pcs: c.lines.reduce((s, x) => s + x.quantity, 0),
          lines: c.lines.map((x) => ({
            styleNo: styleNo.get(x.styleId) ?? "-",
            color: colorName.get(x.colorId) ?? "-",
            size: sizeLabel.get(x.sizeId) ?? "-",
            qty: x.quantity,
          })),
        };
      }),
    };
    const totals = {
      totalCartons: snapshot.cartons.length,
      totalPcs: snapshot.cartons.reduce((s, c) => s + c.pcs, 0),
      totalGrossKg: round2(snapshot.cartons.reduce((s, c) => s + (c.grossKg ?? 0), 0)),
      totalNetKg: round2(snapshot.cartons.reduce((s, c) => s + (c.netKg ?? 0), 0)),
      totalCbm: Math.round(snapshot.cartons.reduce((s, c) => s + (c.cbm ?? 0), 0) * 10000) / 10000,
    };
    return { shipment, snapshot, totals };
  }

  private async load(id: string) {
    const row = found(await prisma.packingList.findUnique({ where: { id } }), "Packing list");
    return row;
  }

  async create(input: unknown) {
    const user = await this.guard("packing.create");
    const d = createSchema.parse(input);
    const { shipment, snapshot, totals } = await this.build(d.shipmentId);

    const active = await prisma.packingList.count({
      where: { shipmentId: d.shipmentId, status: { not: "CANCELLED" } },
    });
    if (active > 0) {
      throw new BusinessRuleError("This shipment already has a packing list. Cancel it first to make a new one");
    }
    const row = await prisma.packingList.create({
      data: {
        companyId: user.companyId,
        factoryId: shipment.factoryId,
        packingListNo: await nextPackingListNo(user.companyId),
        shipmentId: d.shipmentId,
        buyerId: shipment.buyerId,
        remarks: d.remarks,
        createdById: user.id,
        ...totals,
        data: snapshot as unknown as Prisma.InputJsonValue,
      },
    });
    await this.audit({ user, action: "CREATE", entity: "PackingList", entityId: row.id, after: { ...totals, shipmentId: d.shipmentId } });
    return row;
  }

  async list() {
    const user = await this.guard("packing.view");
    const scope = await this.scopeOf(user);
    const rows = await prisma.packingList.findMany({
      where: { ...(await listFilter(user)), ...factoryWhere(scope) },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return rows.map((r) => {
      const snap = r.data as unknown as PackingListSnapshot | null;
      return {
        id: r.id,
        packingListNo: r.packingListNo,
        shipmentNo: snap?.shipmentNo ?? "-",
        buyerName: snap?.buyerName ?? "-",
        status: r.status,
        totalCartons: r.totalCartons,
        totalPcs: r.totalPcs,
        totalGrossKg: Number(r.totalGrossKg),
        createdAt: r.createdAt,
      };
    });
  }

  async get(id: string) {
    const user = await this.guard("packing.view");
    const row = await this.load(id);
    await assertRecordInScope(user, row.companyId);
    assertFactoryInScope(await this.scopeOf(user), row.factoryId);
    return {
      row,
      snapshot: row.data as unknown as PackingListSnapshot,
    };
  }

  // নতুন প্যাকিং লিস্টের ড্রপডাউন: যে শিপমেন্টে এখনো সক্রিয় লিস্ট নেই
  async shipmentOptions() {
    await this.guard("packing.create");
    const shipments = await shipmentService.list();
    const used = await prisma.packingList.findMany({
      where: { shipmentId: { in: shipments.map((s) => s.id) }, status: { not: "CANCELLED" } },
      select: { shipmentId: true },
    });
    const taken = new Set(used.map((u) => u.shipmentId));
    return shipments
      .filter((s) => s.status !== "CANCELLED" && s._count.lines > 0 && !taken.has(s.id))
      .map((s) => ({ id: s.id, label: `${s.shipmentNo} (${s._count.lines} cartons)` }));
  }

  // Draft অবস্থায় শিপমেন্টের নতুন কার্টন ধরে আবার বানায়
  async refresh(id: string) {
    const user = await this.guard("packing.edit");
    const before = await this.load(id);
    await assertRecordInScope(user, before.companyId);
    assertFactoryInScope(await this.scopeOf(user), before.factoryId);
    requireStatus(before.status, ["DRAFT"], "refresh");
    const { snapshot, totals } = await this.build(before.shipmentId);
    const row = await prisma.packingList.update({
      where: { id },
      data: { ...totals, data: snapshot as unknown as Prisma.InputJsonValue },
    });
    await this.audit({ user, action: "UPDATE", entity: "PackingList", entityId: id, before: { totalPcs: before.totalPcs }, after: totals });
    return row;
  }

  // Issue করলে লিস্ট জমে যায়, আর বদলায় না
  async issue(id: string) {
    const user = await this.guard("packing.edit");
    const before = await this.load(id);
    await assertRecordInScope(user, before.companyId);
    assertFactoryInScope(await this.scopeOf(user), before.factoryId);
    requireStatus(before.status, ["DRAFT"], "issue");
    const { snapshot, totals } = await this.build(before.shipmentId); // ইস্যুর মুহূর্তের শেষ অবস্থা
    const row = await prisma.packingList.update({
      where: { id },
      data: {
        ...totals,
        data: snapshot as unknown as Prisma.InputJsonValue,
        status: "ISSUED",
        issuedAt: new Date(),
        issuedById: user.id,
      },
    });
    await this.audit({ user, action: "UPDATE", entity: "PackingList", entityId: id, before: { status: before.status }, after: { status: row.status, ...totals } });
    return row;
  }

  async cancel(id: string, reason: string) {
    const user = await this.guard("packing.edit");
    if (!reason || reason.trim().length < 3) throw new BusinessRuleError("A reason is required");
    const before = await this.load(id);
    await assertRecordInScope(user, before.companyId);
    assertFactoryInScope(await this.scopeOf(user), before.factoryId);
    requireStatus(before.status, ["DRAFT", "ISSUED"], "cancel");
    const row = await prisma.packingList.update({
      where: { id },
      data: { status: "CANCELLED", cancelReason: reason.trim() },
    });
    await this.audit({ user, action: "UPDATE", entity: "PackingList", entityId: id, before: { status: before.status }, after: { status: row.status }, reason: reason.trim() });
    return row;
  }
}

export const packingListService = new PackingListService();
