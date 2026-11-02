import { supplierApi } from "@/lib/portal-api";
import { portalSupplierService } from "@/services/portal-supplier.service";

export const GET = supplierApi(() => portalSupplierService.listPos());