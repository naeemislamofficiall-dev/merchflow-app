import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { BusinessRuleError } from "@/lib/business-rules";
import { assertRecordInScope, found, listFilter } from "@/lib/service-helpers";
import { BaseService } from "./base.service";

const createSchema = z.object({
  type: z.enum(["SUPPLIER", "BUYER"]),
  partyId: z.string().min(1, "Select a supplier or a buyer"),
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email(),
  password: z.string().min(6, "Password must be at least 6 characters").max(100),
});

class PortalAdminService extends BaseService {
  async list() {
    const user = await this.guard("portaluser.view");
    return prisma.portalAccount.findMany({
      where: { ...(await listFilter(user)) },
      select: {
        id: true,
        type: true,
        createdAt: true,
        user: { select: { name: true, email: true, status: true, lastLoginAt: true } },
        supplier: { select: { code: true, name: true } },
        buyer: { select: { code: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  }

  // Form-er dropdown: shudhu nijer company-r active supplier/buyer
  async options() {
    const user = await this.guard("portaluser.create");
    const where = { ...(await listFilter(user)), status: "ACTIVE" as const };
    const [suppliers, buyers] = await Promise.all([
      prisma.supplier.findMany({ where, select: { id: true, code: true, name: true }, orderBy: { code: "asc" } }),
      prisma.buyer.findMany({ where, select: { id: true, code: true, name: true }, orderBy: { code: "asc" } }),
    ]);
    return { suppliers, buyers };
  }

  async create(input: unknown) {
    const admin = await this.guard("portaluser.create");
    const d = createSchema.parse(input);
    const email = d.email.toLowerCase();

    let companyId: string;
    let supplierId: string | null = null;
    let buyerId: string | null = null;
    if (d.type === "SUPPLIER") {
      const s = found(await prisma.supplier.findUnique({ where: { id: d.partyId } }), "Supplier");
      await assertRecordInScope(admin, s.companyId);
      if (s.status !== "ACTIVE") throw new BusinessRuleError("This supplier is not active");
      companyId = s.companyId;
      supplierId = s.id;
    } else {
      const b = found(await prisma.buyer.findUnique({ where: { id: d.partyId } }), "Buyer");
      await assertRecordInScope(admin, b.companyId);
      if (b.status !== "ACTIVE") throw new BusinessRuleError("This buyer is not active");
      companyId = b.companyId;
      buyerId = b.id;
    }

    if (await prisma.user.findUnique({ where: { email } })) {
      throw new BusinessRuleError("A user with this email already exists");
    }

    // Portal role-e kono permission nai
    const roleName = d.type === "SUPPLIER" ? "Supplier Portal" : "Buyer Portal";
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName, description: "Portal user (no internal permissions)" },
    });

    const passwordHash = await bcrypt.hash(d.password, 10);
    const created = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: { email, name: d.name, passwordHash, roleId: role.id, scope: "OWN", companyId, status: "ACTIVE" },
      });
      await tx.portalAccount.create({
        data: { userId: u.id, companyId, type: d.type, supplierId, buyerId, createdById: admin.id },
      });
      return u;
    });

    await this.audit({
      user: admin,
      action: "CREATE",
      entity: "User",
      entityId: created.id,
      after: { email, name: d.name, portalType: d.type, supplierId, buyerId },
      reason: "Portal user created by admin",
    });
    return { id: created.id };
  }
}

export const portalAdminService = new PortalAdminService();