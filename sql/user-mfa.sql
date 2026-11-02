-- Supabase SQL editor-e chalan. Safe to run more than once (age ager version chalale-o).
CREATE TABLE IF NOT EXISTS "UserMfa" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "secretEnc" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserMfa_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "UserMfa" ADD COLUMN IF NOT EXISTS "lastUsedStep" BIGINT;
ALTER TABLE "UserMfa" ADD COLUMN IF NOT EXISTS "backupCodes" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "UserMfa_userId_key" ON "UserMfa"("userId");
-- Supabase-e RLS on thakle, app-er DB user (postgres/pooler) diye access kore, tai policy lagbe na.
