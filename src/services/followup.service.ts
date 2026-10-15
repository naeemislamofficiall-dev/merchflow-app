import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { BusinessRuleError } from "@/lib/business-rules";
import { delayAlertMessage, delayDays as calcDelayDays } from "@/lib/calculations";
import { assertRecordInScope, found, listFilter } from "@/lib/service-helpers";
import { notify } from "./notification.service";
import { BaseService } from "./base.service";

const contactSchema = z.object({
  followUpId: z.string().min(1),
  method: z.string().min(1).max(30), // phone, email, whatsapp, visit
  contactPerson: z.string().max(100).optional(),
  notes: z.string().max(1000).optional(),
});

const createSchema = z.object({
  poId: z.string().min(1),
  supplierPromisedDate: z.coerce.date(),
  latestPromisedDate: z.coerce.date().optional(),
  remarks: z.string().max(500).optional(),
});

const OPEN_PO = ["SENT", "ACKNOWLEDGED", "PARTIAL_RECEIPT"] as const;

class FollowUpService extends BaseService {
  private async load(followUpId: string) {
    const user = await this.guard("followup.view");
    const f = found(
      await prisma.poFollowUp.findUnique({ where: { id: followUpId }, include: { po: true } }),
      "Follow-up"
    );
    await assertRecordInScope(user, f.po.companyId);
    return { user, f };
  }

  // খোলা প্রতিটা PO-র follow-up, দেরির দিন সহ
  async listOpen() {
    const user = await this.guard("followup.view");
    const rows = await prisma.poFollowUp.findMany({
      where: {
        actualReceiptDate: null,
        po: { ...(await listFilter(user)), status: { in: [...OPEN_PO] } },
      },
      include: { po: { include: { supplier: { select: { name: true } } } }, contacts: true },
      orderBy: { latestPromisedDate: "asc" },
    });
    return rows.map((f) => ({ ...f, liveDelayDays: calcDelayDays(f.latestPromisedDate) }));
  }

  async get(id: string) {
    await this.load(id);
    return prisma.poFollowUp.findUnique({
      where: { id },
      include: { po: { include: { supplier: true } }, contacts: { orderBy: { contactedAt: "desc" } } },
    });
  }

  // সাধারণত PO পাঠানোর সময় নিজে নিজে হয়। হাতে বানাতে হলে এটা।
  async create(input: unknown) {
    const user = await this.guard("followup.create");
    const data = createSchema.parse(input);
    const po = found(await prisma.purchaseOrder.findUnique({ where: { id: data.poId } }), "PO");
    await assertRecordInScope(user, po.companyId);
    const row = await prisma.poFollowUp.create({
      data: {
        poId: data.poId,
        supplierPromisedDate: data.supplierPromisedDate,
        latestPromisedDate: data.latestPromisedDate ?? data.supplierPromisedDate,
        remarks: data.remarks,
      },
    });
    await this.audit({ user, action: "CREATE", entity: "PoFollowUp", entityId: row.id, after: row });
    return row;
  }

  // যোগাযোগের ইতিহাস
  async addContact(input: unknown) {
    const user = await this.guard("followup.edit");
    const data = contactSchema.parse(input);
    await this.load(data.followUpId);
    const row = await prisma.poFollowUpContact.create({ data: { ...data, createdById: user.id } });
    await this.audit({ user, action: "CREATE", entity: "PoFollowUpContact", entityId: row.id, after: row });
    return row;
  }

  // Supplier নতুন তারিখ দিলে
  async revisePromise(id: string, latestPromisedDate: Date, remarks?: string) {
    const user = await this.guard("followup.edit");
    const { f } = await this.load(id);
    if (f.actualReceiptDate) throw new BusinessRuleError("Goods are already received");
    const row = await prisma.poFollowUp.update({
      where: { id },
      data: { latestPromisedDate, remarks: remarks ?? f.remarks, delayDays: calcDelayDays(latestPromisedDate) },
    });
    await this.audit({ user, action: "UPDATE", entity: "PoFollowUp", entityId: id, before: f, after: row });
    return row;
  }

  async escalate(id: string, note: string) {
    const user = await this.guard("followup.edit");
    if (!note || note.trim().length < 3) throw new BusinessRuleError("Escalation note is required");
    const { f } = await this.load(id);
    const row = await prisma.poFollowUp.update({
      where: { id },
      data: { isEscalated: true, escalationNote: note },
    });
    await this.audit({ user, action: "UPDATE", entity: "PoFollowUp", entityId: id, before: f, after: row, reason: note });
    return row;
  }

  // আসল মাল আসার তারিখ। ধাপ ঙ-র মাল গ্রহণ (GRN) থেকে এটা ডাকা হবে।
  async markReceived(id: string, date: Date = new Date()) {
    const user = await this.guard("followup.edit");
    const { f } = await this.load(id);
    const row = await prisma.poFollowUp.update({
      where: { id },
      data: { actualReceiptDate: date, delayDays: calcDelayDays(f.latestPromisedDate, date) },
    });
    await this.audit({ user, action: "UPDATE", entity: "PoFollowUp", entityId: id, before: f, after: row });
    return row;
  }

  // দেরির দিন নতুন করে হিসাব আর "Supplier is 4 days late..." সতর্কতা।
  // ধাপ ড-তে Background job প্রতিদিন এটা চালাবে।
  async refreshDelays() {
    const user = await this.guard("followup.edit");
    const open = await prisma.poFollowUp.findMany({
      where: {
        actualReceiptDate: null,
        po: { ...(await listFilter(user)), status: { in: [...OPEN_PO] } },
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

    let alerts = 0;
    for (const f of open) {
      const days = calcDelayDays(f.latestPromisedDate);
      if (days === f.delayDays) continue;
      await prisma.poFollowUp.update({ where: { id: f.id }, data: { delayDays: days } });

      if (days > 0 && f.po.createdById) {
        const line = f.po.lines[0];
        await notify({
          companyId: f.po.companyId,
          recipientId: f.po.createdById,
          type: "SUPPLIER_LATE",
          title: "Supplier delay",
          message: delayAlertMessage(
            f.po.supplier.name,
            line?.material.name ?? "material",
            days,
            line?.order?.orderNo ?? f.po.poNo
          ),
          href: `/procurement/po/${f.po.id}`,
          entityType: "PurchaseOrder",
          entityId: f.po.id,
        });
        alerts++;
      }
    }
    return { checked: open.length, alerts };
  }
}

export const followUpService = new FollowUpService();