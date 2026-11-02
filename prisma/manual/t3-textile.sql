ALTER TYPE "StockTxnType" ADD VALUE IF NOT EXISTS 'PRODUCTION_IN';

DO $$ BEGIN CREATE TYPE "KnittingStatus" AS ENUM ('PLANNED','YARN_ISSUED','COMPLETED','CLOSED','CANCELLED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "DyeBatchStatus" AS ENUM ('PLANNED','IN_PROCESS','COMPLETED','CLOSED','CANCELLED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "LabDipStatus" AS ENUM ('REQUEST','DYEING','LAB_DIP','BUYER_REVIEW','APPROVED','REJECTED','BULK_DYEING'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "FinishingStatus" AS ENUM ('PLANNED','IN_PROCESS','COMPLETED','CANCELLED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "Yarn" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "materialId" TEXT NOT NULL,
  "lotId" TEXT NOT NULL,
  "yarnType" TEXT NOT NULL,
  "yarnCount" TEXT NOT NULL,
  "composition" TEXT,
  "color" TEXT,
  "supplierId" TEXT,
  "qty" DECIMAL(14,4),
  "rate" DECIMAL(14,4),
  "currency" TEXT NOT NULL DEFAULT 'BDT',
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Yarn_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Yarn_lotId_key" ON "Yarn"("lotId");
CREATE INDEX IF NOT EXISTS "Yarn_companyId_idx" ON "Yarn"("companyId");
CREATE INDEX IF NOT EXISTS "Yarn_materialId_idx" ON "Yarn"("materialId");

CREATE TABLE IF NOT EXISTS "KnittingOrder" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "factoryId" TEXT NOT NULL,
  "knitNo" TEXT NOT NULL,
  "machineNo" TEXT NOT NULL,
  "program" TEXT,
  "orderId" TEXT,
  "yarnMaterialId" TEXT NOT NULL,
  "yarnLotId" TEXT NOT NULL,
  "greigeMaterialId" TEXT NOT NULL,
  "warehouseId" TEXT NOT NULL,
  "yarnRequiredQty" DECIMAL(14,4) NOT NULL,
  "plannedQty" DECIMAL(14,4) NOT NULL,
  "yarnIssuedQty" DECIMAL(14,4) NOT NULL DEFAULT 0,
  "actualQty" DECIMAL(14,4) NOT NULL DEFAULT 0,
  "rejectQty" DECIMAL(14,4) NOT NULL DEFAULT 0,
  "productionDate" DATE,
  "status" "KnittingStatus" NOT NULL DEFAULT 'PLANNED',
  "remarks" TEXT,
  "cancelReason" TEXT,
  "completedAt" TIMESTAMP(3),
  "closedAt" TIMESTAMP(3),
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "KnittingOrder_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "KnittingOrder_companyId_knitNo_key" ON "KnittingOrder"("companyId","knitNo");
CREATE INDEX IF NOT EXISTS "KnittingOrder_factoryId_status_idx" ON "KnittingOrder"("factoryId","status");
CREATE INDEX IF NOT EXISTS "KnittingOrder_orderId_idx" ON "KnittingOrder"("orderId");

CREATE TABLE IF NOT EXISTS "KnittingOutput" (
  "id" TEXT NOT NULL,
  "knittingId" TEXT NOT NULL,
  "rollId" TEXT NOT NULL,
  "quantity" DECIMAL(14,4) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "KnittingOutput_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "KnittingOutput_knittingId_fkey" FOREIGN KEY ("knittingId") REFERENCES "KnittingOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "KnittingOutput_knittingId_idx" ON "KnittingOutput"("knittingId");
CREATE INDEX IF NOT EXISTS "KnittingOutput_rollId_idx" ON "KnittingOutput"("rollId");

CREATE TABLE IF NOT EXISTS "LabDip" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "factoryId" TEXT NOT NULL,
  "labDipNo" TEXT NOT NULL,
  "buyerId" TEXT NOT NULL,
  "styleId" TEXT,
  "orderId" TEXT,
  "color" TEXT NOT NULL,
  "standardRef" TEXT NOT NULL,
  "status" "LabDipStatus" NOT NULL DEFAULT 'REQUEST',
  "submissionDate" DATE,
  "approvalDate" DATE,
  "buyerComments" TEXT,
  "rejectionReason" TEXT,
  "resubmissionCount" INTEGER NOT NULL DEFAULT 0,
  "remarks" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LabDip_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "LabDip_companyId_labDipNo_key" ON "LabDip"("companyId","labDipNo");
CREATE INDEX IF NOT EXISTS "LabDip_factoryId_status_idx" ON "LabDip"("factoryId","status");
CREATE INDEX IF NOT EXISTS "LabDip_buyerId_idx" ON "LabDip"("buyerId");

CREATE TABLE IF NOT EXISTS "LabDipSubmission" (
  "id" TEXT NOT NULL,
  "labDipId" TEXT NOT NULL,
  "round" INTEGER NOT NULL,
  "submittedAt" DATE NOT NULL,
  "decision" TEXT,
  "comments" TEXT,
  "reason" TEXT,
  "decidedAt" DATE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LabDipSubmission_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LabDipSubmission_labDipId_fkey" FOREIGN KEY ("labDipId") REFERENCES "LabDip"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "LabDipSubmission_labDipId_round_key" ON "LabDipSubmission"("labDipId","round");

CREATE TABLE IF NOT EXISTS "DyeBatch" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "factoryId" TEXT NOT NULL,
  "dyeNo" TEXT NOT NULL,
  "dyeLot" TEXT NOT NULL,
  "batchNo" TEXT NOT NULL,
  "labDipId" TEXT NOT NULL,
  "color" TEXT NOT NULL,
  "recipe" TEXT,
  "greigeRollId" TEXT NOT NULL,
  "greigeMaterialId" TEXT NOT NULL,
  "dyedMaterialId" TEXT NOT NULL,
  "warehouseId" TEXT NOT NULL,
  "orderId" TEXT,
  "inputQty" DECIMAL(14,4) NOT NULL,
  "outputQty" DECIMAL(14,4) NOT NULL DEFAULT 0,
  "rejectQty" DECIMAL(14,4) NOT NULL DEFAULT 0,
  "shade" TEXT,
  "reworkCount" INTEGER NOT NULL DEFAULT 0,
  "chemicals" JSONB,
  "outputRollId" TEXT,
  "status" "DyeBatchStatus" NOT NULL DEFAULT 'PLANNED',
  "remarks" TEXT,
  "cancelReason" TEXT,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "closedAt" TIMESTAMP(3),
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DyeBatch_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DyeBatch_labDipId_fkey" FOREIGN KEY ("labDipId") REFERENCES "LabDip"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "DyeBatch_companyId_dyeNo_key" ON "DyeBatch"("companyId","dyeNo");
CREATE INDEX IF NOT EXISTS "DyeBatch_factoryId_status_idx" ON "DyeBatch"("factoryId","status");
CREATE INDEX IF NOT EXISTS "DyeBatch_labDipId_idx" ON "DyeBatch"("labDipId");

CREATE TABLE IF NOT EXISTS "FabricFinishing" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "factoryId" TEXT NOT NULL,
  "finishNo" TEXT NOT NULL,
  "dyeBatchId" TEXT NOT NULL,
  "rollId" TEXT,
  "process" TEXT NOT NULL,
  "inputQty" DECIMAL(14,4) NOT NULL,
  "outputQty" DECIMAL(14,4) NOT NULL DEFAULT 0,
  "shrinkagePct" DECIMAL(6,2),
  "gsmAfter" DECIMAL(8,2),
  "status" "FinishingStatus" NOT NULL DEFAULT 'PLANNED',
  "remarks" TEXT,
  "completedAt" TIMESTAMP(3),
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FabricFinishing_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FabricFinishing_dyeBatchId_fkey" FOREIGN KEY ("dyeBatchId") REFERENCES "DyeBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "FabricFinishing_companyId_finishNo_key" ON "FabricFinishing"("companyId","finishNo");
CREATE INDEX IF NOT EXISTS "FabricFinishing_factoryId_status_idx" ON "FabricFinishing"("factoryId","status");
CREATE INDEX IF NOT EXISTS "FabricFinishing_dyeBatchId_idx" ON "FabricFinishing"("dyeBatchId");