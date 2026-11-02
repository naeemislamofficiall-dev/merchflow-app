-- CreateEnum
CREATE TYPE "GrnStatus" AS ENUM ('DRAFT', 'POSTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "StockTxnType" AS ENUM ('GRN', 'ISSUE', 'RETURN', 'TRANSFER_IN', 'TRANSFER_OUT', 'ADJUSTMENT', 'STOCK_COUNT', 'DAMAGE', 'SCRAP');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('ACTIVE', 'RELEASED', 'CONSUMED');

-- CreateEnum
CREATE TYPE "IssueTarget" AS ENUM ('PRODUCTION_ORDER', 'CUTTING_ORDER', 'SAMPLE', 'DEPARTMENT', 'SUBCONTRACT');

-- CreateEnum
CREATE TYPE "AdjustmentReason" AS ENUM ('COUNT_CORRECTION', 'DAMAGE', 'SCRAP', 'LOSS', 'FOUND', 'SUPPLIER_RETURN', 'OTHER');

-- CreateEnum
CREATE TYPE "InspectionResult" AS ENUM ('PENDING', 'ACCEPTED', 'CONDITIONAL', 'REJECTED');

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "allowNegativeStock" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Grn" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "grnNo" TEXT NOT NULL,
    "poId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "receivedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "challanNo" TEXT,
    "remarks" TEXT,
    "status" "GrnStatus" NOT NULL DEFAULT 'DRAFT',
    "postedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Grn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrnLine" (
    "id" TEXT NOT NULL,
    "grnId" TEXT NOT NULL,
    "poLineId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "receivedQty" DECIMAL(14,4) NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'PCS',
    "lotNo" TEXT,
    "color" TEXT,
    "shade" TEXT,
    "binId" TEXT,
    "remarks" TEXT,
    "overReason" TEXT,
    "rollData" JSONB,
    "lotId" TEXT,

    CONSTRAINT "GrnLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryLot" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "lotNo" TEXT NOT NULL,
    "color" TEXT,
    "shade" TEXT,
    "supplierId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryLot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FabricRoll" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "rollNo" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "grnLineId" TEXT,
    "color" TEXT,
    "shade" TEXT,
    "gsm" DECIMAL(8,2),
    "widthCm" DECIMAL(8,2),
    "length" DECIMAL(12,3),
    "weightKg" DECIMAL(12,3),
    "quantity" DECIMAL(14,4) NOT NULL,
    "supplierId" TEXT,
    "warehouseId" TEXT NOT NULL,
    "binId" TEXT,
    "inspectionStatus" "InspectionResult" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FabricRoll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FabricInspection" (
    "id" TEXT NOT NULL,
    "rollId" TEXT NOT NULL,
    "inspectorId" TEXT NOT NULL,
    "inspectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" TEXT,
    "widthCm" DECIMAL(8,2),
    "gsm" DECIMAL(8,2),
    "length" DECIMAL(12,3),
    "defectPoints" INTEGER NOT NULL DEFAULT 0,
    "defects" JSONB,
    "shade" TEXT,
    "shrinkagePct" DECIMAL(5,2),
    "result" "InspectionResult" NOT NULL,
    "remarks" TEXT,

    CONSTRAINT "FabricInspection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockTransaction" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "lotId" TEXT,
    "rollId" TEXT,
    "warehouseId" TEXT NOT NULL,
    "binId" TEXT,
    "type" "StockTxnType" NOT NULL,
    "quantity" DECIMAL(14,4) NOT NULL,
    "unit" TEXT NOT NULL,
    "orderId" TEXT,
    "refType" TEXT,
    "refId" TEXT,
    "remarks" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockReservation" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "rollId" TEXT,
    "orderId" TEXT,
    "quantity" DECIMAL(14,4) NOT NULL,
    "consumedQty" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "status" "ReservationStatus" NOT NULL DEFAULT 'ACTIVE',
    "reason" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "releasedAt" TIMESTAMP(3),

    CONSTRAINT "StockReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialIssue" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "issueNo" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "targetType" "IssueTarget" NOT NULL,
    "orderId" TEXT,
    "sampleId" TEXT,
    "departmentId" TEXT,
    "referenceId" TEXT,
    "referenceNo" TEXT,
    "overrideReason" TEXT,
    "remarks" TEXT,
    "issuedById" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaterialIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialIssueLine" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "lotId" TEXT,
    "rollId" TEXT,
    "binId" TEXT,
    "quantity" DECIMAL(14,4) NOT NULL,
    "unit" TEXT NOT NULL,
    "returnedQty" DECIMAL(14,4) NOT NULL DEFAULT 0,

    CONSTRAINT "MaterialIssueLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialReturn" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "returnNo" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "remarks" TEXT,
    "returnedById" TEXT,
    "returnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaterialReturn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialReturnLine" (
    "id" TEXT NOT NULL,
    "returnId" TEXT NOT NULL,
    "issueLineId" TEXT NOT NULL,
    "quantity" DECIMAL(14,4) NOT NULL,
    "binId" TEXT,

    CONSTRAINT "MaterialReturnLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockAdjustment" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "adjustmentNo" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "lotId" TEXT,
    "rollId" TEXT,
    "warehouseId" TEXT NOT NULL,
    "binId" TEXT,
    "quantityChange" DECIMAL(14,4) NOT NULL,
    "reason" "AdjustmentReason" NOT NULL,
    "remarks" TEXT NOT NULL,
    "adjustedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Grn_poId_idx" ON "Grn"("poId");

-- CreateIndex
CREATE INDEX "Grn_status_idx" ON "Grn"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Grn_companyId_grnNo_key" ON "Grn"("companyId", "grnNo");

-- CreateIndex
CREATE INDEX "GrnLine_grnId_idx" ON "GrnLine"("grnId");

-- CreateIndex
CREATE INDEX "GrnLine_poLineId_idx" ON "GrnLine"("poLineId");

-- CreateIndex
CREATE INDEX "InventoryLot_materialId_idx" ON "InventoryLot"("materialId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryLot_companyId_materialId_lotNo_key" ON "InventoryLot"("companyId", "materialId", "lotNo");

-- CreateIndex
CREATE INDEX "FabricRoll_materialId_idx" ON "FabricRoll"("materialId");

-- CreateIndex
CREATE INDEX "FabricRoll_lotId_idx" ON "FabricRoll"("lotId");

-- CreateIndex
CREATE UNIQUE INDEX "FabricRoll_companyId_rollNo_key" ON "FabricRoll"("companyId", "rollNo");

-- CreateIndex
CREATE INDEX "FabricInspection_rollId_idx" ON "FabricInspection"("rollId");

-- CreateIndex
CREATE INDEX "StockTransaction_companyId_materialId_warehouseId_idx" ON "StockTransaction"("companyId", "materialId", "warehouseId");

-- CreateIndex
CREATE INDEX "StockTransaction_rollId_idx" ON "StockTransaction"("rollId");

-- CreateIndex
CREATE INDEX "StockTransaction_orderId_idx" ON "StockTransaction"("orderId");

-- CreateIndex
CREATE INDEX "StockTransaction_refType_refId_idx" ON "StockTransaction"("refType", "refId");

-- CreateIndex
CREATE INDEX "StockReservation_companyId_materialId_status_idx" ON "StockReservation"("companyId", "materialId", "status");

-- CreateIndex
CREATE INDEX "StockReservation_orderId_idx" ON "StockReservation"("orderId");

-- CreateIndex
CREATE INDEX "MaterialIssue_orderId_idx" ON "MaterialIssue"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "MaterialIssue_companyId_issueNo_key" ON "MaterialIssue"("companyId", "issueNo");

-- CreateIndex
CREATE INDEX "MaterialIssueLine_issueId_idx" ON "MaterialIssueLine"("issueId");

-- CreateIndex
CREATE INDEX "MaterialReturn_issueId_idx" ON "MaterialReturn"("issueId");

-- CreateIndex
CREATE UNIQUE INDEX "MaterialReturn_companyId_returnNo_key" ON "MaterialReturn"("companyId", "returnNo");

-- CreateIndex
CREATE INDEX "MaterialReturnLine_returnId_idx" ON "MaterialReturnLine"("returnId");

-- CreateIndex
CREATE INDEX "StockAdjustment_materialId_idx" ON "StockAdjustment"("materialId");

-- CreateIndex
CREATE UNIQUE INDEX "StockAdjustment_companyId_adjustmentNo_key" ON "StockAdjustment"("companyId", "adjustmentNo");

-- AddForeignKey
ALTER TABLE "Grn" ADD CONSTRAINT "Grn_poId_fkey" FOREIGN KEY ("poId") REFERENCES "PurchaseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Grn" ADD CONSTRAINT "Grn_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrnLine" ADD CONSTRAINT "GrnLine_grnId_fkey" FOREIGN KEY ("grnId") REFERENCES "Grn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrnLine" ADD CONSTRAINT "GrnLine_poLineId_fkey" FOREIGN KEY ("poLineId") REFERENCES "PurchaseOrderLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrnLine" ADD CONSTRAINT "GrnLine_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrnLine" ADD CONSTRAINT "GrnLine_binId_fkey" FOREIGN KEY ("binId") REFERENCES "Bin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrnLine" ADD CONSTRAINT "GrnLine_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "InventoryLot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryLot" ADD CONSTRAINT "InventoryLot_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FabricRoll" ADD CONSTRAINT "FabricRoll_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FabricRoll" ADD CONSTRAINT "FabricRoll_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "InventoryLot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FabricRoll" ADD CONSTRAINT "FabricRoll_grnLineId_fkey" FOREIGN KEY ("grnLineId") REFERENCES "GrnLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FabricRoll" ADD CONSTRAINT "FabricRoll_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FabricRoll" ADD CONSTRAINT "FabricRoll_binId_fkey" FOREIGN KEY ("binId") REFERENCES "Bin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FabricInspection" ADD CONSTRAINT "FabricInspection_rollId_fkey" FOREIGN KEY ("rollId") REFERENCES "FabricRoll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransaction" ADD CONSTRAINT "StockTransaction_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransaction" ADD CONSTRAINT "StockTransaction_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransaction" ADD CONSTRAINT "StockTransaction_binId_fkey" FOREIGN KEY ("binId") REFERENCES "Bin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransaction" ADD CONSTRAINT "StockTransaction_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "InventoryLot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransaction" ADD CONSTRAINT "StockTransaction_rollId_fkey" FOREIGN KEY ("rollId") REFERENCES "FabricRoll"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockReservation" ADD CONSTRAINT "StockReservation_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialIssue" ADD CONSTRAINT "MaterialIssue_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialIssueLine" ADD CONSTRAINT "MaterialIssueLine_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "MaterialIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialIssueLine" ADD CONSTRAINT "MaterialIssueLine_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialReturn" ADD CONSTRAINT "MaterialReturn_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "MaterialIssue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialReturnLine" ADD CONSTRAINT "MaterialReturnLine_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "MaterialReturn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialReturnLine" ADD CONSTRAINT "MaterialReturnLine_issueLineId_fkey" FOREIGN KEY ("issueLineId") REFERENCES "MaterialIssueLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockAdjustment" ADD CONSTRAINT "StockAdjustment_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockAdjustment" ADD CONSTRAINT "StockAdjustment_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
