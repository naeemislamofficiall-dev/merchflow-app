-- CreateEnum
CREATE TYPE "SampleType" AS ENUM ('PROTO', 'FIT', 'SIZE_SET', 'PP', 'SALESMAN');

-- CreateEnum
CREATE TYPE "SampleStatus" AS ENUM ('REQUESTED', 'IN_PROGRESS', 'SENT', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TnaTaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'DONE', 'DELAYED');

-- CreateEnum
CREATE TYPE "CostSheetStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "BomStatus" AS ENUM ('DRAFT', 'APPROVED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CostCategory" AS ENUM ('FABRIC', 'TRIM', 'CM', 'WASH', 'PRINT_EMB', 'OVERHEAD', 'OTHER');

-- CreateEnum
CREATE TYPE "BomItemType" AS ENUM ('FABRIC', 'TRIM', 'PACKING');

-- CreateTable
CREATE TABLE "SampleRequest" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "sampleNo" TEXT NOT NULL,
    "styleId" TEXT NOT NULL,
    "sampleType" "SampleType" NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "requestedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "status" "SampleStatus" NOT NULL DEFAULT 'REQUESTED',
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SampleRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TnaTemplate" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TnaTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TnaTemplateTask" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "daysBefore" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TnaTemplateTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TnaPlan" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "styleId" TEXT NOT NULL,
    "templateId" TEXT,
    "shipDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TnaPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TnaTask" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "plannedDate" TIMESTAMP(3) NOT NULL,
    "actualDate" TIMESTAMP(3),
    "status" "TnaTaskStatus" NOT NULL DEFAULT 'PENDING',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TnaTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostSheet" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "styleId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "marginPct" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "totalCost" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "quotedPrice" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "status" "CostSheetStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CostSheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostItem" (
    "id" TEXT NOT NULL,
    "costSheetId" TEXT NOT NULL,
    "category" "CostCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'PCS',
    "consumption" DECIMAL(12,4) NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "wastagePct" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "amount" DECIMAL(14,4) NOT NULL DEFAULT 0,

    CONSTRAINT "CostItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bom" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "styleId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "BomStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BomItem" (
    "id" TEXT NOT NULL,
    "bomId" TEXT NOT NULL,
    "itemType" "BomItemType" NOT NULL,
    "itemName" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'PCS',
    "consumption" DECIMAL(12,4) NOT NULL DEFAULT 1,
    "wastagePct" DECIMAL(6,2) NOT NULL DEFAULT 0,

    CONSTRAINT "BomItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MrpRun" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "bomId" TEXT NOT NULL,
    "orderQty" INTEGER NOT NULL,
    "runDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MrpRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MrpLine" (
    "id" TEXT NOT NULL,
    "mrpRunId" TEXT NOT NULL,
    "bomItemId" TEXT NOT NULL,
    "grossQty" DECIMAL(14,4) NOT NULL,
    "stockQty" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "netQty" DECIMAL(14,4) NOT NULL,

    CONSTRAINT "MrpLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SampleRequest_styleId_idx" ON "SampleRequest"("styleId");

-- CreateIndex
CREATE INDEX "SampleRequest_status_idx" ON "SampleRequest"("status");

-- CreateIndex
CREATE UNIQUE INDEX "SampleRequest_companyId_sampleNo_key" ON "SampleRequest"("companyId", "sampleNo");

-- CreateIndex
CREATE UNIQUE INDEX "TnaTemplate_companyId_name_key" ON "TnaTemplate"("companyId", "name");

-- CreateIndex
CREATE INDEX "TnaTemplateTask_templateId_idx" ON "TnaTemplateTask"("templateId");

-- CreateIndex
CREATE INDEX "TnaPlan_styleId_idx" ON "TnaPlan"("styleId");

-- CreateIndex
CREATE INDEX "TnaTask_planId_idx" ON "TnaTask"("planId");

-- CreateIndex
CREATE INDEX "TnaTask_status_idx" ON "TnaTask"("status");

-- CreateIndex
CREATE INDEX "CostSheet_status_idx" ON "CostSheet"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CostSheet_styleId_version_key" ON "CostSheet"("styleId", "version");

-- CreateIndex
CREATE INDEX "CostItem_costSheetId_idx" ON "CostItem"("costSheetId");

-- CreateIndex
CREATE INDEX "Bom_status_idx" ON "Bom"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Bom_styleId_version_key" ON "Bom"("styleId", "version");

-- CreateIndex
CREATE INDEX "BomItem_bomId_idx" ON "BomItem"("bomId");

-- CreateIndex
CREATE INDEX "MrpRun_bomId_idx" ON "MrpRun"("bomId");

-- CreateIndex
CREATE INDEX "MrpLine_mrpRunId_idx" ON "MrpLine"("mrpRunId");

-- AddForeignKey
ALTER TABLE "SampleRequest" ADD CONSTRAINT "SampleRequest_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SampleRequest" ADD CONSTRAINT "SampleRequest_styleId_fkey" FOREIGN KEY ("styleId") REFERENCES "Style"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TnaTemplate" ADD CONSTRAINT "TnaTemplate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TnaTemplateTask" ADD CONSTRAINT "TnaTemplateTask_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "TnaTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TnaPlan" ADD CONSTRAINT "TnaPlan_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TnaPlan" ADD CONSTRAINT "TnaPlan_styleId_fkey" FOREIGN KEY ("styleId") REFERENCES "Style"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TnaPlan" ADD CONSTRAINT "TnaPlan_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "TnaTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TnaTask" ADD CONSTRAINT "TnaTask_planId_fkey" FOREIGN KEY ("planId") REFERENCES "TnaPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostSheet" ADD CONSTRAINT "CostSheet_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostSheet" ADD CONSTRAINT "CostSheet_styleId_fkey" FOREIGN KEY ("styleId") REFERENCES "Style"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostItem" ADD CONSTRAINT "CostItem_costSheetId_fkey" FOREIGN KEY ("costSheetId") REFERENCES "CostSheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bom" ADD CONSTRAINT "Bom_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bom" ADD CONSTRAINT "Bom_styleId_fkey" FOREIGN KEY ("styleId") REFERENCES "Style"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BomItem" ADD CONSTRAINT "BomItem_bomId_fkey" FOREIGN KEY ("bomId") REFERENCES "Bom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MrpRun" ADD CONSTRAINT "MrpRun_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MrpRun" ADD CONSTRAINT "MrpRun_bomId_fkey" FOREIGN KEY ("bomId") REFERENCES "Bom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MrpLine" ADD CONSTRAINT "MrpLine_mrpRunId_fkey" FOREIGN KEY ("mrpRunId") REFERENCES "MrpRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MrpLine" ADD CONSTRAINT "MrpLine_bomItemId_fkey" FOREIGN KEY ("bomItemId") REFERENCES "BomItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
