-- T6: Marker, ReworkRecord, PreshipmentReport, ApprovalDelegation, ApprovalEscalation
-- + small column additions on Lay, Workflow, ApprovalAction

CREATE TABLE IF NOT EXISTS "Marker" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "cutPlanId" TEXT NOT NULL,
  "markerNo" INTEGER NOT NULL,
  "widthCm" DECIMAL(8,2) NOT NULL,
  "length" DECIMAL(8,3) NOT NULL,
  "efficiencyPct" DECIMAL(5,2) NOT NULL,
  "sizeRatio" JSONB NOT NULL,
  "remarks" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Marker_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Marker_cutPlanId_fkey" FOREIGN KEY ("cutPlanId") REFERENCES "CutPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "Marker_cutPlanId_markerNo_key" ON "Marker"("cutPlanId", "markerNo");
CREATE INDEX IF NOT EXISTS "Marker_companyId_idx" ON "Marker"("companyId");

ALTER TABLE "Lay" ADD COLUMN IF NOT EXISTS "markerId" TEXT;
DO $$ BEGIN
  ALTER TABLE "Lay" ADD CONSTRAINT "Lay_markerId_fkey"
    FOREIGN KEY ("markerId") REFERENCES "Marker"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS "Lay_markerId_idx" ON "Lay"("markerId");

CREATE TABLE IF NOT EXISTS "ReworkRecord" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "factoryId" TEXT NOT NULL,
  "occurrenceId" TEXT NOT NULL,
  "inspectionId" TEXT NOT NULL,
  "productionOrderId" TEXT,
  "repairedQty" INTEGER NOT NULL DEFAULT 0,
  "rejectedQty" INTEGER NOT NULL DEFAULT 0,
  "remarks" TEXT,
  "reworkedById" TEXT,
  "reworkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReworkRecord_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ReworkRecord_qty_check" CHECK ("repairedQty" >= 0 AND "rejectedQty" >= 0 AND "repairedQty" + "rejectedQty" > 0),
  CONSTRAINT "ReworkRecord_occurrenceId_fkey" FOREIGN KEY ("occurrenceId") REFERENCES "DefectOccurrence"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "ReworkRecord_occurrenceId_idx" ON "ReworkRecord"("occurrenceId");
CREATE INDEX IF NOT EXISTS "ReworkRecord_inspectionId_idx" ON "ReworkRecord"("inspectionId");
CREATE INDEX IF NOT EXISTS "ReworkRecord_productionOrderId_idx" ON "ReworkRecord"("productionOrderId");
CREATE INDEX IF NOT EXISTS "ReworkRecord_factoryId_reworkedAt_idx" ON "ReworkRecord"("factoryId", "reworkedAt");

CREATE TABLE IF NOT EXISTS "PreshipmentReport" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "aqlInspectionId" TEXT NOT NULL,
  "cartonsTotal" INTEGER,
  "cartonsChecked" INTEGER,
  "packingOk" BOOLEAN,
  "labelingOk" BOOLEAN,
  "measurementOk" BOOLEAN,
  "workmanshipOk" BOOLEAN,
  "summary" TEXT NOT NULL,
  "inspectedByName" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PreshipmentReport_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PreshipmentReport_aqlInspectionId_fkey" FOREIGN KEY ("aqlInspectionId") REFERENCES "AqlInspection"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "PreshipmentReport_aqlInspectionId_key" ON "PreshipmentReport"("aqlInspectionId");
CREATE INDEX IF NOT EXISTS "PreshipmentReport_companyId_idx" ON "PreshipmentReport"("companyId");

CREATE TABLE IF NOT EXISTS "ApprovalDelegation" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "fromUserId" TEXT NOT NULL,
  "toUserId" TEXT NOT NULL,
  "startDate" DATE NOT NULL,
  "endDate" DATE NOT NULL,
  "reason" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "revokedAt" TIMESTAMP(3),
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ApprovalDelegation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ApprovalDelegation_dates_check" CHECK ("endDate" >= "startDate"),
  CONSTRAINT "ApprovalDelegation_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ApprovalDelegation_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "ApprovalDelegation_companyId_idx" ON "ApprovalDelegation"("companyId");
CREATE INDEX IF NOT EXISTS "ApprovalDelegation_fromUserId_idx" ON "ApprovalDelegation"("fromUserId");
CREATE INDEX IF NOT EXISTS "ApprovalDelegation_toUserId_startDate_endDate_idx" ON "ApprovalDelegation"("toUserId", "startDate", "endDate");

CREATE TABLE IF NOT EXISTS "ApprovalEscalation" (
  "id" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "stepOrder" INTEGER NOT NULL,
  "escalatedToRoleId" TEXT,
  "notifiedCount" INTEGER NOT NULL DEFAULT 0,
  "escalatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ApprovalEscalation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ApprovalEscalation_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ApprovalRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "ApprovalEscalation_requestId_stepOrder_key" ON "ApprovalEscalation"("requestId", "stepOrder");

ALTER TABLE "Workflow" ADD COLUMN IF NOT EXISTS "escalateAfterDays" INTEGER;
ALTER TABLE "ApprovalAction" ADD COLUMN IF NOT EXISTS "delegatedFromId" TEXT;