import { supplierApi } from "@/lib/portal-api";
import { portalSupplierService } from "@/services/portal-supplier.service";

export const GET = supplierApi((_ctx, _req, params) => portalSupplierService.getRfq(params.id));