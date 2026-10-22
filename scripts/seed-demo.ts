import "dotenv/config";
import { prisma } from "../src/lib/prisma";

// Golden Demo data (spec Sec 85). Idempotent: dobar chalale duplicate hobe na.
// Real data chhuy na: shudhu DEMO-* code-er record upsert kore.
if (process.env.NODE_ENV === "production") {
  console.error("seed-demo refuses to run when NODE_ENV=production");
  process.exit(1);
}

const SIZES = ["S", "M", "L", "XL", "XXL"];
// color -> size-wise qty (total 20,000)
const COLORS: { code: string; name: string; qty: number[] }[] = [
  { code: "NVY", name: "Navy", qty: [1200, 2400, 2400, 1200, 800] }, // 8000
  { code: "WHT", name: "White", qty: [1050, 2100, 2100, 1050, 700] }, // 7000
  { code: "RED", name: "Red", qty: [750, 1500, 1500, 750, 500] }, // 5000
];

async function main() {
  // 1. Company (existing pele seta-i ber use, na hole demo company)
  const company =
    (await prisma.company.findFirst({ orderBy: { createdAt: "asc" } })) ??
    (await prisma.company.create({ data: { code: "DEMO", legalName: "Demo Garments Ltd" } }));
  const companyId = company.id;

  // 2. Factory -> Building -> Floor -> Lines
  const factory = await prisma.factory.upsert({
    where: { companyId_code: { companyId, code: "DEMO-F1" } },
    update: {},
    create: { companyId, code: "DEMO-F1", name: "Demo Factory 1", factoryType: "KNIT" },
  });
  const building = await prisma.building.upsert({
    where: { factoryId_code: { factoryId: factory.id, code: "B1" } },
    update: {},
    create: { factoryId: factory.id, code: "B1", name: "Building 1" },
  });
  const floor = await prisma.floor.upsert({
    where: { buildingId_code: { buildingId: building.id, code: "F1" } },
    update: {},
    create: { buildingId: building.id, code: "F1", name: "Floor 1" },
  });
  for (const n of [1, 2, 3]) {
    await prisma.line.upsert({
      where: { floorId_code: { floorId: floor.id, code: `L${n}` } },
      update: {},
      create: {
        floorId: floor.id,
        code: `L${n}`,
        name: `Sewing Line ${n}`,
        operators: 40,
        efficiencyPct: 60,
        minutesPerDay: 480,
      },
    });
  }

  // 3. Warehouses
  const warehouses = [
    { code: "WH-FAB", name: "Fabric Store", type: "FABRIC" },
    { code: "WH-TRM", name: "Trim Store", type: "TRIM" },
    { code: "WH-FG", name: "Finished Goods", type: "FINISHED_GOODS" },
  ];
  for (const w of warehouses) {
    await prisma.warehouse.upsert({
      where: { factoryId_code: { factoryId: factory.id, code: w.code } },
      update: {},
      create: { factoryId: factory.id, ...w },
    });
  }

  // 4. Buyer
  const buyer = await prisma.buyer.upsert({
    where: { companyId_code: { companyId, code: "DEMO-HM" } },
    update: {},
    create: {
      companyId,
      code: "DEMO-HM",
      name: "H&M Demo Buyer",
      country: "Sweden",
      currency: "USD",
      paymentTerms: "LC at sight",
    },
  });

  // 5. Style + colors + sizes + style matrix
  const style = await prisma.style.upsert({
    where: { companyId_styleNo: { companyId, styleNo: "POLO-1024" } },
    update: {},
    create: {
      companyId,
      styleNo: "POLO-1024",
      buyerId: buyer.id,
      name: "Men's Pique Polo",
      garmentType: "Polo Shirt",
      fabricType: "Cotton Pique",
      gsm: 180,
      status: "DEVELOPMENT",
    },
  });

  const sizeRows = [];
  for (const [i, label] of SIZES.entries()) {
    sizeRows.push(
      await prisma.styleSize.upsert({
        where: { styleId_label: { styleId: style.id, label } },
        update: {},
        create: { styleId: style.id, label, sortOrder: i },
      })
    );
  }
  const colorRows = [];
  for (const [i, c] of COLORS.entries()) {
    colorRows.push(
      await prisma.styleColor.upsert({
        where: { styleId_code: { styleId: style.id, code: c.code } },
        update: {},
        create: { styleId: style.id, code: c.code, name: c.name, sortOrder: i },
      })
    );
  }
  for (const [ci, c] of COLORS.entries()) {
    for (const [si, qty] of c.qty.entries()) {
      await prisma.styleMatrixQty.upsert({
        where: { colorId_sizeId: { colorId: colorRows[ci].id, sizeId: sizeRows[si].id } },
        update: {},
        create: { colorId: colorRows[ci].id, sizeId: sizeRows[si].id, quantity: qty },
      });
    }
  }

  // 6. Order (20,000 pcs) + line + color-size matrix
  const shipDate = new Date(Date.now() + 90 * 86_400_000);
  const order = await prisma.order.upsert({
    where: { companyId_orderNo: { companyId, orderNo: "DEMO-ORD-0001" } },
    update: {},
    create: {
      companyId,
      orderNo: "DEMO-ORD-0001",
      buyerId: buyer.id,
      buyerPoNo: "HM-PO-24001",
      currency: "USD",
      shipDate,
      status: "CONFIRMED",
    },
  });
  const totalQty = COLORS.reduce((s, c) => s + c.qty.reduce((a, b) => a + b, 0), 0);
  let line = await prisma.orderLine.findFirst({
    where: { orderId: order.id, styleId: style.id },
  });
  if (!line) {
    line = await prisma.orderLine.create({
      data: { orderId: order.id, styleId: style.id, quantity: totalQty, unitPrice: 6.5, shipDate },
    });
  }
  for (const [ci, c] of COLORS.entries()) {
    for (const [si, qty] of c.qty.entries()) {
      await prisma.orderLineQty.upsert({
        where: {
          orderLineId_colorId_sizeId: {
            orderLineId: line.id,
            colorId: colorRows[ci].id,
            sizeId: sizeRows[si].id,
          },
        },
        update: {},
        create: {
          orderLineId: line.id,
          colorId: colorRows[ci].id,
          sizeId: sizeRows[si].id,
          quantity: qty,
        },
      });
    }
  }

  // 7. Suppliers
  const supFab = await prisma.supplier.upsert({
    where: { companyId_code: { companyId, code: "DEMO-SUP-FAB" } },
    update: {},
    create: { companyId, code: "DEMO-SUP-FAB", name: "Demo Fabric Mills", category: "FABRIC", currency: "USD", leadTimeDays: 21 },
  });
  const supTrm = await prisma.supplier.upsert({
    where: { companyId_code: { companyId, code: "DEMO-SUP-TRM" } },
    update: {},
    create: { companyId, code: "DEMO-SUP-TRM", name: "Demo Trims Co", category: "TRIMS", currency: "USD", leadTimeDays: 10 },
  });

  // 8. Materials
  const catFab = await prisma.materialCategory.upsert({
    where: { companyId_code: { companyId, code: "DEMO-FAB" } },
    update: {},
    create: { companyId, code: "DEMO-FAB", name: "Fabric" },
  });
  const catTrm = await prisma.materialCategory.upsert({
    where: { companyId_code: { companyId, code: "DEMO-TRM" } },
    update: {},
    create: { companyId, code: "DEMO-TRM", name: "Trims & Packing" },
  });
  const mat = (code: string, name: string, unit: string, categoryId: string) =>
    prisma.material.upsert({
      where: { companyId_code: { companyId, code } },
      update: {},
      create: { companyId, code, name, unit, categoryId },
    });
  const fabric = await mat("DEMO-FAB-PQ180", "Cotton Pique 180 GSM", "KG", catFab.id);
  const button = await mat("DEMO-TRM-BTN18", "Polo Button 18L", "PCS", catTrm.id);
  const label = await mat("DEMO-TRM-LBL", "Main Label", "PCS", catTrm.id);
  const polybag = await mat("DEMO-PKG-PB", "Poly Bag", "PCS", catTrm.id);

  // 9. BOM (approved)
  const bom = await prisma.bom.upsert({
    where: { styleId_version: { styleId: style.id, version: 1 } },
    update: {},
    create: { companyId, styleId: style.id, version: 1, status: "APPROVED" },
  });
  const bomItems = [
    { itemType: "FABRIC", itemName: "Cotton Pique 180 GSM", materialId: fabric.id, supplierId: supFab.id, unit: "KG", consumption: 0.28, wastagePct: 5 },
    { itemType: "TRIM", itemName: "Polo Button 18L", materialId: button.id, supplierId: supTrm.id, unit: "PCS", consumption: 3, wastagePct: 2 },
    { itemType: "TRIM", itemName: "Main Label", materialId: label.id, supplierId: supTrm.id, unit: "PCS", consumption: 1, wastagePct: 1 },
    { itemType: "PACKING", itemName: "Poly Bag", materialId: polybag.id, supplierId: supTrm.id, unit: "PCS", consumption: 1, wastagePct: 1 },
  ] as const;
  for (const b of bomItems) {
    const exists = await prisma.bomItem.findFirst({ where: { bomId: bom.id, itemName: b.itemName } });
    if (!exists) await prisma.bomItem.create({ data: { bomId: bom.id, ...b } });
  }

  console.log(`Demo ready: order ${order.orderNo}, ${totalQty} pcs, style ${style.styleNo}, factory ${factory.code}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
