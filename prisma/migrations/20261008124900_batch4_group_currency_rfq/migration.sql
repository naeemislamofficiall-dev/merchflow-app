-- CreateEnum
CREATE TYPE "RfqStatus" AS ENUM ('DRAFT', 'SENT', 'CLOSED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "groupId" TEXT;

-- AlterTable
ALTER TABLE "CostSheet" ADD COLUMN     "baseCurrency" TEXT,
ADD COLUMN     "baseQuotedPrice" DECIMAL(18,4),
ADD COLUMN     "exchangeRate" DECIMAL(18,8),
ADD COLUMN     "rateDate" DATE;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "baseCurrency" TEXT,
ADD COLUMN     "exchangeRate" DECIMAL(18,8),
ADD COLUMN     "rateDate" DATE;

-- AlterTable
ALTER TABLE "PurchaseOrder" ADD COLUMN     "baseCurrency" TEXT,
ADD COLUMN     "baseTotal" DECIMAL(18,2),
ADD COLUMN     "exchangeRate" DECIMAL(18,8),
ADD COLUMN     "rateDate" DATE;

-- AlterTable
ALTER TABLE "SupplierPi" ADD COLUMN     "baseAmount" DECIMAL(18,2),
ADD COLUMN     "baseCurrency" TEXT,
ADD COLUMN     "exchangeRate" DECIMAL(18,8),
ADD COLUMN     "rateDate" DATE;

-- AlterTable
ALTER TABLE "SupplierQuotation" ADD COLUMN     "baseCurrency" TEXT,
ADD COLUMN     "baseUnitPrice" DECIMAL(18,4),
ADD COLUMN     "exchangeRate" DECIMAL(18,8),
ADD COLUMN     "rateDate" DATE,
ADD COLUMN     "rfqId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "locale" TEXT NOT NULL DEFAULT 'en';

-- CreateTable
CREATE TABLE "Group" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserFactoryAccess" (
    "userId" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserFactoryAccess_pkey" PRIMARY KEY ("userId","factoryId")
);

-- CreateTable
CREATE TABLE "Currency" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "decimals" INTEGER NOT NULL DEFAULT 2,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Currency_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "ExchangeRate" (
    "id" TEXT NOT NULL,
    "fromCode" TEXT NOT NULL,
    "toCode" TEXT NOT NULL,
    "rate" DECIMAL(18,8) NOT NULL,
    "rateDate" DATE NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExchangeRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rfq" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "rfqNo" TEXT NOT NULL,
    "prId" TEXT,
    "status" "RfqStatus" NOT NULL DEFAULT 'DRAFT',
    "dueDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rfq_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RfqLine" (
    "id" TEXT NOT NULL,
    "rfqId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "quantity" DECIMAL(14,4) NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'PCS',
    "requiredDate" TIMESTAMP(3),

    CONSTRAINT "RfqLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RfqSupplier" (
    "id" TEXT NOT NULL,
    "rfqId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "materialId" TEXT,

    CONSTRAINT "RfqSupplier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Group_code_key" ON "Group"("code");

-- CreateIndex
CREATE INDEX "UserFactoryAccess_factoryId_idx" ON "UserFactoryAccess"("factoryId");

-- CreateIndex
CREATE INDEX "ExchangeRate_fromCode_toCode_rateDate_idx" ON "ExchangeRate"("fromCode", "toCode", "rateDate");

-- CreateIndex
CREATE UNIQUE INDEX "ExchangeRate_fromCode_toCode_rateDate_key" ON "ExchangeRate"("fromCode", "toCode", "rateDate");

-- CreateIndex
CREATE INDEX "Rfq_status_idx" ON "Rfq"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Rfq_companyId_rfqNo_key" ON "Rfq"("companyId", "rfqNo");

-- CreateIndex
CREATE INDEX "RfqLine_rfqId_idx" ON "RfqLine"("rfqId");

-- CreateIndex
CREATE UNIQUE INDEX "RfqSupplier_rfqId_supplierId_key" ON "RfqSupplier"("rfqId", "supplierId");

-- CreateIndex
CREATE INDEX "SupplierQuotation_rfqId_idx" ON "SupplierQuotation"("rfqId");

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierQuotation" ADD CONSTRAINT "SupplierQuotation_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "Rfq"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFactoryAccess" ADD CONSTRAINT "UserFactoryAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFactoryAccess" ADD CONSTRAINT "UserFactoryAccess_factoryId_fkey" FOREIGN KEY ("factoryId") REFERENCES "Factory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rfq" ADD CONSTRAINT "Rfq_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rfq" ADD CONSTRAINT "Rfq_prId_fkey" FOREIGN KEY ("prId") REFERENCES "PurchaseRequisition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RfqLine" ADD CONSTRAINT "RfqLine_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "Rfq"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RfqLine" ADD CONSTRAINT "RfqLine_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RfqSupplier" ADD CONSTRAINT "RfqSupplier_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "Rfq"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RfqSupplier" ADD CONSTRAINT "RfqSupplier_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RfqSupplier" ADD CONSTRAINT "RfqSupplier_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE SET NULL ON UPDATE CASCADE;
