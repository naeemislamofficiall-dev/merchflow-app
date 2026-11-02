-- T7: Portal account (supplier/buyer portal user link). Rerun-safe.

DO $$ BEGIN
  CREATE TYPE "PortalType" AS ENUM ('SUPPLIER', 'BUYER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "PortalAccount" (
  "id"          TEXT NOT NULL,
  "userId"      TEXT NOT NULL,
  "companyId"   TEXT NOT NULL,
  "type"        "PortalType" NOT NULL,
  "supplierId"  TEXT,
  "buyerId"     TEXT,
  "createdById" TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PortalAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PortalAccount_userId_key" ON "PortalAccount"("userId");
CREATE INDEX IF NOT EXISTS "PortalAccount_companyId_idx" ON "PortalAccount"("companyId");
CREATE INDEX IF NOT EXISTS "PortalAccount_supplierId_idx" ON "PortalAccount"("supplierId");
CREATE INDEX IF NOT EXISTS "PortalAccount_buyerId_idx" ON "PortalAccount"("buyerId");

DO $$ BEGIN
  ALTER TABLE "PortalAccount" ADD CONSTRAINT "PortalAccount_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "PortalAccount" ADD CONSTRAINT "PortalAccount_supplierId_fkey"
    FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "PortalAccount" ADD CONSTRAINT "PortalAccount_buyerId_fkey"
    FOREIGN KEY ("buyerId") REFERENCES "Buyer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- SUPPLIER হলে শুধু supplierId, BUYER হলে শুধু buyerId (দুটো একসাথে বা কোনোটাই না থাকা চলবে না)
DO $$ BEGIN
  ALTER TABLE "PortalAccount" ADD CONSTRAINT "PortalAccount_type_party_chk" CHECK (
    ("type" = 'SUPPLIER' AND "supplierId" IS NOT NULL AND "buyerId" IS NULL) OR
    ("type" = 'BUYER' AND "buyerId" IS NOT NULL AND "supplierId" IS NULL)
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;