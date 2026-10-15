-- CreateEnum
CREATE TYPE "ProductionStatus" AS ENUM ('PLANNED', 'RELEASED', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ProcessType" AS ENUM ('CUTTING', 'PRINTING', 'EMBROIDERY', 'SEWING', 'WASHING', 'FINISHING', 'PACKING');

-- CreateEnum
CREATE TYPE "CutPlanStatus" AS ENUM ('PLANNED', 'FABRIC_RESERVED', 'CUTTING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LayStatus" AS ENUM ('PLANNED', 'CUT');

-- AlterTable
ALTER TABLE "Line" ADD COLUMN     "efficiencyPct" DECIMAL(5,2),
ADD COLUMN     "minutesPerDay" INTEGER NOT NULL DEFAULT 480,
ADD COLUMN     "operators" INTEGER;

-- CreateTable
CREATE TABLE "ProductionRoute" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionRoute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionRouteStep" (
    "id" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "process" "ProcessType" NOT NULL,

    CONSTRAINT "ProductionRouteStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionOperation" (
    "id" TEXT NOT NULL,
    "styleId" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "machineType" TEXT,
    "smv" DECIMAL(8,3) NOT NULL,
    "skillLevel" TEXT,
    "operators" DECIMAL(5,2) NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductionOperation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionOrder" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "productionNo" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "styleId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "completedQty" INTEGER NOT NULL DEFAULT 0,
    "allowancePct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "lineId" TEXT,
    "routeId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 3,
    "status" "ProductionStatus" NOT NULL DEFAULT 'PLANNED',
    "overproductionReason" TEXT,
    "pauseReason" TEXT,
    "remarks" TEXT,
    "releasedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CutPlan" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "cutPlanNo" TEXT NOT NULL,
    "productionOrderId" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "sizeRatio" JSONB NOT NULL,
    "plannedPlies" INTEGER NOT NULL,
    "plannedOutput" INTEGER NOT NULL,
    "fabricRequirement" DECIMAL(14,4) NOT NULL,
    "reservationId" TEXT,
    "status" "CutPlanStatus" NOT NULL DEFAULT 'PLANNED',
    "cancelReason" TEXT,
    "remarks" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CutPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lay" (
    "id" TEXT NOT NULL,
    "cutPlanId" TEXT NOT NULL,
    "layNo" INTEGER NOT NULL,
    "plies" INTEGER NOT NULL,
    "markerLength" DECIMAL(8,3),
    "markerWidthCm" DECIMAL(8,2),
    "markerEfficiencyPct" DECIMAL(5,2),
    "status" "LayStatus" NOT NULL DEFAULT 'PLANNED',
    "actualPlies" INTEGER,
    "fabricUsed" DECIMAL(14,4),
    "cutAt" TIMESTAMP(3),
    "cutById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bundle" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "bundleNo" TEXT NOT NULL,
    "productionOrderId" TEXT NOT NULL,
    "cutPlanId" TEXT NOT NULL,
    "layId" TEXT NOT NULL,
    "styleId" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "cutNumber" TEXT NOT NULL,
    "destinationLineId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bundle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductionRoute_companyId_code_key" ON "ProductionRoute"("companyId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionRouteStep_routeId_seq_key" ON "ProductionRouteStep"("routeId", "seq");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionOperation_styleId_seq_key" ON "ProductionOperation"("styleId", "seq");

-- CreateIndex
CREATE INDEX "ProductionOrder_orderId_idx" ON "ProductionOrder"("orderId");

-- CreateIndex
CREATE INDEX "ProductionOrder_status_idx" ON "ProductionOrder"("status");

-- CreateIndex
CREATE INDEX "ProductionOrder_factoryId_startDate_idx" ON "ProductionOrder"("factoryId", "startDate");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionOrder_companyId_productionNo_key" ON "ProductionOrder"("companyId", "productionNo");

-- CreateIndex
CREATE INDEX "CutPlan_productionOrderId_idx" ON "CutPlan"("productionOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "CutPlan_companyId_cutPlanNo_key" ON "CutPlan"("companyId", "cutPlanNo");

-- CreateIndex
CREATE UNIQUE INDEX "Lay_cutPlanId_layNo_key" ON "Lay"("cutPlanId", "layNo");

-- CreateIndex
CREATE INDEX "Bundle_productionOrderId_idx" ON "Bundle"("productionOrderId");

-- CreateIndex
CREATE INDEX "Bundle_cutPlanId_idx" ON "Bundle"("cutPlanId");

-- CreateIndex
CREATE UNIQUE INDEX "Bundle_companyId_bundleNo_key" ON "Bundle"("companyId", "bundleNo");

-- AddForeignKey
ALTER TABLE "ProductionRouteStep" ADD CONSTRAINT "ProductionRouteStep_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "ProductionRoute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionOperation" ADD CONSTRAINT "ProductionOperation_styleId_fkey" FOREIGN KEY ("styleId") REFERENCES "Style"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionOrder" ADD CONSTRAINT "ProductionOrder_factoryId_fkey" FOREIGN KEY ("factoryId") REFERENCES "Factory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionOrder" ADD CONSTRAINT "ProductionOrder_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionOrder" ADD CONSTRAINT "ProductionOrder_styleId_fkey" FOREIGN KEY ("styleId") REFERENCES "Style"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionOrder" ADD CONSTRAINT "ProductionOrder_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "Line"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionOrder" ADD CONSTRAINT "ProductionOrder_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "ProductionRoute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CutPlan" ADD CONSTRAINT "CutPlan_productionOrderId_fkey" FOREIGN KEY ("productionOrderId") REFERENCES "ProductionOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lay" ADD CONSTRAINT "Lay_cutPlanId_fkey" FOREIGN KEY ("cutPlanId") REFERENCES "CutPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bundle" ADD CONSTRAINT "Bundle_productionOrderId_fkey" FOREIGN KEY ("productionOrderId") REFERENCES "ProductionOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bundle" ADD CONSTRAINT "Bundle_cutPlanId_fkey" FOREIGN KEY ("cutPlanId") REFERENCES "CutPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bundle" ADD CONSTRAINT "Bundle_layId_fkey" FOREIGN KEY ("layId") REFERENCES "Lay"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
