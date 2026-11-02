-- CreateEnum
CREATE TYPE "InspectionStage" AS ENUM ('INCOMING', 'FABRIC', 'CUTTING', 'INLINE', 'ENDLINE', 'FINISHING', 'FINAL', 'PRESHIPMENT');

-- CreateEnum
CREATE TYPE "DefectSeverity" AS ENUM ('MINOR', 'MAJOR', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AqlResult" AS ENUM ('PASS', 'FAIL', 'HOLD');

-- CreateEnum
CREATE TYPE "CapaStatus" AS ENUM ('OPEN', 'ROOT_CAUSE', 'ACTION', 'VERIFICATION', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PackType" AS ENUM ('SOLID', 'ASSORTMENT', 'RATIO', 'PREPACK');

-- CreateEnum
CREATE TYPE "CartonStatus" AS ENUM ('OPEN', 'CLOSED', 'SHIPPED');

-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('DRAFT', 'PLANNED', 'DOCUMENTS_READY', 'BOOKED', 'SHIPPED', 'DELIVERED', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ShipMode" AS ENUM ('SEA', 'AIR', 'ROAD', 'COURIER');

-- CreateEnum
CREATE TYPE "ExportDocStatus" AS ENUM ('DRAFT', 'READY', 'SUBMITTED', 'HANDED_OVER');

-- CreateTable
CREATE TABLE "Defect" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "severity" "DefectSeverity" NOT NULL DEFAULT 'MAJOR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Defect_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inspection" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "inspectionNo" TEXT NOT NULL,
    "stage" "InspectionStage" NOT NULL,
    "productionOrderId" TEXT,
    "orderId" TEXT,
    "styleId" TEXT,
    "lineId" TEXT,
    "operation" TEXT,
    "sampleSize" INTEGER NOT NULL,
    "defectiveQty" INTEGER NOT NULL DEFAULT 0,
    "inspectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "inspectorId" TEXT,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Inspection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DefectOccurrence" (
    "id" TEXT NOT NULL,
    "inspectionId" TEXT NOT NULL,
    "defectId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "severity" "DefectSeverity" NOT NULL,
    "rootCause" TEXT,
    "correctiveAction" TEXT,

    CONSTRAINT "DefectOccurrence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AqlInspection" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "inspectionNo" TEXT NOT NULL,
    "stage" "InspectionStage" NOT NULL,
    "orderId" TEXT NOT NULL,
    "styleId" TEXT,
    "productionOrderId" TEXT,
    "buyerId" TEXT,
    "inspectionLevel" TEXT NOT NULL DEFAULT 'II',
    "lotSize" INTEGER NOT NULL,
    "sampleSize" INTEGER NOT NULL,
    "aqlMajor" DECIMAL(5,2) NOT NULL,
    "aqlMinor" DECIMAL(5,2) NOT NULL,
    "acceptMajor" INTEGER NOT NULL,
    "rejectMajor" INTEGER NOT NULL,
    "acceptMinor" INTEGER NOT NULL,
    "rejectMinor" INTEGER NOT NULL,
    "foundCritical" INTEGER,
    "foundMajor" INTEGER,
    "foundMinor" INTEGER,
    "result" "AqlResult" NOT NULL DEFAULT 'HOLD',
    "inspectedAt" TIMESTAMP(3),
    "inspectorId" TEXT,
    "overrideById" TEXT,
    "overrideReason" TEXT,
    "overriddenAt" TIMESTAMP(3),
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AqlInspection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Capa" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "factoryId" TEXT,
    "capaNo" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT,
    "problem" TEXT NOT NULL,
    "sourceType" TEXT,
    "sourceId" TEXT,
    "status" "CapaStatus" NOT NULL DEFAULT 'OPEN',
    "rootCause" TEXT,
    "correctiveAction" TEXT,
    "preventiveAction" TEXT,
    "ownerId" TEXT,
    "dueDate" TIMESTAMP(3),
    "verificationNote" TEXT,
    "verifiedById" TEXT,
    "closedAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Capa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackingPlan" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "styleId" TEXT NOT NULL,
    "packType" "PackType" NOT NULL DEFAULT 'SOLID',
    "pcsPerCarton" INTEGER,
    "ratio" JSONB,
    "cartonLengthCm" DECIMAL(8,2),
    "cartonWidthCm" DECIMAL(8,2),
    "cartonHeightCm" DECIMAL(8,2),
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PackingPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Carton" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "cartonNo" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "packType" "PackType" NOT NULL DEFAULT 'SOLID',
    "status" "CartonStatus" NOT NULL DEFAULT 'OPEN',
    "grossWeightKg" DECIMAL(10,3),
    "netWeightKg" DECIMAL(10,3),
    "lengthCm" DECIMAL(8,2),
    "widthCm" DECIMAL(8,2),
    "heightCm" DECIMAL(8,2),
    "barcode" TEXT NOT NULL,
    "closedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Carton_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartonLine" (
    "id" TEXT NOT NULL,
    "cartonId" TEXT NOT NULL,
    "productionOrderId" TEXT NOT NULL,
    "styleId" TEXT NOT NULL,
    "colorId" TEXT NOT NULL,
    "sizeId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "CartonLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Forwarder" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Forwarder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shipment" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "shipmentNo" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "status" "ShipmentStatus" NOT NULL DEFAULT 'DRAFT',
    "mode" "ShipMode" NOT NULL DEFAULT 'SEA',
    "exFactoryDate" TIMESTAMP(3),
    "plannedShipDate" TIMESTAMP(3) NOT NULL,
    "actualShipDate" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "port" TEXT,
    "destination" TEXT,
    "vesselOrFlight" TEXT,
    "forwarderId" TEXT,
    "blNo" TEXT,
    "invoiceNo" TEXT,
    "remarks" TEXT,
    "cancelReason" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShipmentLine" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "cartonId" TEXT NOT NULL,

    CONSTRAINT "ShipmentLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Container" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "containerNo" TEXT NOT NULL,
    "containerType" TEXT,
    "sealNo" TEXT,

    CONSTRAINT "Container_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExportDocument" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "shipmentId" TEXT,
    "orderId" TEXT,
    "docType" TEXT NOT NULL,
    "docNo" TEXT,
    "issueDate" TIMESTAMP(3),
    "amount" DECIMAL(16,2),
    "currency" TEXT,
    "status" "ExportDocStatus" NOT NULL DEFAULT 'DRAFT',
    "handoverTo" TEXT,
    "handoverDate" TIMESTAMP(3),
    "remarks" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExportDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Defect_companyId_code_key" ON "Defect"("companyId", "code");

-- CreateIndex
CREATE INDEX "Inspection_factoryId_inspectedAt_idx" ON "Inspection"("factoryId", "inspectedAt");

-- CreateIndex
CREATE INDEX "Inspection_productionOrderId_idx" ON "Inspection"("productionOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "Inspection_companyId_inspectionNo_key" ON "Inspection"("companyId", "inspectionNo");

-- CreateIndex
CREATE INDEX "DefectOccurrence_inspectionId_idx" ON "DefectOccurrence"("inspectionId");

-- CreateIndex
CREATE INDEX "DefectOccurrence_defectId_idx" ON "DefectOccurrence"("defectId");

-- CreateIndex
CREATE INDEX "AqlInspection_orderId_stage_createdAt_idx" ON "AqlInspection"("orderId", "stage", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AqlInspection_companyId_inspectionNo_key" ON "AqlInspection"("companyId", "inspectionNo");

-- CreateIndex
CREATE INDEX "Capa_status_idx" ON "Capa"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Capa_companyId_capaNo_key" ON "Capa"("companyId", "capaNo");

-- CreateIndex
CREATE UNIQUE INDEX "PackingPlan_orderId_styleId_key" ON "PackingPlan"("orderId", "styleId");

-- CreateIndex
CREATE INDEX "Carton_orderId_status_idx" ON "Carton"("orderId", "status");

-- CreateIndex
CREATE INDEX "Carton_factoryId_idx" ON "Carton"("factoryId");

-- CreateIndex
CREATE UNIQUE INDEX "Carton_companyId_cartonNo_key" ON "Carton"("companyId", "cartonNo");

-- CreateIndex
CREATE INDEX "CartonLine_productionOrderId_idx" ON "CartonLine"("productionOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "CartonLine_cartonId_productionOrderId_colorId_sizeId_key" ON "CartonLine"("cartonId", "productionOrderId", "colorId", "sizeId");

-- CreateIndex
CREATE UNIQUE INDEX "Forwarder_companyId_code_key" ON "Forwarder"("companyId", "code");

-- CreateIndex
CREATE INDEX "Shipment_status_plannedShipDate_idx" ON "Shipment"("status", "plannedShipDate");

-- CreateIndex
CREATE UNIQUE INDEX "Shipment_companyId_shipmentNo_key" ON "Shipment"("companyId", "shipmentNo");

-- CreateIndex
CREATE UNIQUE INDEX "ShipmentLine_cartonId_key" ON "ShipmentLine"("cartonId");

-- CreateIndex
CREATE INDEX "ShipmentLine_shipmentId_idx" ON "ShipmentLine"("shipmentId");

-- CreateIndex
CREATE UNIQUE INDEX "Container_shipmentId_containerNo_key" ON "Container"("shipmentId", "containerNo");

-- CreateIndex
CREATE INDEX "ExportDocument_companyId_docType_idx" ON "ExportDocument"("companyId", "docType");

-- CreateIndex
CREATE INDEX "ExportDocument_shipmentId_idx" ON "ExportDocument"("shipmentId");

-- AddForeignKey
ALTER TABLE "DefectOccurrence" ADD CONSTRAINT "DefectOccurrence_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DefectOccurrence" ADD CONSTRAINT "DefectOccurrence_defectId_fkey" FOREIGN KEY ("defectId") REFERENCES "Defect"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartonLine" ADD CONSTRAINT "CartonLine_cartonId_fkey" FOREIGN KEY ("cartonId") REFERENCES "Carton"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_forwarderId_fkey" FOREIGN KEY ("forwarderId") REFERENCES "Forwarder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentLine" ADD CONSTRAINT "ShipmentLine_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentLine" ADD CONSTRAINT "ShipmentLine_cartonId_fkey" FOREIGN KEY ("cartonId") REFERENCES "Carton"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Container" ADD CONSTRAINT "Container_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExportDocument" ADD CONSTRAINT "ExportDocument_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
