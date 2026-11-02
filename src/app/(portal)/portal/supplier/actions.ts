"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { BusinessRuleError } from "@/lib/business-rules";
import { PortalAccessError } from "@/lib/portal-scope";
import { portalSupplierService } from "@/services/portal-supplier.service";
import { portalSupplierExtraService } from "@/services/portal-supplier-extra.service";

function text(e: unknown): string {
  if (e instanceof PortalAccessError || e instanceof BusinessRuleError) return e.message;
  if (e instanceof ZodError) return e.issues[0]?.message ?? "Invalid input";
  console.error(e);
  return "Something went wrong";
}

function back(path: string, kind: "ok" | "err", message: string): never {
  revalidatePath(path);
  redirect(`${path}?${kind}=${encodeURIComponent(message)}`);
}

// Khali field undefined hobe (zod optional-er jonno)
function s(fd: FormData, key: string): string | undefined {
  const v = fd.get(key);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
}
function n(fd: FormData, key: string): number | undefined {
  const v = s(fd, key);
  return v === undefined ? undefined : Number(v);
}

export async function confirmDateAction(fd: FormData) {
  const poId = s(fd, "poId") ?? "";
  const path = `/portal/supplier/pos/${poId}`;
  try {
    await portalSupplierService.confirmDate({ poId, confirmedDate: s(fd, "confirmedDate"), remarks: s(fd, "remarks") });
  } catch (e) {
    back(path, "err", text(e));
  }
  back(path, "ok", "Delivery date confirmed");
}

export async function shipmentUpdateAction(fd: FormData) {
  const poId = s(fd, "poId") ?? "";
  const path = `/portal/supplier/pos/${poId}`;
  try {
    await portalSupplierExtraService.addShipmentUpdate({
      poId,
      shippedDate: s(fd, "shippedDate"),
      etaDate: s(fd, "etaDate"),
      carrier: s(fd, "carrier"),
      trackingNo: s(fd, "trackingNo"),
      note: s(fd, "note"),
    });
  } catch (e) {
    back(path, "err", text(e));
  }
  back(path, "ok", "Shipment update saved");
}

export async function documentAction(fd: FormData) {
  const poId = s(fd, "poId") ?? "";
  const path = `/portal/supplier/pos/${poId}`;
  try {
    await portalSupplierExtraService.addDocument({
      poId,
      docType: s(fd, "docType"),
      fileName: s(fd, "fileName"),
      url: s(fd, "url"),
    });
  } catch (e) {
    back(path, "err", text(e));
  }
  back(path, "ok", "Document link added");
}

export async function quotationAction(fd: FormData) {
  const rfqId = s(fd, "rfqId") ?? "";
  const path = `/portal/supplier/rfqs/${rfqId}`;
  try {
    await portalSupplierExtraService.submitQuotation({
      rfqId,
      materialId: s(fd, "materialId"),
      unitPrice: n(fd, "unitPrice"),
      currency: s(fd, "currency"),
      leadTimeDays: n(fd, "leadTimeDays"),
      validUntil: s(fd, "validUntil"),
      notes: s(fd, "notes"),
    });
  } catch (e) {
    back(path, "err", text(e));
  }
  back(path, "ok", "Quotation submitted");
}