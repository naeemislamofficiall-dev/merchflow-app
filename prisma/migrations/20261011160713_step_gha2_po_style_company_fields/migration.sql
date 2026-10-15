-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "address" TEXT,
ADD COLUMN     "fiscalYearStartMonth" INTEGER,
ADD COLUMN     "registrationNo" TEXT,
ADD COLUMN     "taxId" TEXT;

-- AlterTable
ALTER TABLE "Factory" ADD COLUMN     "capacity" INTEGER,
ADD COLUMN     "complianceStatus" TEXT,
ADD COLUMN     "contactInfo" TEXT,
ADD COLUMN     "factoryType" TEXT,
ADD COLUMN     "workingCalendar" TEXT;

-- AlterTable
ALTER TABLE "PurchaseOrderLine" ADD COLUMN     "styleId" TEXT;

-- CreateIndex
CREATE INDEX "PurchaseOrderLine_styleId_idx" ON "PurchaseOrderLine"("styleId");

-- AddForeignKey
ALTER TABLE "PurchaseOrderLine" ADD CONSTRAINT "PurchaseOrderLine_styleId_fkey" FOREIGN KEY ("styleId") REFERENCES "Style"("id") ON DELETE SET NULL ON UPDATE CASCADE;
