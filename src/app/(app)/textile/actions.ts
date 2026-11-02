"use server";

import { runAction } from "@/lib/action-result";
import { textileService } from "@/services/textile.service";

const s = (fd: FormData, k: string) => {
  const v = String(fd.get(k) ?? "").trim();
  return v === "" ? undefined : v;
};
const n = (fd: FormData, k: string) => {
  const v = s(fd, k);
  return v === undefined ? undefined : Number(v);
};
const rows = (fd: FormData, k: string) =>
  (s(fd, k) ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.split(",").map((x) => x.trim()));

export async function registerYarnAction(fd: FormData) {
  return runAction(async () => {
    const r = await textileService.registerYarn({
      lotId: s(fd, "lotId"), yarnType: s(fd, "yarnType"), yarnCount: s(fd, "yarnCount"),
      composition: s(fd, "composition"), color: s(fd, "color"), rate: n(fd, "rate"), currency: s(fd, "currency"),
    });
    return { id: r.id };
  });
}

export async function createLabDipAction(fd: FormData) {
  return runAction(async () => {
    const r = await textileService.createLabDip({
      factoryId: s(fd, "factoryId"), buyerId: s(fd, "buyerId"), styleId: s(fd, "styleId"), orderId: s(fd, "orderId"),
      color: s(fd, "color"), standardRef: s(fd, "standardRef"), remarks: s(fd, "remarks"),
    });
    return { id: r.id };
  });
}

export async function labDipStepAction(fd: FormData) {
  return runAction(async () => {
    const id = s(fd, "id") ?? "";
    const step = s(fd, "step");
    if (step === "start") await textileService.startLabDipDyeing(id);
    else if (step === "ready") await textileService.markLabDipReady(id);
    else if (step === "submit") await textileService.submitLabDip(id);
    else if (step === "approve") await textileService.approveLabDip(id, s(fd, "comments"));
    else if (step === "reject") await textileService.rejectLabDip(id, s(fd, "reason") ?? "", s(fd, "comments"));
    else if (step === "resubmit") await textileService.resubmitLabDip(id);
    return { id };
  });
}

export async function createKnittingAction(fd: FormData) {
  return runAction(async () => {
    const r = await textileService.createKnitting({
      factoryId: s(fd, "factoryId"), machineNo: s(fd, "machineNo"), program: s(fd, "program"),
      orderId: s(fd, "orderId"), yarnLotId: s(fd, "yarnLotId"), greigeMaterialId: s(fd, "greigeMaterialId"),
      warehouseId: s(fd, "warehouseId"), plannedQty: n(fd, "plannedQty"), wastagePct: n(fd, "wastagePct"),
      productionDate: s(fd, "productionDate"), remarks: s(fd, "remarks"),
    });
    return { id: r.id };
  });
}

export async function knittingStepAction(fd: FormData) {
  return runAction(async () => {
    const id = s(fd, "id") ?? "";
    const step = s(fd, "step");
    if (step === "issue") await textileService.issueYarn(id);
    else if (step === "complete") {
      await textileService.completeKnitting({
        id,
        rejectQty: n(fd, "rejectQty") ?? 0,
        rolls: rows(fd, "rolls").map(([q, g, w, k]) => ({
          quantity: Number(q), gsm: g ? Number(g) : undefined, widthCm: w ? Number(w) : undefined, weightKg: k ? Number(k) : undefined,
        })),
      });
    } else if (step === "close") await textileService.closeKnitting(id);
    else if (step === "cancel") await textileService.cancelKnitting(id, s(fd, "reason") ?? "");
    return { id };
  });
}

export async function createDyeBatchAction(fd: FormData) {
  return runAction(async () => {
    const r = await textileService.createDyeBatch({
      factoryId: s(fd, "factoryId"), labDipId: s(fd, "labDipId"), greigeRollId: s(fd, "greigeRollId"),
      dyedMaterialId: s(fd, "dyedMaterialId"), dyeLot: s(fd, "dyeLot"), batchNo: s(fd, "batchNo"),
      color: s(fd, "color"), recipe: s(fd, "recipe"), inputQty: n(fd, "inputQty"), remarks: s(fd, "remarks"),
      chemicals: rows(fd, "chemicals").map(([name, qty, unit]) => ({ name, qty: Number(qty), unit: unit ?? "" })),
    });
    return { id: r.id };
  });
}

export async function dyeStepAction(fd: FormData) {
  return runAction(async () => {
    const id = s(fd, "id") ?? "";
    const step = s(fd, "step");
    if (step === "start") await textileService.startDyeBatch(id);
    else if (step === "complete") {
      await textileService.completeDyeBatch({
        id, outputQty: n(fd, "outputQty"), rejectQty: n(fd, "rejectQty") ?? 0,
        shade: s(fd, "shade"), reworkCount: n(fd, "reworkCount") ?? 0,
      });
    } else if (step === "close") await textileService.closeDyeBatch(id);
    else if (step === "cancel") await textileService.cancelDyeBatch(id, s(fd, "reason") ?? "");
    return { id };
  });
}

export async function createFinishingAction(fd: FormData) {
  return runAction(async () => {
    const r = await textileService.createFinishing({
      factoryId: s(fd, "factoryId"), dyeBatchId: s(fd, "dyeBatchId"), process: s(fd, "process"),
      inputQty: n(fd, "inputQty"), remarks: s(fd, "remarks"),
    });
    return { id: r.id };
  });
}

export async function finishingStepAction(fd: FormData) {
  return runAction(async () => {
    const id = s(fd, "id") ?? "";
    const step = s(fd, "step");
    if (step === "start") await textileService.startFinishing(id);
    else if (step === "complete") {
      await textileService.completeFinishing({
        id, outputQty: n(fd, "outputQty"), shrinkagePct: n(fd, "shrinkagePct"), gsmAfter: n(fd, "gsmAfter"),
      });
    } else if (step === "cancel") await textileService.cancelFinishing(id);
    return { id };
  });
}