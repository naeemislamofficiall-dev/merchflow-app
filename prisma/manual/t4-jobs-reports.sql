-- T4 Reports-Jobs: rerun-safe

DO $$ BEGIN
  CREATE TYPE "JobRunStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCESS', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "JobTriggerType" AS ENUM ('CRON', 'MANUAL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ScheduledReportFormat" AS ENUM ('CSV', 'XLSX');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "JobRun" (
  "id" TEXT NOT NULL,
  "jobKey" TEXT NOT NULL,
  "status" "JobRunStatus" NOT NULL DEFAULT 'QUEUED',
  "trigger" "JobTriggerType" NOT NULL DEFAULT 'CRON',
  "triggeredById" TEXT,
  "startedAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),
  "durationMs" INTEGER,
  "summary" TEXT,
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "JobRun_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "JobRun_jobKey_createdAt_idx" ON "JobRun"("jobKey", "createdAt");
CREATE INDEX IF NOT EXISTS "JobRun_status_idx" ON "JobRun"("status");

CREATE TABLE IF NOT EXISTS "ScheduledReport" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "reportKey" TEXT NOT NULL,
  "format" "ScheduledReportFormat" NOT NULL DEFAULT 'XLSX',
  "recipients" TEXT[] NOT NULL,
  "timeOfDay" TEXT NOT NULL,
  "rangeDays" INTEGER,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "lastRunAt" TIMESTAMP(3),
  "lastStatus" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ScheduledReport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ScheduledReport_companyId_isActive_idx" ON "ScheduledReport"("companyId", "isActive");

DO $$ BEGIN
  ALTER TABLE "ScheduledReport" ADD CONSTRAINT "ScheduledReport_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "KpiSnapshot" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "snapshotDate" DATE NOT NULL,
  "metrics" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "KpiSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "KpiSnapshot_companyId_snapshotDate_key" ON "KpiSnapshot"("companyId", "snapshotDate");

DO $$ BEGIN
  ALTER TABLE "KpiSnapshot" ADD CONSTRAINT "KpiSnapshot_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;