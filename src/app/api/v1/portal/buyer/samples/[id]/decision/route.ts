import { buyerApi } from "@/lib/portal-api";
import { portalBuyerService } from "@/services/portal-buyer.service";

export const POST = buyerApi(async (_ctx, req, params) =>
  portalBuyerService.decideSample({ ...(await req.json().catch(() => ({}))), sampleId: params.id }),
);