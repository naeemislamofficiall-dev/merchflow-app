/*
  Warnings:

  - The values [IN_PROGRESS] on the enum `SampleStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'IN_PRODUCTION', 'PARTIALLY_SHIPPED', 'FULLY_SHIPPED', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SampleDecision" AS ENUM ('APPROVED', 'REJECTED');

-- AlterEnum
BEGIN;
CREATE TYPE "SampleStatus_new" AS ENUM ('REQUESTED', 'IN_DEVELOPMENT', 'INTERNAL_QC', 'SENT', 'BUYER_REVIEW', 'APPROVED', 'REJECTED', 'REVISION', 'CANCELLED');
ALTER TABLE "public"."SampleRequest" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "SampleRequest" ALTER COLUMN "status" TYPE "SampleStatus_new" USING ("status"::text::"SampleStatus_new");
ALTER TYPE "SampleStatus" RENAME TO "SampleStatus_old";
ALTER TYPE "SampleStatus_new" RENAME TO "SampleStatus";
DROP TYPE "public"."SampleStatus_old";
ALTER TABLE "SampleRequest" ALTER COLUMN "status" SET DEFAULT 'REQUESTED';
COMMIT;

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SampleType" ADD VALUE 'SMS';
ALTER TYPE "SampleType" ADD VALUE 'TOP';
ALTER TYPE "SampleType" ADD VALUE 'SHIPMENT';
ALTER TYPE "SampleType" ADD VALUE 'PHOTO';
ALTER TYPE "SampleType" ADD VALUE 'WASH_TEST';

-- AlterTable
ALTER TABLE "MrpLine" ADD COLUMN     "incomingQty" DECIMAL(14,4) NOT NULL DEFAULT 0,
ADD COLUMN     "reservedQty" DECIMAL(14,4) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "MrpRun" ADD COLUMN     "orderId" TEXT;

-- AlterTable
ALTER TABLE "SampleRequest" ADD COLUMN     "actualCompletion" TIMESTAMP(3),
ADD COLUMN     "assignedDepartmentId" TEXT,
ADD COLUMN     "assignedToId" TEXT,
ADD COLUMN     "buyerResponse" TEXT,
ADD COLUMN     "cost" DECIMAL(14,4),
ADD COLUMN     "courier" TEXT,
ADD COLUMN     "orderId" TEXT,
ADD COLUMN     "plannedCompletion" TIMESTAMP(3),
ADD COLUMN     "revisionCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "sentDate" TIMESTAMP(3),
ADD COLUMN     "trackingNo" TEXT;

-- AlterTable
ALTER TABLE "Style" ADD COLUMN     "seasonId" TEXT;

-- AlterTable
ALTER TABLE "TnaPlan" ADD COLUMN     "orderId" TEXT;

-- CreateTable
CREATE TABLE "Season" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "orderNo" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "buyerPoNo" TEXT,
    "seasonId" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "orderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "shipDate" TIMESTAMP(3),
    "status" "OrderStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderLine" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "styleId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "shipDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderAmendment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "amendmentNo" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "previousValues" JSONB NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderAmendment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StyleRevision" (
    "id" TEXT NOT NULL,
    "styleId" TEXT NOT NULL,
    "revisionNo" INTEGER NOT NULL,
    "changeNote" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StyleRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TechPack" (
    "id" TEXT NOT NULL,
    "styleId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT 'v1',
    "fileUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TechPack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SampleApproval" (
    "id" TEXT NOT NULL,
    "sampleId" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "decision" "SampleDecision" NOT NULL,
    "comments" TEXT,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SampleApproval_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Season_companyId_code_key" ON "Season"("companyId", "code");

-- CreateIndex
CREATE INDEX "Order_buyerId_idx" ON "Order"("buyerId");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Order_companyId_orderNo_key" ON "Order"("companyId", "orderNo");

-- CreateIndex
CREATE INDEX "OrderLine_orderId_idx" ON "OrderLine"("orderId");

-- CreateIndex
CREATE INDEX "OrderLine_styleId_idx" ON "OrderLine"("styleId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderAmendment_orderId_amendmentNo_key" ON "OrderAmendment"("orderId", "amendmentNo");

-- CreateIndex
CREATE UNIQUE INDEX "StyleRevision_styleId_revisionNo_key" ON "StyleRevision"("styleId", "revisionNo");

-- CreateIndex
CREATE INDEX "TechPack_styleId_idx" ON "TechPack"("styleId");

-- CreateIndex
CREATE UNIQUE INDEX "SampleApproval_sampleId_round_key" ON "SampleApproval"("sampleId", "round");

-- CreateIndex
CREATE INDEX "MrpRun_orderId_idx" ON "MrpRun"("orderId");

-- CreateIndex
CREATE INDEX "SampleRequest_orderId_idx" ON "SampleRequest"("orderId");

-- CreateIndex
CREATE INDEX "TnaPlan_orderId_idx" ON "TnaPlan"("orderId");

-- AddForeignKey
ALTER TABLE "Style" ADD CONSTRAINT "Style_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SampleRequest" ADD CONSTRAINT "SampleRequest_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SampleRequest" ADD CONSTRAINT "SampleRequest_assignedDepartmentId_fkey" FOREIGN KEY ("assignedDepartmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SampleRequest" ADD CONSTRAINT "SampleRequest_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TnaPlan" ADD CONSTRAINT "TnaPlan_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MrpRun" ADD CONSTRAINT "MrpRun_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Season" ADD CONSTRAINT "Season_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "Buyer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderLine" ADD CONSTRAINT "OrderLine_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderLine" ADD CONSTRAINT "OrderLine_styleId_fkey" FOREIGN KEY ("styleId") REFERENCES "Style"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderAmendment" ADD CONSTRAINT "OrderAmendment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StyleRevision" ADD CONSTRAINT "StyleRevision_styleId_fkey" FOREIGN KEY ("styleId") REFERENCES "Style"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechPack" ADD CONSTRAINT "TechPack_styleId_fkey" FOREIGN KEY ("styleId") REFERENCES "Style"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SampleApproval" ADD CONSTRAINT "SampleApproval_sampleId_fkey" FOREIGN KEY ("sampleId") REFERENCES "SampleRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
