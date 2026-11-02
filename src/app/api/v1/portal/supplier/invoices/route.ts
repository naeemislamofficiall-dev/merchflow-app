import { supplierApi } from "@/lib/portal-api";
import { portalSupplierExtraService } from "@/services/portal-supplier-extra.service";

export const GET = supplierApi(() => portalSupplierExtraService.listInvoices());