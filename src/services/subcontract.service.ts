import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import type { SubcontractStatus } from "@/generated/prisma/enums";
import { BusinessRuleError, assertRejectionReason } from "@/lib/business-rules";
import { nextSubcontractNo } from "@/lib/numbering";
import { subcontractBalance } from "@/lib/production-calc";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/permissions";
import { assertFactoryInScope, factoryWhere } from "@/lib/scope";
import { assertRecordInScope, found, listFilter } from "@/lib/service-helpers";
import { assertTransition, subcontractTransitions } from "@/lib/status-rules";
import { TX_OPTIONS, advisoryLock } from "@/lib/stock";
import { BaseService } from "./base.service";
import { toDateOnly } from "./currency.service";

const PROCESSES = ["PRINTING", "EMBROIDERY", "WASHING"] as const;
const OPEN_STATUSES = ["SENT", "VENDOR_RECEIVED", "IN_PROCESS", "RETURNED"];

const sendSchema = z.object({
  productionOrderId: z.string().min(1),
  vendorId: z.string().min(1),
  process: z.enum(PROCESSES),
  challanNo: z.string().min(1).max(60),
  sentQty: z.number().int().positive(),
  rate: z.number().nonnegative(), // প্রতি পিসের রেট
  currency: z.string().length(3).optional(), // না দিলে ভেন্ডরের মুদ্রা
  sentDate: z.coerce.date(),
  dueDate: z.coerce.date(),
  remarks: z.string().max(500).optional(),
});

const returnSchema = z.object({
  subcontractId: z.string().min(1),
  receiptDate: z.coerce.date(),
  challanNo: z.string().max(60).optional(),
  receivedQty: z.number().int().nonnegative(),
  damageQty: z.number().int().nonnegative().optional(),
  rejectQty: z.number().int().nonnegative().optional(),
  remarks: z.string().max(500).optional(),
});

type Qtys = { sentQty: number; receivedQty: number; damageQty: number; rejectQty: number };

function balanceOf(r: Qtys) {
  return subcontractBalance({ sent: r.sentQty, received: r.receivedQty, damage: r.damageQty, reject: r.rejectQty });
}

function decorate<T extends Qtys & { status: string; dueDate: Date }>(r: T) {
  const balanceQty = balanceOf(r);
  const open = OPEN_STATUSES.includes(r.status);
  return { ...r, balanceQty, isOverdue: open && balanceQty > 0 && r.dueDate < toDateOnly(new Date()) };
}

class SubcontractService extends BaseService {
  private async load(user: SessionUser, id: string) {
    const row = found(await prisma.subcontractOrder.findUnique({ where: { id } }), "Subcontract order");
    await assertRecordInScope(user, row.companyId);
    assertFactoryInScope(await this.scopeOf(user), row.factoryId);
    return row;
  }

  // ---------- দেখা ----------

  async list(
    filter: { status?: string; productionOrderId?: string; vendorId?: string; overdueOnly?: boolean } = {}
  ) {
    const user = await this.guard("subcontract.view");
    const scope = await this.scopeOf(user);
    const rows = await prisma.subcontractOrder.findMany({
      where: {
        ...(await listFilter(user)),
        ...factoryWhere(scope),
        ...(filter.status ? { status: filter.status as SubcontractStatus } : {}),
        ...(filter.productionOrderId ? { productionOrderId: filter.productionOrderId } : {}),
        ...(filter.vendorId ? { vendorId: filter.vendorId } : {}),
      },
      include: {
        vendor: { select: { code: true, name: true } },
        productionOrder: { select: { productionNo: true } },
      },
      orderBy: { dueDate: "asc" },
    });
    const out = rows.map(decorate);
    return filter.overdueOnly ? out.filter((r) => r.isOverdue) : out;
  }

  async get(id: string) {
    const user = await this.guard("subcontract.view");
    await this.load(user, id);
    const row = await prisma.subcontractOrder.findUnique({
      where: { id },
      include: {
        vendor: { select: { code: true, name: true } },
        productionOrder: { select: { productionNo: true } },
        receipts: { orderBy: { receiptDate: "asc" } },
      },
    });
    const d = decorate(row!);
    // ফেরত পাওয়া ভালো পিসের মজুরি
    return { ...d, amount: Number(d.rate) * d.receivedQty };
  }

  // ---------- Send ----------

  async send(input: unknown) {
    const user = await this.guard("subcontract.create");
    const d = sendSchema.parse(input);
    if (d.dueDate < d.sentDate) throw new BusinessRuleError("Due date cannot be before the sent date");

    const po = found(await prisma.productionOrder.findUnique({ where: { id: d.productionOrderId } }), "Production order");
    await assertRecordInScope(user, po.companyId);
    assertFactoryInScope(await this.scopeOf(user), po.factoryId);
    if (po.status !== "RELEASED" && po.status !== "IN_PROGRESS") {
      throw new BusinessRuleError("Goods can be sent only for a released or running production order");
    }

    // স্পেক ২৬: প্রসেসটা এই অর্ডারের route-এ থাকতে হবে
    const onRoute = await prisma.productionRouteStep.count({
      where: { routeId: po.routeId, process: d.process },
    });
    if (onRoute === 0) {
      throw new BusinessRuleError(`${d.process} is not a step in the route of this production order`);
    }

    const vendor = found(await prisma.supplier.findUnique({ where: { id: d.vendorId } }), "Vendor");
    if (vendor.companyId !== user.companyId || vendor.status !== "ACTIVE") {
      throw new BusinessRuleError("Vendor not found or not active");
    }

    const allowed = Math.ceil(po.quantity * (1 + Number(po.allowancePct) / 100));

    const row = await prisma.$transaction(async (tx) => {
      await advisoryLock(tx, `seq:subcontract:${user.companyId}`);
      await advisoryLock(tx, `subcon:${po.id}:${d.process}`);

      const dup = await tx.subcontractOrder.count({
        where: { companyId: user.companyId, challanNo: d.challanNo },
      });
      if (dup > 0) throw new BusinessRuleError("This challan number is already used");

      const sent = await tx.subcontractOrder.aggregate({
        _sum: { sentQty: true },
        where: { productionOrderId: po.id, process: d.process, status: { not: "CANCELLED" } },
      });
      const already = sent._sum.sentQty ?? 0;
      if (already + d.sentQty > allowed) {
        throw new BusinessRuleError(
          `Already sent ${already} for ${d.process}; with ${d.sentQty} more it would pass the allowed ${allowed}`
        );
      }

      return tx.subcontractOrder.create({
        data: {
          companyId: user.companyId,
          factoryId: po.factoryId,
          subcontractNo: await nextSubcontractNo(user.companyId),
          productionOrderId: po.id,
          vendorId: d.vendorId,
          process: d.process,
          challanNo: d.challanNo,
          sentQty: d.sentQty,
          rate: d.rate,
          currency: (d.currency ?? vendor.currency).toUpperCase(),
          sentDate: toDateOnly(d.sentDate),
          dueDate: toDateOnly(d.dueDate),
          remarks: d.remarks,
          createdById: user.id,
        },
      });
    }, TX_OPTIONS);

    await this.audit({ user, action: "CREATE", entity: "SubcontractOrder", entityId: row.id, after: row });
    return row;
  }

  // ---------- অবস্থা বদল ----------

  private async step(
    id: string,
    to: SubcontractStatus,
    permission: string,
    data: Prisma.SubcontractOrderUncheckedUpdateInput,
    opts: { reason?: string; precheck?: (row: Qtys) => void } = {}
  ) {
    const user = await this.guard(permission);
    const row = await this.load(user, id);
    assertTransition(subcontractTransitions, row.status, to);
    opts.precheck?.(row);
    const saved = await prisma.subcontractOrder.update({ where: { id }, data: { status: to, ...data } });
    await this.audit({
      user,
      action: "UPDATE",
      entity: "SubcontractOrder",
      entityId: id,
      before: { status: row.status },
      after: { status: saved.status },
      reason: opts.reason,
    });
    return saved;
  }

  // ভেন্ডর মাল বুঝে পেয়েছে
  async confirmVendorReceipt(id: string) {
    return this.step(id, "VENDOR_RECEIVED", "subcontract.receive", { vendorReceivedAt: new Date() });
  }

  async startProcess(id: string) {
    return this.step(id, "IN_PROCESS", "subcontract.receive", { processStartedAt: new Date() });
  }

  // মাল ফেরত (আংশিকও হতে পারে)। Damage ও Rejection আলাদা লেখা হয়।
  async receiveReturn(input: unknown) {
    const user = await this.guard("subcontract.receive");
    const d = returnSchema.parse(input);
    const old = await this.load(user, d.subcontractId);
    const damage = d.damageQty ?? 0;
    const reject = d.rejectQty ?? 0;
    if (d.receivedQty + damage + reject <= 0) throw new BusinessRuleError("Enter at least one quantity");

    const row = await prisma.$transaction(async (tx) => {
      await advisoryLock(tx, `subcontract:${old.id}`);
      const cur = found(await tx.subcontractOrder.findUnique({ where: { id: old.id } }), "Subcontract order");
      if (cur.status !== "IN_PROCESS" && cur.status !== "RETURNED") {
        throw new BusinessRuleError("Goods can be received only while the order is in process or partly returned");
      }
      const received = cur.receivedQty + d.receivedQty;
      const damaged = cur.damageQty + damage;
      const rejected = cur.rejectQty + reject;
      if (received + damaged + rejected > cur.sentQty) {
        throw new BusinessRuleError(
          `Returned total ${received + damaged + rejected} would be more than the sent quantity ${cur.sentQty}`
        );
      }
      await tx.subcontractReceipt.create({
        data: {
          subcontractId: cur.id,
          receiptDate: toDateOnly(d.receiptDate),
          challanNo: d.challanNo,
          receivedQty: d.receivedQty,
          damageQty: damage,
          rejectQty: reject,
          remarks: d.remarks,
          createdById: user.id,
        },
      });
      return tx.subcontractOrder.update({
        where: { id: cur.id },
        data: { receivedQty: received, damageQty: damaged, rejectQty: rejected, status: "RETURNED" },
      });
    }, TX_OPTIONS);

    await this.audit({
      user,
      action: "UPDATE",
      entity: "SubcontractOrder",
      entityId: row.id,
      before: { status: old.status, receivedQty: old.receivedQty, damageQty: old.damageQty, rejectQty: old.rejectQty },
      after: { status: row.status, receivedQty: row.receivedQty, damageQty: row.damageQty, rejectQty: row.rejectQty },
    });
    return decorate(row);
  }

  // QC-র ধাপ পেরোনো (বিস্তারিত QC ধাপ জ-তে আসবে)
  async completeQc(id: string) {
    return this.step(id, "QC_DONE", "subcontract.receive", { qcDoneAt: new Date() }, {
      precheck: (r) => {
        if (r.receivedQty + r.damageQty + r.rejectQty === 0) {
          throw new BusinessRuleError("Record at least one return before QC");
        }
      },
    });
  }

  // Balance বাকি থাকলে কারণ লাগবে
  async close(id: string, reason?: string) {
    return this.step(id, "CLOSED", "subcontract.close", { closedAt: new Date(), closeReason: reason ?? null }, {
      reason,
      precheck: (r) => {
        if (balanceOf(r) > 0 && (!reason || reason.trim().length < 3)) {
          throw new BusinessRuleError(`Balance is ${balanceOf(r)} pieces. A reason is required to close`);
        }
      },
    });
  }

  // ভেন্ডর মাল বুঝে পাওয়ার আগে পর্যন্ত বাতিল করা যায়
  async cancel(id: string, reason: string) {
    assertRejectionReason(reason);
    return this.step(id, "CANCELLED", "subcontract.create", { cancelReason: reason }, { reason });
  }
}

export const subcontractService = new SubcontractService();