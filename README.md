# MERCHFLOW ERP

Next.js + TypeScript + Prisma ERP application for garment merchandising and factory operations.

## Local setup

1. Install Node.js (compatible with the Next.js version in `package.json`) and have a PostgreSQL database ready.
2. Create a `.env` file in the project root with these values:
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

5. Start the app:

```bash
   npm run dev
```

6. Before deployment, run:

```bash
   npm run lint
   npm run typecheck
   npm run build
```

## Important security note

Never commit the `.env` file or share it with anyone. It is already listed in `.gitignore`. If it was ever shared or uploaded anywhere, rotate the database password and `AUTH_SECRET`.