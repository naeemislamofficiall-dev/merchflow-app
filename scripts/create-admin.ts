import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";

async function main() {
  const company = await prisma.company.upsert({
    where: { code: "MAIN" },
    update: {},
    create: { code: "MAIN", legalName: "Merchflow Demo Company" },
  });

  await prisma.factory.upsert({
    where: { companyId_code: { companyId: company.id, code: "F01" } },
    update: {},
    create: { companyId: company.id, code: "F01", name: "Main Factory" },
  });

  const role = await prisma.role.upsert({
    where: { id: "admin-role" },
    update: {},
    create: { id: "admin-role", name: "Admin" },
  });

  const perm = await prisma.permission.upsert({
    where: { key: "*" },
    update: {},
    create: { key: "*", label: "All access" },
  });

  const link = await prisma.rolePermission.findFirst({
    where: { roleId: role.id, permissionId: perm.id },
  });
  if (!link) {
    await prisma.rolePermission.create({
      data: { roleId: role.id, permissionId: perm.id },
    });
  }

   const passwordHash = await bcrypt.hash("Admin@12345", 10);
  await prisma.user.upsert({
    where: { email: "admin@merchflow.local" },
    update: {},
    create: {
      email: "admin@merchflow.local",
      name: "Admin",
      passwordHash,
      companyId: company.id,
      roleId: role.id,
      status: "ACTIVE",
    },
  });

  console.log("Done. Login: admin@merchflow.local / Admin@12345");
}

main().finally(() => prisma.$disconnect());