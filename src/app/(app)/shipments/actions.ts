"use server";

import { dropEmpty, runAction } from "@/lib/action-result";
import { shipmentService } from "@/services/shipment.service";

type ShipmentValues = {
  factoryId: string;
  buyerId: string;
  forwarderId: string;
  mode: string;
  plannedShipDate: string;
  exFactoryDate: string;
  port: string;
  destination: string;
  vesselOrFlight: string;
  remarks: string;
};

export async function createShipmentAction(values: ShipmentValues) {
  return runAction(async () => {
    const row = await shipmentService.create(dropEmpty(values));
    return { id: row.id };
  });
}

function step(fn: (id: string) => Promise<unknown>) {
  return async (id: string) =>
    runAction(async () => {
      await fn(id);
      return { id };
    });
}

export const planShipmentAction = step((id) => shipmentService.plan(id));
export const documentsReadyAction = step((id) => shipmentService.documentsReady(id));
export const bookShipmentAction = step((id) => shipmentService.book(id));
export const shipShipmentAction = step((id) => shipmentService.ship(id));
export const deliverShipmentAction = step((id) => shipmentService.deliver(id));
export const closeShipmentAction = step((id) => shipmentService.close(id));

export async function cancelShipmentAction(id: string, reason: string) {
  return runAction(async () => {
    await shipmentService.cancel(id, reason);
    return { id };
  });
}

export async function allocateCartonsAction(id: string, cartonIds: string[]) {
  return runAction(async () => {
    const r = await shipmentService.allocate(id, cartonIds);
    return { added: r.added };
  });
}

export async function deallocateCartonAction(id: string, cartonId: string) {
  return runAction(async () => {
    await shipmentService.deallocate(id, cartonId);
    return { id };
  });
}

export async function addContainerAction(
  id: string,
  values: { containerNo: string; containerType: string; sealNo: string }
) {
  return runAction(async () => {
    const row = await shipmentService.addContainer(id, dropEmpty(values));
    return { id: row.id };
  });
}

export async function removeContainerAction(id: string, containerId: string) {
  return runAction(async () => {
    await shipmentService.removeContainer(id, containerId);
    return { id };
  });
}