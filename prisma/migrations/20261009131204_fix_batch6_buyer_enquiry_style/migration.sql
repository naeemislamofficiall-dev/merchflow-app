/*
  Warnings:

  - The values [SUBMITTED,CONFIRMED] on the enum `EnquiryStatus` will be removed. If these variants are still used in the database, this will fail.
  - A unique constraint covering the columns `[convertedOrderId]` on the table `Enquiry` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "StyleDocType" AS ENUM ('TECH_PACK', 'MEASUREMENT_SHEET', 'ARTWORK', 'CONSTRUCTION_SHEET', 'BUYER_COMMENTS', 'REFERENCE_IMAGE', 'CAD_FILE', 'APPROVED_SAMPLE_PHOTO', 'TEST_REPORT');

-- AlterEnum
BEGIN;
CREATE TYPE "EnquiryStatus_new" AS ENUM ('DRAFT', 'COSTING', 'NEGOTIATION', 'QUOTED', 'APPROVED', 'CONVERTED', 'CANCELLED');
ALTER TABLE "public"."Enquiry" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Enquiry" ALTER COLUMN "status" TYPE "EnquiryStatus_new" USING ("status"::text::"EnquiryStatus_new");
ALTER TYPE "EnquiryStatus" RENAME TO "EnquiryStatus_old";
ALTER TYPE "EnquiryStatus_new" RENAME TO "EnquiryStatus";
DROP TYPE "public"."EnquiryStatus_old";
ALTER TABLE "Enquiry" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
COMMIT;

-- AlterTable
ALTER TABLE "Buyer" ADD COLUMN     "category" TEXT,
ADD COLUMN     "complianceNotes" TEXT,
ADD COLUMN     "region" TEXT,
ADD COLUMN     "shipmentTerms" TEXT;

-- AlterTable
ALTER TABLE "Enquiry" ADD COLUMN     "convertedOrderId" TEXT,
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'USD',
ADD COLUMN     "fabric" TEXT,
ADD COLUMN     "productType" TEXT,
ADD COLUMN     "requiredShipDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Style" ADD COLUMN     "composition" TEXT,
ADD COLUMN     "construction" TEXT,
ADD COLUMN     "developmentOwnerId" TEXT,
ADD COLUMN     "embroidery" TEXT,
ADD COLUMN     "fabricType" TEXT,
ADD COLUMN     "garmentType" TEXT,
ADD COLUMN     "gender" TEXT,
ADD COLUMN     "gsm" INTEGER,
ADD COLUMN     "print" TEXT,
ADD COLUMN     "washType" TEXT;

-- AlterTable
ALTER TABLE "StyleRevision" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedById" TEXT,
ADD COLUMN     "attachmentUrl" TEXT,
ADD COLUMN     "changedFields" JSONB,
ADD COLUMN     "reason" TEXT;

-- AlterTable
ALTER TABLE "TechPack" ADD COLUMN     "docType" "StyleDocType" NOT NULL DEFAULT 'TECH_PACK';

-- CreateTable
CREATE TABLE "BuyerConfig" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sizeSystem" TEXT,
    "colorCoding" TEXT,
    "labelRequirements" TEXT,
    "packingRules" TEXT,
    "aqlStandard" TEXT,
    "inspectionRequirements" TEXT,
    "documentRequirements" TEXT,
    "approvalWorkflow" TEXT,
    "shipmentTolerancePct" DECIMAL(5,2),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuyerConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuyerPreferredFactory" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,

    CONSTRAINT "BuyerPreferredFactory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnquiryNegotiation" (
    "id" TEXT NOT NULL,
    "enquiryId" TEXT NOT NULL,
    "initialQuotedPrice" DECIMAL(14,4),
    "buyerTarget" DECIMAL(14,4),
    "revisedPrice" DECIMAL(14,4),
    "reason" TEXT,
    "negotiatedById" TEXT,
    "negotiatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnquiryNegotiation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderLineQty" (
    "id" TEXT NOT NULL,
    "orderLineId" TEXT NOT NULL,
    "colorId" TEXT NOT NULL,
    "sizeId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "OrderLineQty_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BuyerConfig_buyerId_key" ON "BuyerConfig"("buyerId");

-- CreateIndex
CREATE UNIQUE INDEX "BuyerPreferredFactory_buyerId_factoryId_key" ON "BuyerPreferredFactory"("buyerId", "factoryId");

-- CreateIndex
CREATE INDEX "EnquiryNegotiation_enquiryId_idx" ON "EnquiryNegotiation"("enquiryId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderLineQty_orderLineId_colorId_sizeId_key" ON "OrderLineQty"("orderLineId", "colorId", "sizeId");

-- CreateIndex
CREATE UNIQUE INDEX "Enquiry_convertedOrderId_key" ON "Enquiry"("convertedOrderId");

-- AddForeignKey
ALTER TABLE "Enquiry" ADD CONSTRAINT "Enquiry_convertedOrderId_fkey" FOREIGN KEY ("convertedOrderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Style" ADD CONSTRAINT "Style_developmentOwnerId_fkey" FOREIGN KEY ("developmentOwnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuyerConfig" ADD CONSTRAINT "BuyerConfig_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "Buyer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuyerPreferredFactory" ADD CONSTRAINT "BuyerPreferredFactory_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "Buyer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuyerPreferredFactory" ADD CONSTRAINT "BuyerPreferredFactory_factoryId_fkey" FOREIGN KEY ("factoryId") REFERENCES "Factory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnquiryNegotiation" ADD CONSTRAINT "EnquiryNegotiation_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES "Enquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderLineQty" ADD CONSTRAINT "OrderLineQty_orderLineId_fkey" FOREIGN KEY ("orderLineId") REFERENCES "OrderLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderLineQty" ADD CONSTRAINT "OrderLineQty_colorId_fkey" FOREIGN KEY ("colorId") REFERENCES "StyleColor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderLineQty" ADD CONSTRAINT "OrderLineQty_sizeId_fkey" FOREIGN KEY ("sizeId") REFERENCES "StyleSize"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
