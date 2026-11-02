import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

// Usage: npx tsx scripts/create-portal-user.ts <supplier|buyer> <CODE> <email> <password> [name]
// Temporary helper. Admin page (D3) ashle seta-i main way hobe.

async function main() {
  const [kind, code, emailRaw, password, nameArg] = process.argv.slice(2);
  if ((kind !== "supplier" && kind !== "buyer") || !code || !emailRaw || !password) {
    console.error("Usage: npx tsx scripts/create-portal-user.ts <supplier|buyer> <CODE> <email> <password> [name]");
    process.exit(1);
  }
  if (password.length < 6) {
    console.error("Password must be at least 6 characters");
    process.exit(1);
  }
  const email = emailRaw.toLowerCase();

  let companyId = "";
  let supplierId: string | null = null;
  let buyerId: string | null = null;
  let partyName = "";

  if (kind === "supplier") {
    const list = await prisma.supplier.findMany({ where: { code }, select: { id: true, companyId: true, name: true } });
    if (list.length !== 1) {
      console.error(`Supplier code "${code}": ${list.length} match found (need exactly 1)`);
      process.exit(1);
    }
    supplierId = list[0].id;
    companyId = list[0].companyId;
    partyName = list[0].name;
  } else {
    const list = await prisma.buyer.findMany({ where: { code }, select: { id: true, companyId: true, name: true } });
    if (list.length !== 1) {
      console.error(`Buyer code "${code}": ${list.length} match found (need exactly 1)`);
      process.exit(1);
    }
    buyerId = list[0].id;
    companyId = list[0].companyId;
    partyName = list[0].name;
  }

  if (await prisma.user.findUnique({ where: { email } })) {
    console.error(`User ${email} already exists`);
    process.exit(1);
  }

  // Portal role-e kono permission nai: internal permission kokhono jabe na
  const roleName = kind === "supplier" ? "Supplier Portal" : "Buyer Portal";
  const role = await prisma.role.upsert({
    where: { name: roleName },
    update: {},
    create: { name: roleName, description: "Portal user (no internal permissions)" },
  });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.$transaction(async (tx) => {
    const u = await tx.user.create({
      data: { email, name: nameArg || partyName, passwordHash, roleId: role.id, scope: "OWN", companyId, status: "ACTIVE" },
    });
    await tx.portalAccount.create({
      data: {
        userId: u.id,
        companyId,
        type: kind === "supplier" ? "SUPPLIER" : "BUYER",
        supplierId,
        buyerId,
      },
    });
    return u;
  });

  console.log(`Created ${kind} portal user ${user.email} for "${partyName}"`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});