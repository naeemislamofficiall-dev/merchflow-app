/**
 * Demo notifications for the admin user.
 * Run:  npx tsx prisma/seed-notifications.ts
 * Safe: it only removes/recreates notifications whose entityId starts with "SEED-".
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

try {
  (process as any).loadEnvFile?.(".env");
} catch {
  /* .env missing: rely on real environment */
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const HOUR = 3_600_000;

async function main() {
  const company = await prisma.company.findFirst({ orderBy: { createdAt: "asc" } });
  if (!company) throw new Error("No company found.");

  const admin =
    (await prisma.user.findFirst({ where: { companyId: company.id, email: "admin@merchflow.local" } })) ??
    (await prisma.user.findFirst({ where: { companyId: company.id }, orderBy: { createdAt: "asc" } }));
  if (!admin) throw new Error("No user found.");

  const orders = await prisma.order.findMany({
    where: { companyId: company.id, orderNo: { startsWith: "SEED-" } },
    orderBy: { orderNo: "asc" },
    take: 4,
  });
  const pos = await prisma.purchaseOrder.findMany({
    where: { companyId: company.id, poNo: { startsWith: "SEED-" } },
    orderBy: { poNo: "asc" },
    take: 4,
  });
  const orderHref = (i: number) => (orders[i] ? `/orders/${orders[i].id}` : "/orders");
  const poHref = (i: number) => (pos[i] ? `/purchase-orders/${pos[i].id}` : "/purchase-orders");

  // ago = koto ghonta age; read = porha hoyeche kina
  const items = [
    { type: "SHIPMENT_RISK", title: "Shipment at risk", message: "SEED-ORD-0001: ship date passed 5 days ago", href: orderHref(0), ago: 2, read: false },
    { type: "MATERIAL_SHORTAGE", title: "Material shortage blocking production", message: "SEED-ORD-0003: short on 1x1 Rib", href: "/material-requirements", ago: 5, read: false },
    { type: "PRODUCTION_BELOW_TARGET", title: "Production below target", message: "Line L3 is 38% below target today", href: "/sewing", ago: 8, read: false },
    { type: "QC_FAILURE", title: "Failed final inspection", message: "SEED-ORD-0002: SEED-AQL-0001 failed. Shipment is blocked", href: "/quality/aql", ago: 26, read: false },
    { type: "SUPPLIER_LATE", title: "Supplier late", message: "ABC Textiles is 3 days late on Single Jersey 180 GSM", href: poHref(0), ago: 30, read: true },
    { type: "APPROVAL_PENDING", title: "Approval pending", message: "A purchase order is waiting for your approval", href: "/approvals", ago: 52, read: true },
    { type: "TNA_OVERDUE", title: "T&A milestone overdue", message: "SEED-ORD-0001: PP sample approval is 33 day(s) late", href: "/tna/risk", ago: 75, read: true },
    { type: "CERTIFICATE_EXPIRY", title: "Certificate expiring soon", message: "BSCI audit certificate expires in 12 days", href: "/documents", ago: 120, read: true },
    { type: "GENERAL", title: "Welcome to MERCHFLOW", message: "Your demo workspace is ready", href: "/dashboard", ago: 168, read: true },
  ];

  await prisma.notification.deleteMany({
    where: { companyId: company.id, recipientId: admin.id, entityId: { startsWith: "SEED-" } },
  });

  const now = Date.now();
  await prisma.notification.createMany({
    data: items.map((n, i) => ({
      companyId: company.id,
      recipientId: admin.id,
      type: n.type as any,
      title: n.title,
      message: n.message,
      href: n.href,
      entityType: "SeedDemo",
      entityId: `SEED-NTF-${i + 1}`,
      readAt: n.read ? new Date(now - n.ago * HOUR + 30 * 60_000) : null,
      createdAt: new Date(now - n.ago * HOUR),
    })),
  });

  console.log(`Created ${items.length} notifications for ${admin.email}. Refresh /notifications`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());