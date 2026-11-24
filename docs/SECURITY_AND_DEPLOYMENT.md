## Security review log (manual + automated)

| Date | Area | Finding | Status |
|---|---|---|---|
| 2026-11-24 | Secrets | `.env` not tracked in git, `.gitignore` configured correctly | ✅ Verified safe |
| 2026-11-24 | Dependencies | `effect` ReDoS (high, GHSA-7589-6fvf-x4pw) via @prisma/config | ⚠️ Accepted risk — build-time only, fix requires Prisma downgrade |
| 2026-11-24 | Dependencies | `uuid` buffer bounds (moderate, GHSA-w5hq-g745-h8pq) via exceljs | ⚠️ Accepted risk — codebase only uses uuid.v4(), unaffected functions |
| 2026-11-24 | Auth — portal API | `supplierApi`/`buyerApi` wrappers in `portal-api.ts` enforce session + role + rate limit | ✅ Verified safe |
| 2026-11-24 | Auth — app routes | `(app)/layout.tsx` calls `requireUser()`, redirects to `/login` on failure, server component | ✅ Verified safe |
| 2026-11-24 | Auth — cron | `/api/jobs/run` checks `CRON_SECRET` header, fail-closed | ✅ Verified safe (suggest timing-safe compare later) |
| 2026-11-24 | IDOR — orders | `order.service.ts` calls `assertRecordInScope(user, order.companyId)` before returning data | ✅ Verified safe (pending resolveScope/assertCompanyInScope confirm) |
| 2026-11-24 | Tests | 178/178 vitest tests passing, including `portal-isolation.test.ts`, `portal-access.test.ts`, `portal-scope.test.ts` | ✅ Verified |
| 2026-11-24 | Build | `next build` successful, no type errors | ✅ Verified |

## Pending verification
- `resolveScope()` and `assertCompanyInScope()` — core functions behind all IDOR protection. Need to confirm: scope comes from trusted server-side lookup (not client-supplied session data), and comparison is strict (no empty-array bypass).
- Manual two-account IDOR test post-deploy (company A vs company B order/invoice access).