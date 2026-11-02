import { supplierApi } from "@/lib/portal-api";
import { portalSupplierExtraService } from "@/services/portal-supplier-extra.service";

export const POST = supplierApi(async (_ctx, req, params) =>
  portalSupplierExtraService.submitQuotation({ ...(await req.json().catch(() => ({}))), rfqId: params.id }),
);