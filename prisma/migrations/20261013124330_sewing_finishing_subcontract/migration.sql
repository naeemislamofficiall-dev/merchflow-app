-- CreateEnum
CREATE TYPE "SubcontractStatus" AS ENUM ('SENT', 'VENDOR_RECEIVED', 'IN_PROCESS', 'RETURNED', 'QC_DONE', 'CLOSED', 'CANCELLED');

-- CreateTable
CREATE TABLE "SewingLog" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "productionOrderId" TEXT NOT NULL,
    "lineId" TEXT NOT NULL,
    "styleId" TEXT NOT NULL,
    "logDate" DATE NOT NULL,
    "hour" INTEGER NOT NULL,
    "target" INTEGER NOT NULL,
    "output" INTEGER NOT NULL,
    "reject" INTEGER NOT NULL DEFAULT 0,
    "rework" INTEGER NOT NULL DEFAULT 0,
    "downtimeMinutes" INTEGER NOT NULL DEFAULT 0,
    "downtimeReason" TEXT,
    "operators" INTEGER,
    "remarks" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SewingLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubcontractOrder" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "subcontractNo" TEXT NOT NULL,
    "productionOrderId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "process" "ProcessType" NOT NULL,
    "challanNo" TEXT NOT NULL,
    "sentQty" INTEGER NOT NULL,
    "receivedQty" INTEGER NOT NULL DEFAULT 0,
    "damageQty" INTEGER NOT NULL DEFAULT 0,
    "rejectQty" INTEGER NOT NULL DEFAULT 0,
    "rate" DECIMAL(14,4) NOT NULL,
    "currency" TEXT NOT NULL,
    "sentDate" DATE NOT NULL,
    "dueDate" DATE NOT NULL,
    "status" "SubcontractStatus" NOT NULL DEFAULT 'SENT',
    "vendorReceivedAt" TIMESTAMP(3),
    "processStartedAt" TIMESTAMP(3),
    "qcDoneAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "closeReason" TEXT,
    "cancelReason" TEXT,
    "remarks" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubcontractOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubcontractReceipt" (
    "id" TEXT NOT NULL,
    "subcontractId" TEXT NOT NULL,
    "receiptDate" DATE NOT NULL,
    "challanNo" TEXT,
    "receivedQty" INTEGER NOT NULL,
    "damageQty" INTEGER NOT NULL DEFAULT 0,
    "rejectQty" INTEGER NOT NULL DEFAULT 0,
    "remarks" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubcontractReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinishingLog" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "productionOrderId" TEXT NOT NULL,
    "styleId" TEXT NOT NULL,
    "logDate" DATE NOT NULL,
    "inputQty" INTEGER NOT NULL DEFAULT 0,
    "threadCutQty" INTEGER NOT NULL DEFAULT 0,
    "ironedQty" INTEGER NOT NULL DEFAULT 0,
    "foldedQty" INTEGER NOT NULL DEFAULT 0,
    "metalCheckedQty" INTEGER NOT NULL DEFAULT 0,
    "qcPassedQty" INTEGER NOT NULL DEFAULT 0,
    "reworkQty" INTEGER NOT NULL DEFAULT 0,
    "outputQty" INTEGER NOT NULL DEFAULT 0,
    "remarks" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinishingLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SewingLog_productionOrderId_idx" ON "SewingLog"("productionOrderId");

-- CreateIndex
CREATE INDEX "SewingLog_factoryId_logDate_idx" ON "SewingLog"("factoryId", "logDate");

-- CreateIndex
CREATE UNIQUE INDEX "SewingLog_lineId_logDate_hour_key" ON "SewingLog"("lineId", "logDate", "hour");

-- CreateIndex
CREATE INDEX "SubcontractOrder_productionOrderId_idx" ON "SubcontractOrder"("productionOrderId");

-- CreateIndex
CREATE INDEX "SubcontractOrder_status_dueDate_idx" ON "SubcontractOrder"("status", "dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "SubcontractOrder_companyId_subcontractNo_key" ON "SubcontractOrder"("companyId", "subcontractNo");

-- CreateIndex
CREATE UNIQUE INDEX "SubcontractOrder_companyId_challanNo_key" ON "SubcontractOrder"("companyId", "challanNo");

-- CreateIndex
CREATE INDEX "SubcontractReceipt_subcontractId_idx" ON "SubcontractReceipt"("subcontractId");

-- CreateIndex
CREATE INDEX "FinishingLog_factoryId_logDate_idx" ON "FinishingLog"("factoryId", "logDate");

-- CreateIndex
CREATE UNIQUE INDEX "FinishingLog_productionOrderId_logDate_key" ON "FinishingLog"("productionOrderId", "logDate");

-- AddForeignKey
ALTER TABLE "SewingLog" ADD CONSTRAINT "SewingLog_productionOrderId_fkey" FOREIGN KEY ("productionOrderId") REFERENCES "ProductionOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SewingLog" ADD CONSTRAINT "SewingLog_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "Line"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubcontractOrder" ADD CONSTRAINT "SubcontractOrder_productionOrderId_fkey" FOREIGN KEY ("productionOrderId") REFERENCES "ProductionOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubcontractOrder" ADD CONSTRAINT "SubcontractOrder_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubcontractReceipt" ADD CONSTRAINT "SubcontractReceipt_subcontractId_fkey" FOREIGN KEY ("subcontractId") REFERENCES "SubcontractOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinishingLog" ADD CONSTRAINT "FinishingLog_productionOrderId_fkey" FOREIGN KEY ("productionOrderId") REFERENCES "ProductionOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
