import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { BusinessRuleError } from "@/lib/business-rules";
import { assertFactoryInScope } from "@/lib/scope";
import { buildCode, parseCode } from "@/lib/barcode";
import { found } from "@/lib/service-helpers";
import { BaseService } from "./base.service";

class ScanService extends BaseService {
  // Scan করলে ঠিক সেই entity-র পেজের ঠিকানা ফেরত দেয় (সেকশন ৫২)
  // Bundle, Production Order, Carton, Finished Goods আসবে ওই মডিউল বানানোর পর
  async resolve(raw: string) {
    const user = await this.guard("scan.use");
    const parsed = parseCode(raw);
    const type = parsed?.type ?? "ROLL"; // কোড ছাড়া শুধু roll number লিখলেও চলে
    const value = parsed?.value ?? raw.trim();

    if (type === "ROLL") {
      const roll = await prisma.fabricRoll.findUnique({
        where: { companyId_rollNo: { companyId: user.companyId, rollNo: value } },
        select: { id: true, rollNo: true, warehouse: { select: { factoryId: true } } },
      });
      if (!roll) throw new BusinessRuleError("Roll not found");
      assertFactoryInScope(await this.scopeOf(user), roll.warehouse.factoryId);
      return {
        type, id: roll.id, label: roll.rollNo,
        href: `/inventory/rolls/${encodeURIComponent(roll.rollNo)}`,
      };
    }

    if (type === "LOT") {
      const lot = await prisma.inventoryLot.findUnique({ where: { id: value } });
      if (!lot || lot.companyId !== user.companyId) throw new BusinessRuleError("Lot not found");
      return { type, id: lot.id, label: lot.lotNo, href: `/inventory/lots/${lot.id}` };
    }
    if (type === "BUNDLE") {
      const b = await prisma.bundle.findUnique({
        where: { companyId_bundleNo: { companyId: user.companyId, bundleNo: value } },
        select: { id: true, bundleNo: true, productionOrder: { select: { factoryId: true } } },
      });
      if (!b) throw new BusinessRuleError("Bundle not found");
      assertFactoryInScope(await this.scopeOf(user), b.productionOrder.factoryId);
      return {
        type, id: b.id, label: b.bundleNo,
        href: `/production/bundles/${encodeURIComponent(b.bundleNo)}`,
      };
    }

    if (type === "PRODUCTION_ORDER") {
      const po = await prisma.productionOrder.findUnique({
        where: { companyId_productionNo: { companyId: user.companyId, productionNo: value } },
        select: { id: true, productionNo: true, factoryId: true },
      });
      if (!po) throw new BusinessRuleError("Production order not found");
      assertFactoryInScope(await this.scopeOf(user), po.factoryId);
      return { type, id: po.id, label: po.productionNo, href: `/production/orders/${po.id}` };
    }
    if (type === "CARTON") {
      const c = await prisma.carton.findUnique({
        where: { companyId_cartonNo: { companyId: user.companyId, cartonNo: value } },
        select: { id: true, cartonNo: true, factoryId: true },
      });
      if (!c) throw new BusinessRuleError("Carton not found");
      assertFactoryInScope(await this.scopeOf(user), c.factoryId);
      return { type, id: c.id, label: c.cartonNo, href: `/packing/cartons/${c.id}` };
    }
    throw new BusinessRuleError(`${type} scanning will be available after that module is built`);
  }

  // রোলের লেবেল (প্রিন্টের জন্য তথ্য + QR ছবি)
  async rollLabel(rollNo: string) {
    const user = await this.guard("scan.use");
    const roll = found(
      await prisma.fabricRoll.findUnique({
        where: { companyId_rollNo: { companyId: user.companyId, rollNo } },
        include: { material: true, lot: true, warehouse: true },
      }),
      "Roll"
    );
    assertFactoryInScope(await this.scopeOf(user), roll.warehouse.factoryId);
    const code = buildCode("ROLL", roll.rollNo);
    return {
      code,
      qrDataUrl: await QRCode.toDataURL(code, { margin: 1, width: 240 }),
      rollNo: roll.rollNo,
      material: `${roll.material.code} ${roll.material.name}`,
      lotNo: roll.lot.lotNo,
      color: roll.color,
      shade: roll.shade,
      gsm: roll.gsm === null ? null : Number(roll.gsm),
      widthCm: roll.widthCm === null ? null : Number(roll.widthCm),
      length: roll.length === null ? null : Number(roll.length),
      weightKg: roll.weightKg === null ? null : Number(roll.weightKg),
    };
  }


    // Bundle-এর লেবেল (সেকশন ২৮)
  async bundleLabel(bundleNo: string) {
    const user = await this.guard("scan.use");
    const b = found(
      await prisma.bundle.findUnique({
        where: { companyId_bundleNo: { companyId: user.companyId, bundleNo } },
        include: { productionOrder: { include: { style: true } } },
      }),
      "Bundle"
    );
    assertFactoryInScope(await this.scopeOf(user), b.productionOrder.factoryId);
    const code = buildCode("BUNDLE", b.bundleNo);
    return {
      code,
      qrDataUrl: await QRCode.toDataURL(code, { margin: 1, width: 240 }),
      bundleNo: b.bundleNo,
      cutNumber: b.cutNumber,
      style: b.productionOrder.style.styleNo,
      color: b.color,
      size: b.size,
      quantity: b.quantity,
      destinationLineId: b.destinationLineId,
    };
  }
  
  async lotLabel(lotId: string) {
    const user = await this.guard("scan.use");
    const lot = found(
      await prisma.inventoryLot.findUnique({ where: { id: lotId }, include: { material: true } }),
      "Lot"
    );
    if (lot.companyId !== user.companyId) throw new BusinessRuleError("Lot not found");
    const code = buildCode("LOT", lot.id);
    return {
      code,
      qrDataUrl: await QRCode.toDataURL(code, { margin: 1, width: 240 }),
      lotNo: lot.lotNo,
      material: `${lot.material.code} ${lot.material.name}`,
      color: lot.color,
      shade: lot.shade,
    };
  }
}

export const scanService = new ScanService();