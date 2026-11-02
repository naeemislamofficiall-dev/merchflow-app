import { supplierApi } from "@/lib/portal-api";
import { portalSupplierService } from "@/services/portal-supplier.service";

export const POST = supplierApi(async (_ctx, req, params) =>
  portalSupplierService.confirmDate({ ...(await req.json().catch(() => ({}))), poId: params.id }),
);