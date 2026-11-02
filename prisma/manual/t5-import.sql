-- T5 Import: rerun-safe

DO $$ BEGIN
  CREATE TYPE "ImportBatchType" AS ENUM ('BUYERS','SUPPLIERS','MATERIALS','STYLES','ORDERS','OPENING_STOCK','OPEN_POS','SHIPMENT_BALANCES');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ImportBatchStatus" AS ENUM ('VALIDATED','HAS_ERRORS','IMPORTED','FAILED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ImportRowStatus" AS ENUM ('OK','ERROR','SKIPPED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "ImportBatch" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "type" "ImportBatchType" NOT NULL,
  "status" "ImportBatchStatus" NOT NULL DEFAULT 'VALIDATED',
  "fileName" TEXT NOT NULL,
  "fileHash" TEXT NOT NULL,
  "totalRows" INTEGER NOT NULL DEFAULT 0,
  "okRows" INTEGER NOT NULL DEFAULT 0,
  "errorRows" INTEGER NOT NULL DEFAULT 0,
  "skippedRows" INTEGER NOT NULL DEFAULT 0,
  "failReason" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "importedById" TEXT,
  "importedAt" TIMESTAMP(3),
  CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ImportBatch_companyId_type_createdAt_idx" ON "ImportBatch"("companyId", "type", "createdAt");
CREATE INDEX IF NOT EXISTS "ImportBatch_companyId_type_fileHash_idx" ON "ImportBatch"("companyId", "type", "fileHash");

DO $$ BEGIN
  ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "ImportRow" (
  "id" TEXT NOT NULL,
  "batchId" TEXT NOT NULL,
  "rowNo" INTEGER NOT NULL,
  "data" JSONB NOT NULL,
  "status" "ImportRowStatus" NOT NULL DEFAULT 'OK',
  "errors" TEXT[] NOT NULL,
  CONSTRAINT "ImportRow_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ImportRow_batchId_rowNo_key" ON "ImportRow"("batchId", "rowNo");
CREATE INDEX IF NOT EXISTS "ImportRow_batchId_status_idx" ON "ImportRow"("batchId", "status");

DO $$ BEGIN
  ALTER TABLE "ImportRow" ADD CONSTRAINT "ImportRow_batchId_fkey"
    FOREIGN KEY ("batchId") REFERENCES "ImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;