import { supplierApi } from "@/lib/portal-api";
import { portalSupplierExtraService } from "@/services/portal-supplier-extra.service";

export const GET = supplierApi((_ctx, _req, params) => portalSupplierExtraService.listDocuments(params.id));
export const POST = supplierApi(async (_ctx, req, params) =>
  portalSupplierExtraService.addDocument({ ...(await req.json().catch(() => ({}))), poId: params.id }),
);