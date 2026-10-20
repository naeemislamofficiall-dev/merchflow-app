# MERCHFLOW ERP

Next.js + TypeScript + Prisma ERP application for garment merchandising and factory operations.

## Local setup

1. Install Node.js compatible with the Next.js version in `package.json` and PostgreSQL.
2. Copy `.env.example` to `.env` and set fresh local credentials:
   - `DATABASE_URL`: pooled/runtime connection if your database provider requires it.
   - `DIRECT_URL`: direct database connection for Prisma migrations.
   - `AUTH_SECRET`: a cryptographically random secret.
3. Install dependencies and generate the Prisma client:

   ```bash
   npm ci
   npx prisma generate
   ```

4. Apply migrations to a **development database only**:

   ```bash
   npx prisma migrate deploy
   ```

   If this is a fresh local database and migration history is not present, review the migration history first rather than blindly applying production migrations.
5. Start the app:

   ```bash
   npm run dev
   ```

6. Before deployment, run:

   ```bash
   npm run lint
   npx tsc --noEmit
   npm run build
   ```

## Important security note

The original upload included a `.env` file. It has intentionally been excluded from this archive. Use your own fresh credentials and rotate any real secrets that may have been exposed. Never commit `.env` files.

## Project documentation

- [`docs/IMPLEMENTATION_STATUS.md`](docs/IMPLEMENTATION_STATUS.md) — implemented changes and remaining scope.
- [`docs/GOLDEN_DEMO.md`](docs/GOLDEN_DEMO.md) — end-to-end acceptance test plan.
- [`docs/SECURITY_AND_DEPLOYMENT.md`](docs/SECURITY_AND_DEPLOYMENT.md) — release precautions.

## Scope caveat

This is an implementation update, not a certification that every item in the enterprise master specification is complete. The implementation status document lists areas that still need domain models, workflows, automated tests or external integrations.
