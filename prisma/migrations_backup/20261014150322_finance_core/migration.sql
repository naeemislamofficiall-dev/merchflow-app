-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'POSTED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('UNMATCHED', 'MATCHED', 'MISMATCH');

-- CreateEnum
CREATE TYPE "PaymentDirection" AS ENUM ('OUT', 'IN');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BANK', 'CHEQUE', 'LC', 'MOBILE');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('FACTORY', 'PRODUCTION', 'FREIGHT', 'SAMPLE', 'OTHER');

-- CreateEnum
CREATE TYPE "ExpenseStatus" AS ENUM ('DRAFT', 'APPROVED', 'CANCELLED');

-- CreateTable
CREATE TABLE "SupplierInvoice" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "factoryId" TEXT,
    "invoiceNo" TEXT NOT NULL,
    "supplierInvoiceNo" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "poId" TEXT,
    "grnId" TEXT,
    "invoiceDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "currency" TEXT NOT NULL DEFAULT 'BDT',
    "exchangeRate" DECIMAL(18,8) NOT NULL DEFAULT 1,
    "subtotal" DECIMAL(16,2) NOT NULL,
    "taxAmount" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(16,2) NOT NULL,
    "paidAmount" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "matchStatus" "MatchStatus" NOT NULL DEFAULT 'UNMATCHED',
    "matchNote" TEXT,
    "overrideReason" TEXT,
    "remarks" TEXT,
    "cancelReason" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuyerInvoice" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "factoryId" TEXT,
    "invoiceNo" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "shipmentId" TEXT,
    "invoiceDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "exchangeRate" DECIMAL(18,8) NOT NULL DEFAULT 1,
    "totalAmount" DECIMAL(16,2) NOT NULL,
    "receivedAmount" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "remarks" TEXT,
    "cancelReason" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuyerInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuyerInvoiceLine" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "styleId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(14,4) NOT NULL,
    "amount" DECIMAL(16,2) NOT NULL,

    CONSTRAINT "BuyerInvoiceLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "paymentNo" TEXT NOT NULL,
    "direction" "PaymentDirection" NOT NULL,
    "method" "PaymentMethod" NOT NULL DEFAULT 'BANK',
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(16,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "referenceNo" TEXT,
    "supplierInvoiceId" TEXT,
    "buyerInvoiceId" TEXT,
    "remarks" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "factoryId" TEXT,
    "expenseNo" TEXT NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "expenseDate" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(16,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BDT',
    "exchangeRate" DECIMAL(18,8) NOT NULL DEFAULT 1,
    "orderId" TEXT,
    "styleId" TEXT,
    "vendorName" TEXT,
    "status" "ExpenseStatus" NOT NULL DEFAULT 'DRAFT',
    "approvedById" TEXT,
    "cancelReason" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostAllocation" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "styleId" TEXT,
    "amountBase" DECIMAL(16,2) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CostAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SupplierInvoice_supplierId_status_idx" ON "SupplierInvoice"("supplierId", "status");

-- CreateIndex
CREATE INDEX "SupplierInvoice_poId_idx" ON "SupplierInvoice"("poId");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierInvoice_companyId_invoiceNo_key" ON "SupplierInvoice"("companyId", "invoiceNo");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierInvoice_companyId_supplierId_supplierInvoiceNo_key" ON "SupplierInvoice"("companyId", "supplierId", "supplierInvoiceNo");

-- CreateIndex
CREATE INDEX "BuyerInvoice_buyerId_status_idx" ON "BuyerInvoice"("buyerId", "status");

-- CreateIndex
CREATE INDEX "BuyerInvoice_shipmentId_idx" ON "BuyerInvoice"("shipmentId");

-- CreateIndex
CREATE UNIQUE INDEX "BuyerInvoice_companyId_invoiceNo_key" ON "BuyerInvoice"("companyId", "invoiceNo");

-- CreateIndex
CREATE INDEX "BuyerInvoiceLine_invoiceId_idx" ON "BuyerInvoiceLine"("invoiceId");

-- CreateIndex
CREATE INDEX "BuyerInvoiceLine_orderId_styleId_idx" ON "BuyerInvoiceLine"("orderId", "styleId");

-- CreateIndex
CREATE INDEX "Payment_supplierInvoiceId_idx" ON "Payment"("supplierInvoiceId");

-- CreateIndex
CREATE INDEX "Payment_buyerInvoiceId_idx" ON "Payment"("buyerInvoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_companyId_paymentNo_key" ON "Payment"("companyId", "paymentNo");

-- CreateIndex
CREATE INDEX "Expense_orderId_idx" ON "Expense"("orderId");

-- CreateIndex
CREATE INDEX "Expense_category_status_idx" ON "Expense"("category", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Expense_companyId_expenseNo_key" ON "Expense"("companyId", "expenseNo");

-- CreateIndex
CREATE INDEX "CostAllocation_orderId_idx" ON "CostAllocation"("orderId");

-- CreateIndex
CREATE INDEX "CostAllocation_sourceType_sourceId_idx" ON "CostAllocation"("sourceType", "sourceId");

-- AddForeignKey
ALTER TABLE "BuyerInvoiceLine" ADD CONSTRAINT "BuyerInvoiceLine_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "BuyerInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_supplierInvoiceId_fkey" FOREIGN KEY ("supplierInvoiceId") REFERENCES "SupplierInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_buyerInvoiceId_fkey" FOREIGN KEY ("buyerInvoiceId") REFERENCES "BuyerInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
