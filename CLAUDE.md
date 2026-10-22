@AGENTS.md

# MERCHFLOW — Enterprise Garments ERP (working rules for every Claude session)

> Pehle `@AGENTS.md` upore import kora ache (Next.js notun version-er warning). Seta mochhbe na.

## 0. Read ONLY these (credit bachanor jonno)
1. This file (`CLAUDE.md`)
2. `docs/SPEC-SUMMARY.md`  (spec-er shaar. Pura docx kokhono porbe na)
3. `TASKS.md`  (shudhu **tomar nijer task-er block**)
4. Task-e jei file/folder-er naam deya ache + oi file-er sathe similar ekta existing module (pattern dekhar jonno)

**Kokhono porbe na / upload chaibe na:** full zip, master spec `.docx`, `node_modules`, `src/generated`, `prisma/migrations`, `.next`.
`prisma/schema.prisma` pura porar dorkar nei: `grep -n "^model Xyz" prisma/schema.prisma` diye shudhu dorkari model dekho.

## 1. Stack
Next.js 16 (App Router, Server Components + Server Actions) · React 19 · TypeScript · Prisma 7 (`@prisma/adapter-pg`, PostgreSQL) · NextAuth v5 beta · Zod 4 · Tailwind 4 · react-hook-form · @tanstack/react-table.
Scripts: `npm run dev | build | lint | typecheck`. DB script-gulo `scripts/*.ts` (run: `npx tsx scripts/<name>.ts`).

## 2. Layering (ei pattern-ei kaj korbe, notun style baniyo na)
```
src/app/(app)/<module>/page.tsx      Server Component. requireUser() + can(user,"x.view") else redirect("/dashboard")
src/app/(app)/<module>/actions.ts    "use server". Prottek action = runAction(async()=> service.method(dropEmpty(values)))
src/services/<name>.service.ts       class XService extends BaseService ... export const xService = new XService()
src/lib/*                            pure helper / calc / rules (DB chhara test kora jay)
prisma/schema.prisma                 data model
```
- Service-er prottek public method **shuru-te** `await this.guard("module.action")` dey (permission check + user).
- Data scope: list-e `const scope = await this.scopeOf(user)` diye `companyId in scope.companyIds` ar `factoryId in scope.factoryIds` filter. Single record-e `assertRecordInScope(user, rec.companyId)` + `found(x,"Name")` (`src/lib/service-helpers.ts`).
- Input validation: Zod schema service-er upore, `schema.parse(input)`.
- Business rule bhanga hole `throw new BusinessRuleError("clear English message")` (`src/lib/business-rules.ts`). `runAction` (`src/lib/action-result.ts`) eta UI-te message hishebe dekhay.
- Create/update/approve/cancel/delete prottek-e `await this.audit({ user, action, entity, entityId, before?, after? })`.
- Status badlano: transition map `src/lib/status-rules.ts`-e rakho (`TransitionMap`), `assertTransition(map, from, to)` use koro. Arbitrary status change nishiddho (spec Sec 58).
- Document number: `src/lib/numbering-extra.ts`-e `nextXxxNo(companyId)` function jog koro (pattern: `PREFIX-YYYYMM-0001`, `monthPrefix()` + `withCount()`).
- Stock-er jekono poriborton **shudhu** `src/lib/stock.ts` helper diye (`TX_OPTIONS`, `lockMaterials`, `loadWarehouse` ...). Direct `stockTransaction` write korbe na.
- Multi-company/factory: notun model-e `companyId` (ar dorkar hole `factoryId`) rakho, index dao.

## 3. UI pattern
- Layout/header: `components/layout/page-header` · tables: `components/ui/table` ba `components/data/data-table` · form/create: `components/crud/crud-kit` (`CreateForm`) + `components/forms/form-field` · detail page: `components/detail/detail-page`, `status-badge`, `kpi-card`.
- Notun page banale `src/components/layout/nav-config.ts`-e entry dao (`ready: true`, `permission: "x.view"`). Duplicate entry banabe na.
- **UI text English.** Dictionary `src/messages/en.ts` + `bn.ts` (`translate()` in `src/lib/i18n.ts`). Notun UI text hole dutor-i key dao.
- Code comment Bangla/Banglish thakte pare (existing code-er moto), kintu error message ar label English.

## 4. Permission
Permission naam `module.action` (spec Sec 55). Notun module hole `src/lib/permission-keys.ts`-er `MODULES`-e line jog koro, tarpor `npx tsx scripts/seed-permissions.ts` chalate hobe. Role-e dewa admin UI theke (`/admin/roles`).

## 5. SHARED FILE rule (parallel account-er conflict ba MERGE-er jonno — khub dorkari)
Ei file-gulo shob task chhuye. Tai:
- `prisma/schema.prisma`: **sobar niche** notun model/enum add koro, ekta marker comment diye:
  `// ===== T2 PPC (start) =====` ... `// ===== T2 PPC (end) =====`. Existing model-er majhe bosiyo na. Existing model-e field lagle minimum field add koro ar PR-e bole dao.
- `src/lib/permission-keys.ts`, `src/lib/numbering-extra.ts`, `src/lib/status-rules.ts`, `src/components/layout/nav-config.ts`, `src/messages/en.ts|bn.ts`: shudhu **file-er shesh-e / nijer module group-e** line jog koro. Onno task-er line chhuyo na.
- Migration: branch-e `npx prisma migrate dev --name tN-<short-name>` (N = task number). **PR khola-r age** `git fetch && git rebase origin/main` kore dekho schema conflict ache kina; conflict thakle migration regenerate korte hobe (rebase-er por abar `migrate dev`).
- Merge order TASKS.md-er "Merge order" section-e deya ache.

## 6. Business rules (non-negotiable)
`docs/SPEC-SUMMARY.md` Section 3-er 15-ta rule. Kono feature-e ei rule bhange emon kichu likhbe na (e.g. approved costing/BOM silently edit, stock negative, shipment > packed qty, closed order edit). Dorkar hole override-permission + audit reason.

## 7. Definition of Done (PR dewar age)
1. `npm run typecheck` ar `npm run lint` clean.
2. Notun/chnaged calc/rule logic-er jonno `src/lib/*` te pure function + (jodi T1 test setup merge hoye thake) unit test.
3. Task-er "Acceptance" checklist-er prottek ta manually verify (ki dekhale/click korle ki hobe, short note PR-e).
4. Shudhu **nijer task** `TASKS.md`-e `[in-progress]` → `[review]` korbe. `[done]` **shudhu owner (user) merge-er por** kore.
5. Task-er "Out of scope" er kichu korbe na. Onno task-er jinis bhangle PR-e janiye dao.

## 8. Git
- Branch: task-er `Branch:` field-er naam. `main` e direct commit na.
- Commit message: `T2: add capacity calculation` (task id prefix).
- PR description: ki baniyo, kon file chhuyecho, shared file-e ki jog korecho, kon acceptance item verify hoyeche.

## 9. Owner-er sathe kaj korar style (owner-er stated preference)
- Owner **Banglish** (Bengali in English letters) e likhe. Tumio chat-e **Banglish**-e uttor dao. Code, file content, UI text English.
- **Notun file** dile: exact `create` command (mkdir + cat/heredoc ba editor path) ar **exact path** bolo (e.g. `src/lib/capacity-calc.ts`).
- **Existing file edit** hole: kon file, kon function/line-er **age/pore**, exact **before → after** dekhao. Pura file abar dibe na.
- Code **ek module ek module kore** dao. Zip/docx upload chaibe na.
