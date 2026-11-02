import { buyerApi } from "@/lib/portal-api";
import { portalBuyerService } from "@/services/portal-buyer.service";

export const GET = buyerApi(() => portalBuyerService.listOrders());