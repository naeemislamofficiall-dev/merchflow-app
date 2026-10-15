import { prisma } from "@/lib/prisma";
import { can, requireUser } from "@/lib/permissions";

export type SearchHit = { type: string; id: string; label: string; href: string };

const has = (q: string) => ({ contains: q, mode: "insensitive" as const });

class SearchService {
  // একটা সার্চ বক্স থেকে সব মডিউলে খোঁজে (যেমন "HM-1024")
  async search(query: string): Promise<SearchHit[]> {
    const user = await requireUser();
    const q = query.trim();
    if (q.length < 2) return [];
    const companyId = user.companyId;
    const take = 5;
    const jobs: Promise<SearchHit[]>[] = [];

    if (can(user, "buyer.view")) {
      jobs.push(
        prisma.buyer
          .findMany({ where: { companyId, OR: [{ code: has(q) }, { name: has(q) }] }, take })
          .then((rows) =>
            rows.map((r) => ({ type: "Buyer", id: r.id, label: `${r.code} · ${r.name}`, href: `/buyers/${r.id}` }))
          )
      );
    }
    if (can(user, "enquiry.view")) {
      jobs.push(
        prisma.enquiry
          .findMany({ where: { companyId, enquiryNo: has(q) }, take })
          .then((rows) =>
            rows.map((r) => ({ type: "Enquiry", id: r.id, label: r.enquiryNo, href: `/enquiries/${r.id}` }))
          )
      );
    }
    if (can(user, "style.view")) {
      jobs.push(
        prisma.style
          .findMany({ where: { companyId, OR: [{ styleNo: has(q) }, { name: has(q) }] }, take })
          .then((rows) =>
            rows.map((r) => ({ type: "Style", id: r.id, label: `${r.styleNo} · ${r.name}`, href: `/styles/${r.id}` }))
          )
      );
    }
    if (can(user, "order.view")) {
      jobs.push(
        prisma.order
          .findMany({ where: { companyId, OR: [{ orderNo: has(q) }, { buyerPoNo: has(q) }] }, take })
          .then((rows) =>
            rows.map((r) => ({ type: "Order", id: r.id, label: r.orderNo, href: `/orders/${r.id}` }))
          )
      );
    }
    if (can(user, "sample.view")) {
      jobs.push(
        prisma.sampleRequest
          .findMany({ where: { companyId, sampleNo: has(q) }, take })
          .then((rows) =>
            rows.map((r) => ({ type: "Sample", id: r.id, label: r.sampleNo, href: `/samples/${r.id}` }))
          )
      );
    }
    if (can(user, "supplier.view")) {
      jobs.push(
        prisma.supplier
          .findMany({ where: { companyId, OR: [{ code: has(q) }, { name: has(q) }] }, take })
          .then((rows) =>
            rows.map((r) => ({ type: "Supplier", id: r.id, label: `${r.code} · ${r.name}`, href: `/suppliers/${r.id}` }))
          )
      );
    }
    if (can(user, "material.view")) {
      jobs.push(
        prisma.material
          .findMany({ where: { companyId, OR: [{ code: has(q) }, { name: has(q) }] }, take })
          .then((rows) =>
            rows.map((r) => ({ type: "Material", id: r.id, label: `${r.code} · ${r.name}`, href: `/materials/${r.id}` }))
          )
      );
    }
    if (can(user, "pr.view")) {
      jobs.push(
        prisma.purchaseRequisition
          .findMany({ where: { companyId, prNo: has(q) }, take })
          .then((rows) =>
            rows.map((r) => ({ type: "PR", id: r.id, label: r.prNo, href: `/requisitions/${r.id}` }))
          )
      );
    }
    if (can(user, "po.view")) {
      jobs.push(
        prisma.purchaseOrder
          .findMany({ where: { companyId, poNo: has(q) }, take })
          .then((rows) =>
            rows.map((r) => ({ type: "PO", id: r.id, label: r.poNo, href: `/purchase-orders/${r.id}` }))
          )
      );
    }

    return (await Promise.all(jobs)).flat();
  }
}

export const searchService = new SearchService();