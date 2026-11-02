import "dotenv/config";
import { prisma } from "@/lib/prisma";

// Portal isolation test-er jonno dwitiyo demo buyer (DEMO-HM-er company-te)
async function main() {
  const base = await prisma.buyer.findFirst({ where: { code: "DEMO-HM" }, select: { companyId: true } });
  if (!base) {
    console.error("DEMO-HM buyer not found");
    process.exit(1);
  }
  const exists = await prisma.buyer.findFirst({ where: { companyId: base.companyId, code: "DEMO-BUYER2" } });
  if (exists) {
    console.log("DEMO-BUYER2 already exists");
  } else {
    await prisma.buyer.create({
      data: { companyId: base.companyId, code: "DEMO-BUYER2", name: "Second Demo Buyer" },
    });
    console.log("Created buyer DEMO-BUYER2");
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});