-- T2 PPC: shudhu notun enum + 2-ta table. Existing table-e kichu bodlay na.
CREATE TYPE "PpcAllocationStatus" AS ENUM ('PLANNED', 'RELEASED', 'CANCELLED');

CREATE TABLE "PpcAllocation" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "factoryId" TEXT NOT NULL,
  "productionOrderId" TEXT NOT NULL,
  "lineId" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "plannedQty" INTEGER NOT NULL,
  "status" "PpcAllocationStatus" NOT NULL DEFAULT 'PLANNED',
  "remarks" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PpcAllocation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FactoryHoliday" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "factoryId" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "reason" TEXT NOT NULL,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FactoryHoliday_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PpcAllocation_factoryId_date_idx" ON "PpcAllocation"("factoryId", "date");
CREATE INDEX "PpcAllocation_lineId_date_idx" ON "PpcAllocation"("lineId", "date");
CREATE INDEX "PpcAllocation_productionOrderId_idx" ON "PpcAllocation"("productionOrderId");
CREATE UNIQUE INDEX "PpcAllocation_productionOrderId_lineId_date_key" ON "PpcAllocation"("productionOrderId", "lineId", "date");

CREATE INDEX "FactoryHoliday_companyId_factoryId_idx" ON "FactoryHoliday"("companyId", "factoryId");
CREATE UNIQUE INDEX "FactoryHoliday_factoryId_date_key" ON "FactoryHoliday"("factoryId", "date");

ALTER TABLE "PpcAllocation" ADD CONSTRAINT "PpcAllocation_productionOrderId_fkey" FOREIGN KEY ("productionOrderId") REFERENCES "ProductionOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PpcAllocation" ADD CONSTRAINT "PpcAllocation_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "Line"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
