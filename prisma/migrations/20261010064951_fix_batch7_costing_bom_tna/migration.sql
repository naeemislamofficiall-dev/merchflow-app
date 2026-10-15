/*
  Warnings:

  - The values [PENDING,IN_PROGRESS,DONE] on the enum `TnaTaskStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "CostSheetType" AS ENUM ('PRE', 'POST');

-- AlterEnum
ALTER TYPE "BomItemType" ADD VALUE 'YARN';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CostCategory" ADD VALUE 'YARN';
ALTER TYPE "CostCategory" ADD VALUE 'PACKING';
ALTER TYPE "CostCategory" ADD VALUE 'TESTING';
ALTER TYPE "CostCategory" ADD VALUE 'COMMERCIAL';
ALTER TYPE "CostCategory" ADD VALUE 'COMMISSION';
ALTER TYPE "CostCategory" ADD VALUE 'FREIGHT';

-- AlterEnum
BEGIN;
CREATE TYPE "TnaTaskStatus_new" AS ENUM ('NOT_STARTED', 'ON_TRACK', 'AT_RISK', 'DELAYED', 'COMPLETED', 'WAIVED');
ALTER TABLE "public"."TnaTask" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "TnaTask" ALTER COLUMN "status" TYPE "TnaTaskStatus_new" USING ("status"::text::"TnaTaskStatus_new");
ALTER TYPE "TnaTaskStatus" RENAME TO "TnaTaskStatus_old";
ALTER TYPE "TnaTaskStatus_new" RENAME TO "TnaTaskStatus";
DROP TYPE "public"."TnaTaskStatus_old";
ALTER TABLE "TnaTask" ALTER COLUMN "status" SET DEFAULT 'NOT_STARTED';
COMMIT;

-- AlterTable
ALTER TABLE "BomItem" ADD COLUMN     "currency" TEXT,
ADD COLUMN     "effectiveDate" TIMESTAMP(3),
ADD COLUMN     "materialId" TEXT,
ADD COLUMN     "rate" DECIMAL(14,4),
ADD COLUMN     "subCategory" TEXT,
ADD COLUMN     "supplierId" TEXT;

-- AlterTable
ALTER TABLE "CostSheet" ADD COLUMN     "costType" "CostSheetType" NOT NULL DEFAULT 'PRE',
ADD COLUMN     "orderId" TEXT,
ADD COLUMN     "sourceCostSheetId" TEXT;

-- AlterTable
ALTER TABLE "SampleRequest" ADD COLUMN     "comments" TEXT,
ADD COLUMN     "materialRequirement" TEXT;

-- AlterTable
ALTER TABLE "TnaTask" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedById" TEXT,
ADD COLUMN     "delayDays" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "delayReason" TEXT,
ADD COLUMN     "departmentId" TEXT,
ADD COLUMN     "dependsOnId" TEXT,
ADD COLUMN     "ownerId" TEXT,
ADD COLUMN     "revisedDate" TIMESTAMP(3),
ALTER COLUMN "status" SET DEFAULT 'NOT_STARTED';

-- AlterTable
ALTER TABLE "TnaTemplateTask" ADD COLUMN     "dependsOnSortOrder" INTEGER;

-- AddForeignKey
ALTER TABLE "TnaTask" ADD CONSTRAINT "TnaTask_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TnaTask" ADD CONSTRAINT "TnaTask_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TnaTask" ADD CONSTRAINT "TnaTask_dependsOnId_fkey" FOREIGN KEY ("dependsOnId") REFERENCES "TnaTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostSheet" ADD CONSTRAINT "CostSheet_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BomItem" ADD CONSTRAINT "BomItem_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BomItem" ADD CONSTRAINT "BomItem_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
