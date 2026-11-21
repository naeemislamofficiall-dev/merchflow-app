/**
 * MERCHFLOW demo-data seed
 * ------------------------------------------------------------
 * Fills every dashboard widget: orders, order progress, shipment risk,
 * material shortage, material exposure, production vs target, alerts,
 * top buyers, upcoming shipments & T&A, receivables.
 *
 * Put this file at:   prisma/seed-demo.ts
 * Run:                npx tsx prisma/seed-demo.ts
 * Wipe + re-seed:     npx tsx prisma/seed-demo.ts --reset
 *
 * Safe: it only touches records whose number starts with "SEED-".
 * Master data (buyers, styles, suppliers, materials) is upserted, never deleted.
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

const DAY = 86_400_000;
const now = new Date();
const daysFromNow = (n: number) => new Date(now.getTime() + n * DAY);
const dateOnly = (d: Date) => new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));


const USD_BDT = 122.5;
const P = "SEED-";

async function reset(companyId: string) {
  console.log("Resetting previously seeded transactional data...");
  const orders = await prisma.order.findMany({ where: { companyId, orderNo: { startsWith: P } }, select: { id: true } });
  const orderIds = orders.map((o) => o.id);
  const pos = await prisma.productionOrder.findMany({ where: { companyId, productionNo: { startsWith: P } }, select: { id: true } });
  const poIds = pos.map((p) => p.id);
  const purchase = await prisma.purchaseOrder.findMany({ where: { companyId, poNo: { startsWith: P } }, select: { id: true } });
  const purchaseIds = purchase.map((p) => p.id);

  await prisma.sewingLog.deleteMany({ where: { productionOrderId: { in: poIds } } });
  await prisma.finishingLog.deleteMany({ where: { productionOrderId: { in: poIds } } });
  await prisma.productionOrder.deleteMany({ where: { id: { in: poIds } } });
  await prisma.payment.deleteMany({ where: { companyId, paymentNo: { startsWith: P } } });
  await prisma.buyerInvoice.deleteMany({ where: { companyId, invoiceNo: { startsWith: P } } });
  await prisma.supplierInvoice.deleteMany({ where: { companyId, invoiceNo: { startsWith: P } } });
  await prisma.poFollowUp.deleteMany({ where: { poId: { in: purchaseIds } } });
  await prisma.purchaseOrder.deleteMany({ where: { id: { in: purchaseIds } } });
  await prisma.mrpRun.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.purchaseRequisition.deleteMany({ where: { companyId, prNo: { startsWith: P } } });
  await prisma.tnaPlan.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.aqlInspection.deleteMany({ where: { companyId, inspectionNo: { startsWith: P } } });
  await prisma.sampleRequest.deleteMany({ where: { companyId, sampleNo: { startsWith: P } } });
  await prisma.costAllocation.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
}

async function main() {
  const company = await prisma.company.findFirst({ orderBy: { createdAt: "asc" } });
  if (!company) throw new Error("No company found. Create the demo company / admin user first.");
  const companyId = company.id;
  console.log(`Company: ${company.tradeName ?? company.legalName}`);

  if (process.argv.includes("--reset")) await reset(companyId);
  else {
    const exists = await prisma.order.count({ where: { companyId, orderNo: { startsWith: P } } });
    if (exists > 0) {
      console.log("Seed data already present. Run with --reset to wipe and re-seed.");
      return;
    }
  }

  // base currency + exchange rate so BDT conversion works
  await prisma.currency.upsert({ where: { code: "BDT" }, update: {}, create: { code: "BDT", name: "Bangladeshi Taka", symbol: "৳" } });
  await prisma.currency.upsert({ where: { code: "USD" }, update: {}, create: { code: "USD", name: "US Dollar", symbol: "$" } });
  await prisma.exchangeRate.upsert({
    where: { fromCode_toCode_rateDate: { fromCode: "USD", toCode: "BDT", rateDate: dateOnly(now) } },
    update: {},
    create: { fromCode: "USD", toCode: "BDT", rate: USD_BDT, rateDate: dateOnly(now) },
  });

  /* ---------------- Factory structure ---------------- */
  let factory = await prisma.factory.findFirst({ where: { companyId }, orderBy: { createdAt: "asc" } });
  if (!factory) {
    factory = await prisma.factory.create({ data: { companyId, code: "DHK", name: "Dhaka Factory", capacity: 5000 } });
  }
  const building = await prisma.building.upsert({
    where: { factoryId_code: { factoryId: factory.id, code: "B1" } },
    update: {},
    create: { factoryId: factory.id, code: "B1", name: "Building 1" },
  });
  const floor = await prisma.floor.upsert({
    where: { buildingId_code: { buildingId: building.id, code: "F1" } },
    update: {},
    create: { buildingId: building.id, code: "F1", name: "Sewing Floor" },
  });
  const lines = [];
  for (const [i, code] of ["L1", "L2", "L3", "L4"].entries()) {
    lines.push(
      await prisma.line.upsert({
        where: { floorId_code: { floorId: floor.id, code } },
        update: {},
        create: { floorId: floor.id, code, name: `Sewing Line ${i + 1}`, efficiencyPct: 70, operators: 45 },
      })
    );
  }
   await prisma.warehouse.upsert({
    where: { factoryId_code: { factoryId: factory.id, code: "WH1" } },
    update: {},
    create: { factoryId: factory.id, code: "WH1", name: "Main Store" },
  });
  const route = await prisma.productionRoute.upsert({
    where: { companyId_code: { companyId, code: "STD" } },
    update: {},
    create: {
      companyId,
      code: "STD",
      name: "Standard route",
      steps: { create: ["CUTTING", "SEWING", "FINISHING", "PACKING"].map((process, i) => ({ seq: i + 1, process: process as any })) },
    },
  });

  /* ---------------- Season / Buyers ---------------- */
  const season = await prisma.season.upsert({
    where: { companyId_code: { companyId, code: "SS27" } },
    update: {},
    create: { companyId, code: "SS27", name: "Spring/Summer 2027" },
  });

  const buyerDefs = [
    { code: "HM", name: "H&M", country: "Sweden", region: "Europe" },
    { code: "ZARA", name: "Zara", country: "Spain", region: "Europe" },
    { code: "WMT", name: "Walmart", country: "USA", region: "North America" },
    { code: "PRIM", name: "Primark", country: "Ireland", region: "Europe" },
    { code: "MNG", name: "Mango", country: "Spain", region: "Europe" },
  ];
  const buyers = [];
  for (const b of buyerDefs) {
    buyers.push(
      await prisma.buyer.upsert({
        where: { companyId_code: { companyId, code: b.code } },
        update: {},
        create: { companyId, ...b, currency: "USD", paymentTerms: "LC at sight" },
      })
    );
  }

  /* ---------------- Styles ---------------- */
  const styleDefs = [
    { no: "HM-2345", name: "Basic Crew Tee", buyer: 0, type: "T-Shirt", price: 3.9 },
    { no: "ZR-7788", name: "Slim Fit Polo", buyer: 1, type: "Polo", price: 6.2 },
    { no: "WW-5566", name: "Fleece Hoodie", buyer: 2, type: "Hoodie", price: 8.4 },
    { no: "PR-3399", name: "Jogger Pant", buyer: 3, type: "Pant", price: 5.6 },
    { no: "MG-1122", name: "Rib Tank Top", buyer: 4, type: "Tank", price: 3.1 },
    { no: "HM-8801", name: "Denim Shirt", buyer: 0, type: "Shirt", price: 7.3 },
    { no: "ZR-4410", name: "Knit Cardigan", buyer: 1, type: "Sweater", price: 9.1 },
    { no: "WW-2201", name: "Kids Pyjama Set", buyer: 2, type: "Nightwear", price: 4.5 },
  ];
  const sizes = ["S", "M", "L", "XL"];
  const colors = [
    { code: "BLK", name: "Black" },
    { code: "NVY", name: "Navy" },
    { code: "WHT", name: "White" },
  ];
  const styles = [];
  for (const s of styleDefs) {
    const style = await prisma.style.upsert({
      where: { companyId_styleNo: { companyId, styleNo: s.no } },
      update: {},
      create: {
        companyId,
        styleNo: `${s.no}`,
        buyerId: buyers[s.buyer].id,
        name: s.name,
        status: "APPROVED",
        seasonId: season.id,
        garmentType: s.type,
        gsm: 180,
        colors: { create: colors.map((c, i) => ({ ...c, sortOrder: i })) },
        sizes: { create: sizes.map((label, i) => ({ label, sortOrder: i })) },
      },
      include: { colors: true, sizes: true },
    });
    styles.push({ ...style, price: s.price });
  }

  /* ---------------- Suppliers / Materials ---------------- */
  const supDefs = [
    { code: "ABC", name: "ABC Textiles", category: "FABRIC" },
    { code: "DTR", name: "Dhaka Trims Ltd", category: "TRIMS" },
    { code: "YRN", name: "Square Yarn Mills", category: "YARN" },
    { code: "PKG", name: "Bengal Packaging", category: "PACKAGING" },
  ];
  const suppliers = [];
  for (const s of supDefs) {
    suppliers.push(
      await prisma.supplier.upsert({
        where: { companyId_code: { companyId, code: s.code } },
        update: {},
        create: { companyId, ...s, category: s.category as any, country: "Bangladesh", currency: "USD", leadTimeDays: 21 },
      })
    );
  }
  const catFab = await prisma.materialCategory.upsert({ where: { companyId_code: { companyId, code: "FAB" } }, update: {}, create: { companyId, code: "FAB", name: "Fabric" } });
  const catTrm = await prisma.materialCategory.upsert({ where: { companyId_code: { companyId, code: "TRM" } }, update: {}, create: { companyId, code: "TRM", name: "Trims" } });
  const matDefs = [
    { code: "FAB-JER-180", name: "Single Jersey 180 GSM", unit: "KG", cat: catFab.id, rate: 5.2 },
    { code: "FAB-FLC-280", name: "Fleece 280 GSM", unit: "KG", cat: catFab.id, rate: 6.8 },
    { code: "FAB-RIB-1X1", name: "1x1 Rib", unit: "KG", cat: catFab.id, rate: 5.9 },
    { code: "TRM-ZIP-5", name: "Zipper #5", unit: "PCS", cat: catTrm.id, rate: 0.18 },
    { code: "TRM-BTN-18", name: "Button 18L", unit: "PCS", cat: catTrm.id, rate: 0.03 },
    { code: "TRM-LBL-MN", name: "Main Label", unit: "PCS", cat: catTrm.id, rate: 0.02 },
  ];
  const materials = [];
  for (const m of matDefs) {
    materials.push({
      ...(await prisma.material.upsert({
        where: { companyId_code: { companyId, code: m.code } },
        update: {},
        create: { companyId, categoryId: m.cat, code: m.code, name: m.name, unit: m.unit, reorderPoint: 500 },
      })),
      rate: m.rate,
    });
  }

  /* ---------------- BOMs (approved, one per style) ---------------- */
  const boms: Record<string, { id: string; items: { id: string; materialId: string | null; consumption: number }[] }> = {};
  for (const [i, st] of styles.entries()) {
    const existing = await prisma.bom.findUnique({ where: { styleId_version: { styleId: st.id, version: 1 } }, include: { items: true } });
    const bom =
      existing ??
      (await prisma.bom.create({
        data: {
          companyId,
          styleId: st.id,
          status: "APPROVED",
          items: {
            create: [
              { itemType: "FABRIC", itemName: materials[i % 3].name, unit: "KG", consumption: 0.22 + (i % 3) * 0.06, wastagePct: 5, materialId: materials[i % 3].id, rate: materials[i % 3].rate, supplierId: suppliers[0].id },
              { itemType: "TRIM", itemName: materials[3 + (i % 3)].name, unit: "PCS", consumption: 1, wastagePct: 2, materialId: materials[3 + (i % 3)].id, rate: materials[3 + (i % 3)].rate, supplierId: suppliers[1].id },
            ],
          },
        },
        include: { items: true },
      }));
    boms[st.id] = { id: bom.id, items: bom.items.map((x) => ({ id: x.id, materialId: x.materialId, consumption: Number(x.consumption) })) };
  }

  /* ---------------- Orders ----------------
   * status mix drives the donut; shipDate drives Shipment Risk (<= 14 days or overdue)
   */
  type OD = { n: number; style: number; qty: number; status: any; ship: number; created: number };
  const orderDefs: OD[] = [
    // IN_PRODUCTION: 2 overdue + 2 near (shipment risk) + 1 healthy
    { n: 1, style: 0, qty: 12000, status: "IN_PRODUCTION", ship: -4, created: -70 },
    { n: 2, style: 1, qty: 8500, status: "IN_PRODUCTION", ship: -2, created: -62 },
    { n: 3, style: 2, qty: 15000, status: "IN_PRODUCTION", ship: 5, created: -55 },
    { n: 4, style: 3, qty: 10000, status: "IN_PRODUCTION", ship: 9, created: -40 },
    { n: 5, style: 4, qty: 6500, status: "IN_PRODUCTION", ship: 38, created: -25 },
    // CONFIRMED: 1 near, rest healthy
    { n: 6, style: 5, qty: 9000, status: "CONFIRMED", ship: 12, created: -20 },
    { n: 7, style: 6, qty: 7200, status: "CONFIRMED", ship: 45, created: -12 },
    { n: 8, style: 7, qty: 11000, status: "CONFIRMED", ship: 60, created: -6 },
    { n: 9, style: 0, qty: 14000, status: "CONFIRMED", ship: 75, created: -2 },
    // shipped / closed (history for trend + receivables)
    { n: 10, style: 1, qty: 9500, status: "PARTIALLY_SHIPPED", ship: 3 + 20, created: -90 },
    { n: 11, style: 2, qty: 8000, status: "PARTIALLY_SHIPPED", ship: 18, created: -100 },
    { n: 12, style: 3, qty: 13000, status: "FULLY_SHIPPED", ship: -30, created: -120 },
    { n: 13, style: 4, qty: 10500, status: "FULLY_SHIPPED", ship: -45, created: -140 },
    { n: 14, style: 5, qty: 7000, status: "CLOSED", ship: -70, created: -160 },
    { n: 15, style: 6, qty: 5000, status: "DRAFT", ship: 90, created: -1 },
  ];

  const orders: { id: string; def: OD; styleId: string; value: number; buyerId: string }[] = [];
  for (const d of orderDefs) {
    const st = styles[d.style];
    const colorQty = Math.floor(d.qty / colors.length);
    const order = await prisma.order.create({
      data: {
        companyId,
        orderNo: `${P}ORD-${String(d.n).padStart(4, "0")}`,
        buyerId: st.buyerId,
        buyerPoNo: `PO-${4500 + d.n}`,
        seasonId: season.id,
        currency: "USD",
        baseCurrency: "BDT",
        exchangeRate: USD_BDT,
        rateDate: dateOnly(now),
        orderDate: daysFromNow(d.created),
        createdAt: daysFromNow(d.created),
        shipDate: daysFromNow(d.ship),
        status: d.status,
        lines: {
          create: {
            styleId: st.id,
            quantity: d.qty,
            unitPrice: st.price,
            shipDate: daysFromNow(d.ship),
            matrix: {
              create: st.colors.flatMap((c) =>
                st.sizes.map((s) => ({ colorId: c.id, sizeId: s.id, quantity: Math.floor(colorQty / st.sizes.length) }))
              ),
            },
          },
        },
      },
    });
    orders.push({ id: order.id, def: d, styleId: st.id, value: d.qty * st.price, buyerId: st.buyerId });
  }
  console.log(`Orders: ${orders.length}`);

  /* ---------------- Production orders + sewing logs (TODAY + last 6 days) ---------------- */
  const prodOrders: { id: string; lineIdx: number; styleId: string; orderId: string }[] = [];
  const running = orders.filter((o) => ["IN_PRODUCTION", "PARTIALLY_SHIPPED"].includes(o.def.status)).slice(0, 4);
  for (const [i, o] of running.entries()) {
    const po = await prisma.productionOrder.create({
      data: {
        companyId,
        factoryId: factory.id,
        productionNo: `${P}PRD-${String(i + 1).padStart(4, "0")}`,
        orderId: o.id,
        styleId: o.styleId,
        quantity: o.def.qty,
        completedQty: Math.floor(o.def.qty * (0.35 + i * 0.12)),
        lineId: lines[i].id,
        routeId: route.id,
        startDate: daysFromNow(-20),
        endDate: daysFromNow(o.def.ship - 3),
        status: "IN_PROGRESS",
        startedAt: daysFromNow(-20),
      },
    });
    prodOrders.push({ id: po.id, lineIdx: i, styleId: o.styleId, orderId: o.id });
  }

  // hourly efficiency per line TODAY: L3 intentionally weak so the "below target" alert fires
  const lineEff = [0.97, 0.9, 0.62, 0.84];
  const hours = [8, 9, 10, 11, 12, 14, 15, 16, 17];
  const hourTarget = [450, 600, 380, 520];
  const logs: any[] = [];
  for (const p of prodOrders) {
    for (let back = 0; back < 7; back++) {
      const date = dateOnly(daysFromNow(-back));
      const doneHours = back === 0 ? hours.slice(0, 7) : hours; // today: partial day
      for (const h of doneHours) {
        const jitter = 0.94 + ((h * 7 + back * 3 + p.lineIdx) % 10) / 80;
        const eff = back === 0 ? lineEff[p.lineIdx] : Math.min(lineEff[p.lineIdx] + 0.04, 1.02);
        const target = hourTarget[p.lineIdx];
        logs.push({
          companyId,
          factoryId: factory.id,
          productionOrderId: p.id,
          lineId: lines[p.lineIdx].id,
          styleId: p.styleId,
          logDate: date,
          hour: h,
          target,
          output: Math.round(target * eff * jitter),
          reject: Math.round(target * 0.012),
          rework: Math.round(target * 0.02),
          downtimeMinutes: p.lineIdx === 2 && h === 11 ? 25 : 0,
          downtimeReason: p.lineIdx === 2 && h === 11 ? "Machine breakdown" : null,
          operators: 45,
        });
      }
    }
  }
  await prisma.sewingLog.createMany({ data: logs, skipDuplicates: true });

  for (const p of prodOrders) {
    await prisma.finishingLog.create({
      data: {
        companyId,
        factoryId: factory.id,
        productionOrderId: p.id,
        styleId: p.styleId,
        logDate: dateOnly(now),
        inputQty: 2600,
        threadCutQty: 2500,
        ironedQty: 2400,
        foldedQty: 2350,
        metalCheckedQty: 2350,
        qcPassedQty: 2300,
        reworkQty: 60,
        outputQty: 2280 - p.lineIdx * 150,
      },
    });
  }
  console.log(`Sewing logs: ${logs.length}`);

  /* ---------------- MRP: material shortage (netQty > 0, no PR) ---------------- */
  const inProd = orders.filter((o) => o.def.status === "IN_PRODUCTION");
  for (const [i, o] of inProd.slice(0, 3).entries()) {
    const bom = boms[o.styleId];
    await prisma.mrpRun.create({
      data: {
        companyId,
        bomId: bom.id,
        orderId: o.id,
        orderQty: o.def.qty,
        runDate: daysFromNow(-3 - i),
        lines: {
          create: bom.items.map((it, k) => {
            const gross = o.def.qty * it.consumption * 1.05;
            const stock = k === 0 ? gross * 0.45 : gross; // fabric short, trims fine
            return { bomItemId: it.id, grossQty: gross, stockQty: stock, netQty: Math.max(gross - stock, 0) };
          }),
        },
      },
    });
  }
  // one covered MRP run (has a PR) → must NOT count as shortage
  {
    const o = inProd[3];
    const bom = boms[o.styleId];
    const run = await prisma.mrpRun.create({
      data: {
        companyId,
        bomId: bom.id,
        orderId: o.id,
        orderQty: o.def.qty,
        lines: { create: bom.items.map((it) => ({ bomItemId: it.id, grossQty: o.def.qty * it.consumption, stockQty: 0, netQty: o.def.qty * it.consumption })) },
      },
    });
    await prisma.purchaseRequisition.create({
      data: {
        companyId,
        prNo: `${P}PR-0001`,
        source: "MRP",
        orderId: o.id,
        mrpRunId: run.id,
        status: "APPROVED",
        lines: { create: { materialId: materials[0].id, quantity: 1800, unit: "KG" } },
      },
    });
  }

  /* ---------------- Purchase orders: material exposure + watchlist + supplier late ---------------- */
  type PD = { n: number; sup: number; mat: number; status: any; qty: number; received: number; promisedIn: number; follow: boolean };
  const poDefs: PD[] = [
    { n: 1, sup: 0, mat: 0, status: "SENT", qty: 4200, received: 0, promisedIn: -3, follow: true }, // late 3 days
    { n: 2, sup: 0, mat: 1, status: "ACKNOWLEDGED", qty: 3000, received: 0, promisedIn: -1, follow: true }, // late
    { n: 3, sup: 1, mat: 3, status: "PARTIAL_RECEIPT", qty: 20000, received: 6000, promisedIn: 6, follow: true },
    { n: 4, sup: 2, mat: 2, status: "SENT", qty: 1500, received: 0, promisedIn: 10, follow: true },
    { n: 5, sup: 1, mat: 4, status: "SENT", qty: 30000, received: 0, promisedIn: 14, follow: true },
    { n: 6, sup: 0, mat: 0, status: "COMPLETE", qty: 2500, received: 2500, promisedIn: -20, follow: true },
    { n: 7, sup: 1, mat: 5, status: "COMPLETE", qty: 18000, received: 18000, promisedIn: -35, follow: true },
  ];
  const purchaseOrders: { id: string; def: PD; total: number }[] = [];
  for (const d of poDefs) {
    const mat = materials[d.mat];
    const total = d.qty * mat.rate;
    const po = await prisma.purchaseOrder.create({
      data: {
        companyId,
        poNo: `${P}PO-${String(d.n).padStart(4, "0")}`,
        supplierId: suppliers[d.sup].id,
        currency: "USD",
        baseCurrency: "BDT",
        exchangeRate: USD_BDT,
        baseTotal: total * USD_BDT,
        rateDate: dateOnly(now),
        status: d.status,
        deliveryDate: daysFromNow(d.promisedIn),
        approvedAt: daysFromNow(-30),
        sentAt: daysFromNow(-25),
        createdAt: daysFromNow(-30 + d.n * 3),
        lines: {
          create: {
            materialId: mat.id,
            orderId: inProd[d.n % inProd.length].id,
            quantity: d.qty,
            receivedQty: d.received,
            unit: mat.unit,
            rate: mat.rate,
            deliveryDate: daysFromNow(d.promisedIn),
          },
        },
      },
    });
    purchaseOrders.push({ id: po.id, def: d, total });
    if (d.follow) {
      const done = d.status === "COMPLETE";
      await prisma.poFollowUp.create({
        data: {
          poId: po.id,
          supplierPromisedDate: daysFromNow(d.promisedIn - (d.promisedIn < 0 && !done ? 2 : 0)),
          latestPromisedDate: daysFromNow(d.promisedIn),
          actualReceiptDate: done ? daysFromNow(d.promisedIn + (d.n === 7 ? 4 : 0)) : null, // PO7 delivered late → supplier score
          delayDays: d.promisedIn < 0 && !done ? Math.abs(d.promisedIn) : 0,
          remarks: d.promisedIn < 0 && !done ? "Supplier asked for extension" : null,
        },
      });
    }
  }

  /* ---------------- Samples (overdue → alert, buyer review → merch KPI) ---------------- */
  const sampleDefs = [
    { n: 1, style: 0, type: "PP", status: "IN_DEVELOPMENT", due: -4 },
    { n: 2, style: 1, type: "FIT", status: "BUYER_REVIEW", due: -2 },
    { n: 3, style: 5, type: "SIZE_SET", status: "INTERNAL_QC", due: 3 },
    { n: 4, style: 6, type: "PROTO", status: "REQUESTED", due: 8 },
    { n: 5, style: 2, type: "TOP", status: "APPROVED", due: -15 },
  ];
  for (const s of sampleDefs) {
    await prisma.sampleRequest.create({
      data: {
        companyId,
        sampleNo: `${P}SMP-${String(s.n).padStart(4, "0")}`,
        styleId: styles[s.style].id,
        sampleType: s.type as any,
        status: s.status as any,
        quantity: 3,
        dueDate: daysFromNow(s.due),
        requestedDate: daysFromNow(s.due - 14),
      },
    });
  }

  /* ---------------- T&A plans (next milestone column + overdue alerts) ---------------- */
  const taskNames = ["Lab dip approval", "Fabric booking", "PP sample approval", "Cutting start", "Sewing start", "Final inspection"];
  for (const [i, o] of orders.filter((x) => ["IN_PRODUCTION", "CONFIRMED"].includes(x.def.status)).entries()) {
    const ship = daysFromNow(o.def.ship);
    const tasks = taskNames.map((name, k) => {
      const planned = new Date(ship.getTime() - (taskNames.length - k) * 7 * DAY);
      const isPast = planned < now;
      // first 3 orders: leave one past-due milestone open → T&A overdue alert
      const overdue = i < 3 && k === 2;
      return {
        name,
        sortOrder: k,
        plannedDate: planned,
        actualDate: isPast && !overdue ? planned : null,
        status: (isPast && !overdue ? "COMPLETED" : overdue ? "DELAYED" : k === taskNames.findIndex((_, j) => new Date(ship.getTime() - (taskNames.length - j) * 7 * DAY) >= now) ? "ON_TRACK" : "NOT_STARTED") as any,
        delayDays: overdue ? 5 : 0,
      };
    });
    await prisma.tnaPlan.create({ data: { companyId, styleId: o.styleId, orderId: o.id, shipDate: ship, tasks: { create: tasks } } });
  }

  /* ---------------- One failed Final AQL → "Failed final inspection" alert ---------------- */
  {
    const o = orders[1];
    await prisma.aqlInspection.create({
      data: {
        companyId,
        factoryId: factory.id,
        inspectionNo: `${P}AQL-0001`,
        stage: "FINAL",
        orderId: o.id,
        styleId: o.styleId,
        buyerId: o.buyerId,
        lotSize: 8500,
        sampleSize: 315,
        aqlMajor: 2.5,
        aqlMinor: 4.0,
        acceptMajor: 14,
        rejectMajor: 15,
        acceptMinor: 21,
        rejectMinor: 22,
        foundCritical: 0,
        foundMajor: 18,
        foundMinor: 12,
        result: "FAIL",
        inspectedAt: daysFromNow(-1),
      },
    });
  }

  
    /* ---------------- Receivables / payables (finance pages) ---------------- */
  const invOrders = orders.filter((o) => ["FULLY_SHIPPED", "PARTIALLY_SHIPPED", "CLOSED"].includes(o.def.status));
  for (const [i, o] of invOrders.entries()) {
    const total = Math.round(o.value * 0.8 * 100) / 100;
    const paid = i % 3 === 0 ? total : i % 3 === 1 ? Math.round(total * 0.4 * 100) / 100 : 0;
    const status = paid === total ? "PAID" : paid > 0 ? "PARTIALLY_PAID" : "POSTED";
    const inv = await prisma.buyerInvoice.create({
      data: {
        companyId,
        factoryId: factory.id,
        invoiceNo: `${P}INV-${String(i + 1).padStart(4, "0")}`,
        buyerId: o.buyerId,
        invoiceDate: daysFromNow(o.def.ship - 5),
        dueDate: daysFromNow(o.def.ship + 25),
        currency: "USD",
        exchangeRate: USD_BDT,
        totalAmount: total,
        receivedAmount: paid,
        status: status as any,
        lines: { create: { orderId: o.id, styleId: o.styleId, quantity: Math.floor(o.def.qty * 0.8), unitPrice: styles.find((s) => s.id === o.styleId)!.price, amount: total } },
      },
    });
    if (paid > 0) {
      await prisma.payment.create({
        data: { companyId, paymentNo: `${P}RCV-${String(i + 1).padStart(4, "0")}`, direction: "IN", method: "BANK", paymentDate: daysFromNow(-5), amount: paid, currency: "USD", buyerInvoiceId: inv.id },
      });
    }

    // demo cost: revenue-r 32-55% (alada alada), tai Profitability panel-e asol margin ashe
    const costRatio = [0.32, 0.45, 0.38, 0.55, 0.42][i % 5];
    await prisma.costAllocation.create({
      data: {
        companyId,
        sourceType: "SUPPLIER_INVOICE",
        sourceId: inv.id,
        orderId: o.id,
        styleId: o.styleId,
        amountBase: Math.round(total * USD_BDT * costRatio * 100) / 100,
        note: `${P}COST-${String(i + 1).padStart(4, "0")}`,
      },
    });
  }

  for (const [i, p] of purchaseOrders.slice(0, 4).entries()) {
    const sub = Math.round(p.total * USD_BDT);
    await prisma.supplierInvoice.create({
      data: {
        companyId,
        factoryId: factory.id,
        invoiceNo: `${P}BILL-${String(i + 1).padStart(4, "0")}`,
        supplierInvoiceNo: `SI-${900 + i}`,
        supplierId: suppliers[p.def.sup].id,
        poId: p.id,
        invoiceDate: daysFromNow(-18 + i * 3),
        dueDate: daysFromNow(12 - i * 10),
        currency: "BDT",
        subtotal: sub,
        totalAmount: sub,
        status: "POSTED",
      },
    });
  }

  console.log("\nDone. Refresh http://localhost:3000/dashboard");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());