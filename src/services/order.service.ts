import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  BusinessRuleError,
  assertBuyerActive,
  assertMatrixMatchesLine,
  assertOrderEditable,
  assertStyleOpen,
} from "@/lib/business-rules";
import { matrixTotals } from "@/lib/calculations";
import { assertTransition, orderTransitions } from "@/lib/status-rules";
import { nextOrderNo } from "@/lib/numbering";
import { assertRecordInScope, found, listFilter } from "@/lib/service-helpers";
import type { SessionUser } from "@/lib/permissions";
import type { OrderStatus } from "@/generated/prisma/enums";
import { snapshotMoney } from "./currency.service";
import { BaseService } from "./base.service";

const cellSchema = z.object({
  colorId: z.string().min(1),
  sizeId: z.string().min(1),
  quantity: z.number().int().nonnegative(),
});

const lineSchema = z.object({
  styleId: z.string().min(1),
  quantity: z.number().int().positive(),
  unitPrice: z.number().nonnegative(),
  shipDate: z.coerce.date().optional(),
});

const createSchema = z.object({
  buyerId: z.string().min(1),
  buyerPoNo: z.string().max(60).optional(),
  seasonId: z.string().optional(),
  currency: z.string().length(3).optional(),
  orderDate: z.coerce.date().optional(),
  shipDate: z.coerce.date().optional(),
  notes: z.string().max(1000).optional(),
  lines: z.array(lineSchema).min(1),
  sourceEnquiryId: z.string().optional(),
});

const draftSchema = z
  .object({
    buyerPoNo: z.string().max(60),
    seasonId: z.string(),
    shipDate: z.coerce.date(),
    notes: z.string().max(1000),
  })
  .partial();

const amendSchema = z.object({
  orderId: z.string().min(1),
  reason: z.string().min(3).max(500),
  shipDate: z.coerce.date().optional(),
  buyerPoNo: z.string().max(60).optional(),
  notes: z.string().max(1000).optional(),
  lines: z
    .array(
      z.object({
        lineId: z.string().min(1),
        quantity: z.number().int().positive().optional(),
        unitPrice: z.number().nonnegative().optional(),
        shipDate: z.coerce.date().optional(),
        cells: z.array(cellSchema).optional(),
      })
    )
    .optional(),
});

type Cell = z.infer<typeof cellSchema>;

// রং-সাইজ cell ঠিক আছে কিনা: style-এর রং/সাইজ হতে হবে, ডুপ্লিকেট নয়, মোট = লাইনের পরিমাণ
async function validateCells(styleId: string, quantity: number, cells: Cell[]) {
  const [colors, sizes] = await Promise.all([
    prisma.styleColor.findMany({ where: { styleId }, select: { id: true } }),
    prisma.styleSize.findMany({ where: { styleId }, select: { id: true } }),
  ]);
  const colorIds = new Set(colors.map((c) => c.id));
  const sizeIds = new Set(sizes.map((s) => s.id));
  const seen = new Set<string>();
  for (const c of cells) {
    if (!colorIds.has(c.colorId) || !sizeIds.has(c.sizeId)) {
      throw new BusinessRuleError("Color and size must belong to the line's style");
    }
    const key = `${c.colorId}:${c.sizeId}`;
    if (seen.has(key)) throw new BusinessRuleError("Duplicate color/size cell");
    seen.add(key);
  }
  const { total } = matrixTotals(cells);
  if (total !== quantity) {
    throw new BusinessRuleError(`Matrix total (${total}) must equal line quantity (${quantity})`);
  }
}

class OrderService extends BaseService {
  private async load(user: SessionUser, id: string) {
    const order = found(await prisma.order.findUnique({ where: { id } }), "Order");
    await assertRecordInScope(user, order.companyId);
    return order;
  }

  async list(filter: { buyerId?: string; status?: OrderStatus } = {}) {
    const user = await this.guard("order.view");
    return prisma.order.findMany({
      where: {
        ...(await listFilter(user)),
        ...(filter.buyerId ? { buyerId: filter.buyerId } : {}),
        ...(filter.status ? { status: filter.status } : {}),
      },
      include: { buyer: { select: { name: true } }, lines: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async get(id: string) {
    const user = await this.guard("order.view");
    await this.load(user, id);
    return prisma.order.findUnique({
      where: { id },
      include: {
        buyer: true,
        lines: {
          include: {
            style: { select: { styleNo: true, name: true } },
            matrix: { include: { color: true, size: true } },
          },
        },
        amendments: { orderBy: { amendmentNo: "desc" } },
      },
    });
  }

  async create(input: unknown) {
    const user = await this.guard("order.create");
    const data = createSchema.parse(input);
    const buyer = await assertBuyerActive(data.buyerId);
    if (buyer.companyId !== user.companyId) throw new BusinessRuleError("Buyer not found");

    for (const l of data.lines) {
      const style = await assertStyleOpen(l.styleId);
      if (style.companyId !== user.companyId || style.buyerId !== data.buyerId) {
        throw new BusinessRuleError("Style does not belong to this buyer");
      }
    }
    if (data.seasonId) {
      const s = await prisma.season.findUnique({ where: { id: data.seasonId } });
      if (!s || s.companyId !== user.companyId) throw new BusinessRuleError("Season not found");
    }
    if (data.sourceEnquiryId) {
      const enq = found(await prisma.enquiry.findUnique({ where: { id: data.sourceEnquiryId } }), "Enquiry");
      if (enq.companyId !== user.companyId) throw new BusinessRuleError("Enquiry not found");
      if (enq.status !== "APPROVED") throw new BusinessRuleError("Enquiry must be approved first");
    }

    // অর্ডারের মুহূর্তের রেট জমা থাকে, পরে রেট বদলালেও পুরনো হিসাব বদলায় না (সেকশন ৬১)
    const currency = (data.currency ?? "USD").toUpperCase();
    const total = data.lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
    const snap = await snapshotMoney({ amount: total, currency, companyId: user.companyId });
    const orderNo = await nextOrderNo(user.companyId);

    const order = await prisma.$transaction(async (tx) => {
      const o = await tx.order.create({
        data: {
          companyId: user.companyId,
          orderNo,
          buyerId: data.buyerId,
          buyerPoNo: data.buyerPoNo,
          seasonId: data.seasonId,
          currency,
          orderDate: data.orderDate,
          shipDate: data.shipDate,
          notes: data.notes,
          createdById: user.id,
          baseCurrency: snap.baseCurrency,
          exchangeRate: snap.exchangeRate,
          rateDate: snap.rateDate,
          lines: {
            create: data.lines.map((l) => ({
              styleId: l.styleId,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              shipDate: l.shipDate,
            })),
          },
        },
        include: { lines: true },
      });
      if (data.sourceEnquiryId) {
        await tx.enquiry.update({
          where: { id: data.sourceEnquiryId },
          data: { status: "CONVERTED", convertedOrderId: o.id },
        });
      }
      return o;
    });
    await this.audit({ user, action: "CREATE", entity: "Order", entityId: order.id, after: order });
    return order;
  }

  // Draft অবস্থায় সরাসরি বদলানো যায়। Confirmed-এর পর শুধু amendment দিয়ে।
  async updateDraft(orderId: string, input: unknown) {
    const user = await this.guard("order.edit");
    const before = await this.load(user, orderId);
    if (before.status !== "DRAFT") {
      throw new BusinessRuleError("Only a draft order can be edited directly. Use an amendment");
    }
    const data = draftSchema.parse(input);
    const row = await prisma.order.update({ where: { id: orderId }, data });
    await this.audit({ user, action: "UPDATE", entity: "Order", entityId: orderId, before, after: row });
    return row;
  }

  // লাইনের রং × সাইজ ম্যাট্রিক্স বসানো (Draft ও Confirmed অবস্থায়)
  async setMatrix(orderLineId: string, input: unknown) {
    const user = await this.guard("order.edit");
    const cells = z.array(cellSchema).min(1).parse(input);
    const line = found(await prisma.orderLine.findUnique({ where: { id: orderLineId } }), "Order line");
    const order = await this.load(user, line.orderId);
    await assertOrderEditable(order.id);
    if (order.status !== "DRAFT" && order.status !== "CONFIRMED") {
      throw new BusinessRuleError("Matrix can change only before production. Use an amendment");
    }
    await validateCells(line.styleId, line.quantity, cells);

    await prisma.$transaction([
      prisma.orderLineQty.deleteMany({ where: { orderLineId } }),
      prisma.orderLineQty.createMany({ data: cells.map((c) => ({ orderLineId, ...c })) }),
    ]);
    await this.audit({ user, action: "UPDATE", entity: "OrderLineQty", entityId: orderLineId, after: cells });
    return prisma.orderLineQty.findMany({ where: { orderLineId } });
  }

  // রং-ধরে, সাইজ-ধরে আর অর্ডারের মোট (Packed/Shipped/Balance আসবে Packing ও Shipment-এর পর)
  async getMatrix(orderLineId: string) {
    const user = await this.guard("order.view");
    const line = found(await prisma.orderLine.findUnique({ where: { id: orderLineId } }), "Order line");
    await this.load(user, line.orderId);
    const cells = await prisma.orderLineQty.findMany({
      where: { orderLineId },
      select: { colorId: true, sizeId: true, quantity: true },
    });
    return { cells, ...matrixTotals(cells) };
  }

  async confirm(orderId: string) {
    const user = await this.guard("order.approve");
    const order = await this.load(user, orderId);
    assertTransition(orderTransitions, order.status, "CONFIRMED");

    const lines = await prisma.orderLine.findMany({ where: { orderId }, include: { matrix: true } });
    if (lines.length === 0) throw new BusinessRuleError("Add at least one order line first");
    for (const l of lines) {
      if (l.matrix.length === 0) {
        throw new BusinessRuleError("Fill the color/size matrix for every line first");
      }
      await assertMatrixMatchesLine(l.id);
    }
    const row = await prisma.order.update({ where: { id: orderId }, data: { status: "CONFIRMED" } });
    await this.audit({
      user, action: "UPDATE", entity: "Order", entityId: orderId,
      before: { status: order.status }, after: { status: row.status },
    });
    return row;
  }

  // IN_PRODUCTION, PARTIALLY_SHIPPED, FULLY_SHIPPED, CLOSED
  // (পরে Production ও Shipment মডিউল নিজে এটা ডাকবে)
  async changeStatus(orderId: string, to: OrderStatus) {
    const user = await this.guard("order.edit");
    if (to === "CONFIRMED" || to === "CANCELLED") {
      throw new BusinessRuleError("Use confirm() or cancel() for this change");
    }
    const order = await this.load(user, orderId);
    assertTransition(orderTransitions, order.status, to);
    const row = await prisma.order.update({ where: { id: orderId }, data: { status: to } });
    await this.audit({
      user, action: "UPDATE", entity: "Order", entityId: orderId,
      before: { status: order.status }, after: { status: row.status },
    });
    return row;
  }

  // স্পেক অনুযায়ী শুধু Confirmed অর্ডার বাতিল করা যায়
  async cancel(orderId: string, reason: string) {
    const user = await this.guard("order.edit");
    if (!reason || reason.trim().length < 3) throw new BusinessRuleError("Cancel reason is required");
    const order = await this.load(user, orderId);
    assertTransition(orderTransitions, order.status, "CANCELLED");
    const row = await prisma.order.update({ where: { id: orderId }, data: { status: "CANCELLED" } });
    await this.audit({
      user, action: "UPDATE", entity: "Order", entityId: orderId,
      before: { status: order.status }, after: { status: row.status }, reason,
    });
    return row;
  }

  // নিয়ম ৯ ও ১৫: Confirmed বা Closed অর্ডার বদলাতে amendment লাগে, আগের মান সংরক্ষিত থাকে
  async amend(input: unknown) {
    const user = await this.guard("order.edit");
    const data = amendSchema.parse(input);
    const order = await this.load(user, data.orderId);
    if (order.status === "DRAFT") {
      throw new BusinessRuleError("Edit a draft order directly. Amendments are for confirmed orders");
    }
    if (order.status === "CANCELLED") throw new BusinessRuleError("A cancelled order cannot be amended");

    const lineIds = (data.lines ?? []).map((l) => l.lineId);
    const lines = await prisma.orderLine.findMany({ where: { orderId: order.id, id: { in: lineIds } } });
    if (lines.length !== lineIds.length) {
      throw new BusinessRuleError("Some lines do not belong to this order");
    }

    const previousValues: Record<string, unknown> = {};
    const header: { shipDate?: Date; buyerPoNo?: string; notes?: string } = {};
    if (data.shipDate !== undefined) { previousValues.shipDate = order.shipDate; header.shipDate = data.shipDate; }
    if (data.buyerPoNo !== undefined) { previousValues.buyerPoNo = order.buyerPoNo; header.buyerPoNo = data.buyerPoNo; }
    if (data.notes !== undefined) { previousValues.notes = order.notes; header.notes = data.notes; }

    const previousLines: unknown[] = [];
    for (const ch of data.lines ?? []) {
      const line = lines.find((l) => l.id === ch.lineId)!;
      const newQty = ch.quantity ?? line.quantity;
      if (newQty !== line.quantity && !ch.cells) {
        throw new BusinessRuleError("Send the new color/size cells when the quantity changes");
      }
      if (ch.cells) await validateCells(line.styleId, newQty, ch.cells);
      previousLines.push({
        lineId: line.id,
        quantity: line.quantity,
        unitPrice: Number(line.unitPrice),
        shipDate: line.shipDate,
      });
    }
    if (previousLines.length > 0) previousValues.lines = previousLines;
    if (Object.keys(previousValues).length === 0) throw new BusinessRuleError("Nothing to change");

    const amendment = await prisma.$transaction(async (tx) => {
      const count = await tx.orderAmendment.count({ where: { orderId: order.id } });
      const a = await tx.orderAmendment.create({
        data: {
          orderId: order.id,
          amendmentNo: count + 1,
          reason: data.reason,
          previousValues: JSON.parse(JSON.stringify(previousValues)),
          createdById: user.id,
        },
      });
      if (Object.keys(header).length > 0) await tx.order.update({ where: { id: order.id }, data: header });
      for (const ch of data.lines ?? []) {
        await tx.orderLine.update({
          where: { id: ch.lineId },
          data: { quantity: ch.quantity, unitPrice: ch.unitPrice, shipDate: ch.shipDate },
        });
        if (ch.cells) {
          await tx.orderLineQty.deleteMany({ where: { orderLineId: ch.lineId } });
          await tx.orderLineQty.createMany({
            data: ch.cells.map((c) => ({ orderLineId: ch.lineId, ...c })),
          });
        }
      }
      return a;
    });
    await this.audit({
      user, action: "UPDATE", entity: "Order", entityId: order.id,
      before: previousValues, after: data, reason: data.reason,
    });
    return amendment;
  }
}

export const orderService = new OrderService();