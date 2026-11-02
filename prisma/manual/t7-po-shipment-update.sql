CREATE TABLE IF NOT EXISTS "PoShipmentUpdate" (
  "id"          TEXT NOT NULL,
  "companyId"   TEXT NOT NULL,
  "poId"        TEXT NOT NULL,
  "supplierId"  TEXT NOT NULL,
  "shippedDate" TIMESTAMP(3),
  "etaDate"     TIMESTAMP(3),
  "carrier"     TEXT,
  "trackingNo"  TEXT,
  "note"        TEXT,
  "createdById" TEXT NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PoShipmentUpdate_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "PoShipmentUpdate_poId_idx" ON "PoShipmentUpdate"("poId");
CREATE INDEX IF NOT EXISTS "PoShipmentUpdate_supplierId_idx" ON "PoShipmentUpdate"("supplierId");