## Security hardening — 2026-11-24 summary

### Completed

1. **Login rate limiting** — `@upstash/ratelimit`, `@upstash/redis`, `zod` installed.
   Upstash Redis database created (`merchflow-ratelimit`). New file `src/lib/ratelimit.ts`
   adds a sliding-window limiter (5 attempts / 60s). `src/lib/auth.ts` `authorize()` checks
   this limit by IP before any DB query. Manually tested and confirmed working.

2. **API rate limiting** — already existed in `src/lib/portal-api.ts` (in-memory limiter,
   120 req/min across all buyer/supplier routes). No change needed, verified only.

3. **IDOR protection** — already existed in `portal-buyer.service.ts`. All queries scope
   by `buyerId`/`companyId` from server-side session, never from client input. Verified in
   `getOrder`, `getSample`, `decideSample`.

4. **SQL injection check** — scanned codebase for `queryRawUnsafe`/`executeRawUnsafe`.
   Only found in `node_modules` and auto-generated Prisma types, not in app code. No risk.

5. **XSS check** — scanned codebase for `dangerouslySetInnerHTML`. Only found in
   `node_modules/@auth/core` (NextAuth's default pages), not in app code. No risk.

6. **NEXTAUTH_SECRET** — new random secret generated and set in Vercel Environment Variables.

7. **Security headers** — added to `next.config.ts`: `X-Frame-Options: DENY`,
   `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`,
   `Permissions-Policy` (camera/mic/geolocation restricted).

8. **Secrets in Git** — confirmed `.env`/`.env.local` are gitignored and not tracked
   (`git status` verified).

9. **Timing-attack fix** — `DUMMY_HASH` constant-time `bcrypt.compare()` added in
   `authorize()` for non-existent users, preventing email enumeration via response timing.

10. **Code pushed** — changes committed and pushed to `origin/main`.

11. **Vercel Environment Variables** — `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`,
    `NEXTAUTH_SECRET` set in Vercel Dashboard (Production).

