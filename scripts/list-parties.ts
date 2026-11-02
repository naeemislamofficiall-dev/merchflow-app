import "dotenv/config";
import { prisma } from "@/lib/prisma";

async function main() {
  const sup = await prisma.supplier.findMany({ select: { code: true, name: true }, orderBy: { code: "asc" }, take: 20 });
  const buy = await prisma.buyer.findMany({ select: { code: true, name: true }, orderBy: { code: "asc" }, take: 20 });
  console.log("SUPPLIERS"); console.table(sup);
  console.log("BUYERS"); console.table(buy);
  await prisma.$disconnect();
}
main();