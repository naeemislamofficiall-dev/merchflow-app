import { prisma } from "@/lib/prisma";
import { delayAlertMessage, delayDays } from "@/lib/calculations";
import { can } from "@/lib/permissions";
import { delegationCovers } from "@/lib/approval-calc";
import { listFilter, startOfDay } from "@/lib/service-helpers";
import { BaseService } from "./base.service";
import { factoryWhere } from "@/lib/scope";
import { toDateOnly } from "./currency.service";
import { ppcService } from "./ppc.service";

export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export type Alert = {
  id: string;
  severity: Severity;
  category: string;
  title: string;
  message: string;
  href: string;
  entityType: string;
  entityId: string;
  since: Date;
};

const ORDER: Record<Severity, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
const isClosed = (s: string) => s === "COMPLETED" || s === "WAIVED";
const BELOW_TARGET_PCT = 85;

class AlertService extends BaseService {
  // সব alert সরাসরি ডাটা থেকে হিসাব হয়, তাই সবসময় তাজা।
  // Failed final inspection, Production below target, Certificate expiring
  // আসবে Quality, Production, Compliance মডিউলের সাথে।
  async list(filter: { severity?: Severity } = {}): Promise<Alert[]> {
    const user = await this.guard("alert.view");
    const where = await listFilter(user);
    const today = startOfDay(new Date());
    const alerts: Alert[] = [];

    // T&A plan: shipment risk (CRITICAL) আর milestone overdue (HIGH)
    const plans = await prisma.tnaPlan.findMany({
      where: {
        ...where,
        OR: [{ orderId: null }, { order: { status: { in: ["DRAFT", "CONFIRMED", "IN_PRODUCTION"] } } }],
      },
      include: {
        tasks: { orderBy: { sortOrder: "asc" } },
        style: { select: { styleNo: true } },
        order: { select: { orderNo: true } },
      },
    });
    for (const p of plans) {
      const ref = p.order?.orderNo ?? p.style.styleNo;
      const open = p.tasks.filter((t) => !isClosed(t.status));
      const ship = startOfDay(p.shipDate);
      const last = p.tasks[p.tasks.length - 1];
      const atRisk =
        open.some((t) => startOfDay(t.revisedDate ?? t.plannedDate) > ship) ||
        (!!last && !isClosed(last.status) && startOfDay(last.revisedDate ?? last.plannedDate) < today);
      if (atRisk && open.length > 0) {
        alerts.push({
          id: `shiprisk:${p.id}`, severity: "CRITICAL", category: "Shipment",
          title: "Shipment at risk",
          message: `${ref}: T&A delays may miss the ship date`,
          href: `/tna/${p.id}`, entityType: "TnaPlan", entityId: p.id, since: p.shipDate,
        });
      }
      for (const t of open) {
        const due = startOfDay(t.revisedDate ?? t.plannedDate);
        if (due < today) {
          alerts.push({
            id: `tna:${t.id}`, severity: "HIGH", category: "T&A",
            title: "T&A milestone overdue",
            message: `${ref}: ${t.name} is ${delayDays(due, today)} day(s) late`,
            href: `/tna/${p.id}`, entityType: "TnaTask", entityId: t.id, since: due,
          });
        }
      }
    }

    // উৎপাদনে থাকা অর্ডারে মালের ঘাটতি, কিন্তু PR হয়নি (CRITICAL)
    const shortages = await prisma.mrpRun.findMany({
      where: {
        ...where,
        order: { status: "IN_PRODUCTION" },
        purchaseRequisitions: { none: {} },
        lines: { some: { netQty: { gt: 0 } } },
      },
      include: {
        order: { select: { orderNo: true } },
        lines: { where: { netQty: { gt: 0 } }, include: { bomItem: { select: { itemName: true } } } },
      },
    });
    for (const m of shortages) {
      alerts.push({
        id: `shortage:${m.id}`, severity: "CRITICAL", category: "Material",
        title: "Material shortage blocking production",
        message: `${m.order?.orderNo ?? "Order"}: short on ${m.lines.map((l) => l.bomItem.itemName).join(", ")}`,
        href: `/mrp/${m.id}`, entityType: "MrpRun", entityId: m.id, since: m.runDate,
      });
    }

    // Supplier late (HIGH)
    const late = await prisma.poFollowUp.findMany({
      where: {
        actualReceiptDate: null,
        latestPromisedDate: { lt: today },
        po: { ...where, status: { in: ["SENT", "ACKNOWLEDGED", "PARTIAL_RECEIPT"] } },
      },
      include: {
        po: {
          include: {
            supplier: true,
            lines: { include: { material: true, order: true }, take: 1 },
          },
        },
      },
    });
    for (const f of late) {
      const line = f.po.lines[0];
      alerts.push({
        id: `late:${f.id}`, severity: "HIGH", category: "Procurement",
        title: "Supplier late",
        message: delayAlertMessage(
          f.po.supplier.name,
          line?.material.name ?? "material",
          delayDays(f.latestPromisedDate, today),
          line?.order?.orderNo ?? f.po.poNo
        ),
        href: `/procurement/po/${f.po.id}`, entityType: "PurchaseOrder", entityId: f.po.id,
        since: f.latestPromisedDate,
      });
    }

    // Sample overdue (MEDIUM)
    const samples = await prisma.sampleRequest.findMany({
      where: { ...where, dueDate: { lt: today }, status: { notIn: ["APPROVED", "REJECTED", "CANCELLED"] } },
      include: { style: { select: { styleNo: true } } },
    });
    for (const s of samples) {
      alerts.push({
        id: `sample:${s.id}`, severity: "MEDIUM", category: "Sample",
        title: "Sample overdue",
        message: `${s.sampleNo} (${s.style.styleNo}) was due ${s.dueDate!.toISOString().slice(0, 10)}`,
        href: `/samples/${s.id}`, entityType: "SampleRequest", entityId: s.id, since: s.dueDate!,
      });
    }

       // আমার (বা আমার delegate করা) অনুমোদনের অপেক্ষায় (MEDIUM, escalate হলে HIGH)
    const myDelegations = await prisma.approvalDelegation.findMany({
      where: { companyId: user.companyId, toUserId: user.id, isActive: true },
      include: { fromUser: { select: { roleId: true, status: true } } },
    });
    const roleIds = new Set([
      user.roleId,
      ...myDelegations
        .filter((d) => d.fromUser.status === "ACTIVE" && delegationCovers(d, new Date()))
        .map((d) => d.fromUser.roleId),
    ]);
    const pending = await prisma.approvalRequest.findMany({
      where: { ...where, status: "PENDING" },
      include: { workflow: { include: { steps: true } }, escalations: true },
    });
    for (const a of pending) {
      const step = a.workflow?.steps.find((s) => s.stepOrder === a.currentStep);
      if (step && (roleIds.has(step.approverRoleId) || can(user, "*"))) {
        const escalated = a.escalations.some((e) => e.stepOrder === a.currentStep);
        alerts.push({
          id: `approval:${a.id}`, severity: escalated ? "HIGH" : "MEDIUM", category: "Approval",
          title: escalated ? "Approval overdue" : "Approval pending", message: a.title,
          href: `/approvals/${a.id}`, entityType: "ApprovalRequest", entityId: a.id, since: a.requestedAt,
        });
      }
    }

        // Failed final inspection (CRITICAL): অর্ডারের সর্বশেষ Final AQL ফেল, override নেই, অর্ডার এখনো শেষ হয়নি
    const finals = await prisma.aqlInspection.findMany({
      where: { ...where, stage: "FINAL" },
      orderBy: { createdAt: "desc" },
    });
    const latest = new Map<string, (typeof finals)[number]>();
    for (const f of finals) if (!latest.has(f.orderId)) latest.set(f.orderId, f);
    const failed = [...latest.values()].filter((f) => f.result === "FAIL" && !f.overrideById);
    if (failed.length > 0) {
      const orders = await prisma.order.findMany({
        where: { id: { in: failed.map((f) => f.orderId) }, status: { notIn: ["FULLY_SHIPPED", "CLOSED", "CANCELLED"] } },
        select: { id: true, orderNo: true },
      });
      for (const o of orders) {
        const f = latest.get(o.id)!;
        alerts.push({
          id: `finalfail:${f.id}`, severity: "CRITICAL", category: "Quality",
          title: "Failed final inspection",
          message: `${o.orderNo}: ${f.inspectionNo} failed. Shipment is blocked until an authorized override`,
          href: `/quality/aql/${f.id}`, entityType: "AqlInspection", entityId: f.id,
          since: f.inspectedAt ?? f.createdAt,
        });
      }
    }

    // Production below target (HIGH): আজকের লাইন ধরে output ÷ target
    const todayLogs = await prisma.sewingLog.groupBy({
      by: ["lineId", "productionOrderId"],
      _sum: { target: true, output: true },
      where: { ...where, ...factoryWhere(await this.scopeOf(user)), logDate: toDateOnly(new Date()) },
    });
    const weak = todayLogs.filter((l) => (l._sum.target ?? 0) > 0 && ((l._sum.output ?? 0) / (l._sum.target ?? 1)) * 100 < BELOW_TARGET_PCT);
    if (weak.length > 0) {
      const [lines, pos] = await Promise.all([
        prisma.line.findMany({ where: { id: { in: weak.map((w) => w.lineId) } }, select: { id: true, code: true } }),
        prisma.productionOrder.findMany({ where: { id: { in: weak.map((w) => w.productionOrderId) } }, select: { id: true, productionNo: true } }),
      ]);
      for (const w of weak) {
        const t = w._sum.target ?? 0;
        const gap = Math.round((1 - (w._sum.output ?? 0) / t) * 100);
        alerts.push({
          id: `belowtarget:${w.lineId}:${w.productionOrderId}`, severity: "HIGH", category: "Production",
          title: "Production below target",
          message: `Line ${lines.find((l) => l.id === w.lineId)?.code ?? ""} (${pos.find((p) => p.id === w.productionOrderId)?.productionNo ?? ""}): output ${gap}% below target today`,
          href: `/sewing`, entityType: "ProductionOrder", entityId: w.productionOrderId, since: new Date(),
        });
      }
    }
    
     // Line overloaded (HIGH): PPC allocation line-er capacity chharale
    for (const o of await ppcService.overloadAlerts()) {
      alerts.push({
        id: `ppcover:${o.lineId}:${o.dateKey}`, severity: "HIGH", category: "Production",
        title: "Line overloaded",
        message: `Line ${o.lineCode} is overloaded on ${o.dateKey}: ${o.plannedMinutes} min planned, ${o.availableMinutes} available`,
        href: `/ppc?factoryId=${o.factoryId}&from=${o.dateKey}`, entityType: "Line", entityId: o.lineId,
        since: new Date(`${o.dateKey}T00:00:00.000Z`),
      });
    }

    // Certificate expired (HIGH) ba 30 diner moddhe expire hobe (MEDIUM)
    {
      const horizon = new Date(today.getTime() + 30 * 86_400_000);
      const certs = await prisma.certificate.findMany({
        where: { companyId: user.companyId, expiryDate: { lt: horizon } },
        select: { id: true, typeId: true, expiryDate: true },
        orderBy: { expiryDate: "asc" },
        take: 200,
      });
      const types = await prisma.certificateType.findMany({
        where: { id: { in: certs.map((c) => c.typeId).filter((x): x is string => !!x) } },
        select: { id: true, code: true },
      });
      const typeCode = new Map(types.map((t) => [t.id, t.code]));
      for (const c of certs) {
        if (!c.expiryDate) continue;
        const expired = c.expiryDate < today;
        const label = (c.typeId && typeCode.get(c.typeId)) || "Certificate";
        alerts.push({
          id: `cert:${c.id}`,
          severity: expired ? "HIGH" : "MEDIUM",
          category: "Compliance",
          title: expired ? "Certificate expired" : "Certificate expiring soon",
          message: `${label} ${expired ? "expired on" : "expires on"} ${c.expiryDate.toISOString().slice(0, 10)}`,
          href: "/compliance",
          entityType: "Certificate",
          entityId: c.id,
          since: c.expiryDate,
        });
      }
    }

    return alerts
      .filter((a) => !filter.severity || a.severity === filter.severity)
      .sort((a, b) => ORDER[a.severity] - ORDER[b.severity] || a.since.getTime() - b.since.getTime());
  }

  async summary() {
    const list = await this.list();
    const count = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 } as Record<Severity, number>;
    for (const a of list) count[a.severity]++;
    return { total: list.length, ...count };
  }
}

export const alertService = new AlertService();