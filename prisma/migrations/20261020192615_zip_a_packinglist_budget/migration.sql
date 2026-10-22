-- CreateEnum
CREATE TYPE "PackingListStatus" AS ENUM ('DRAFT', 'ISSUED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BudgetStatus" AS ENUM ('DRAFT', 'APPROVED', 'CLOSED', 'CANCELLED');

-- CreateTable
CREATE TABLE "PackingList" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "packingListNo" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "status" "PackingListStatus" NOT NULL DEFAULT 'DRAFT',
    "totalCartons" INTEGER NOT NULL DEFAULT 0,
    "totalPcs" INTEGER NOT NULL DEFAULT 0,
    "totalGrossKg" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "totalNetKg" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "totalCbm" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "data" JSONB,
    "remarks" TEXT,
    "issuedAt" TIMESTAMP(3),
    "issuedById" TEXT,
    "cancelReason" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PackingList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Budget" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "factoryId" TEXT,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "amountBase" DECIMAL(16,2) NOT NULL,
    "notes" TEXT,
    "status" "BudgetStatus" NOT NULL DEFAULT 'DRAFT',
    "approvedById" TEXT,
    "cancelReason" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Budget_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PackingList_shipmentId_idx" ON "PackingList"("shipmentId");

-- CreateIndex
CREATE UNIQUE INDEX "PackingList_companyId_packingListNo_key" ON "PackingList"("companyId", "packingListNo");

-- CreateIndex
CREATE INDEX "Budget_companyId_year_month_idx" ON "Budget"("companyId", "year", "month");
