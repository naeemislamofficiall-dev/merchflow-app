# TASKS.md — MERCHFLOW parallel work board

Rules for every task: follow `CLAUDE.md` (layering, SHARED FILE rule, Definition of Done) and `docs/SPEC-SUMMARY.md`.
Read ONLY: `CLAUDE.md`, `docs/SPEC-SUMMARY.md`, **your own task block below**, and the files/folders named in it.
Status tags: `[todo]` → `[in-progress]` → `[review]` → `[done]` (`[done]` only by the owner after merge).

Already built (do NOT rebuild): Phase 1–8 modules (org, users/RBAC, buyer, enquiry, style, sample, order, T&A, costing, BOM, MRP, supplier, RFQ, quotation, PR, PO, GRN, inventory, fabric roll, issue/return, production order, cutting, sewing, WIP, finishing, subcontract, IE, QC, AQL, CAPA, packing, shipment, export docs, AP/AR, expense, profitability, dashboard, alerts, analytics, approvals, notifications, audit, documents).

## Merge order (owner merges in this order; rebase before opening PR)
`T1 → T2 → T6 → T3 → T4 → T5 → T7`
T1 first because it adds the test setup and cleans the shared nav file. T7 last because it touches auth.

## Shared-file reminder (details in CLAUDE.md §5)
`prisma/schema.prisma` (append at the bottom with `// ===== TN name (start/end) =====` markers), `permission-keys.ts`, `numbering-extra.ts`, `status-rules.ts`, `nav-config.ts`, `src/messages/en.ts|bn.ts`: add lines only at the end / in your own group. Migration name: `tN-<short-name>`.

---

## T1 — Test setup, CI, demo seed, nav cleanup  `[todo]`
- **Branch:** `feature/t1-tests-seed`
- **Goal:** Make the project safe to change in parallel and make the Golden Demo (spec Sec 85) runnable.
- **Scope:**
  1. Vitest setup (`vitest.config.ts`, `npm run test`). Unit tests for pure calc/rule files in `src/lib/` (`calculations.ts`, `production-calc.ts`, `quality-calc.ts`, `ie-calc.ts`, `finance-calc.ts`, `status-rules.ts`, `business-rules.ts`): BOM gross requirement, MRP net requirement, margin %, efficiency, status transitions.
  2. Permission test: a user without `x.create` is rejected by the matching service method (2-3 representative services).
  3. GitHub Actions `.github/workflows/ci.yml`: install → lint → typecheck → test → build.
  4. `scripts/seed-demo.ts`: the Golden Demo data (H&M Demo Buyer, style POLO-1024, 20,000 pcs order, color-size matrix, BOM, suppliers, materials, warehouses, a factory with lines). Idempotent (safe to run twice). Does not touch real data: refuse to run if `NODE_ENV=production`.
  5. Nav cleanup in `nav-config.ts`: remove duplicate entries (e.g. "Stock counts", "Scan"). Keep one entry per page.
- **Files:** `vitest.config.ts`, `src/lib/*.test.ts`, `.github/workflows/ci.yml`, `scripts/seed-demo.ts`, `package.json` (scripts only), `nav-config.ts`.
- **Pattern to copy:** `scripts/seed-permissions.ts` for script style.
- **Out of scope:** Playwright/E2E, new features, changing business logic.
- **Acceptance:** `npm run test` green · CI passes on a PR · `npx tsx scripts/seed-demo.ts` creates the demo order and rerun creates no duplicates · nav has no duplicate links.

## T2 — PPC / Capacity planning  `[todo]`
- **Branch:** `feature/t2-ppc`
- **Goal:** Spec Sec 25: `Confirmed Order → Production Requirement → Capacity → Plan`, with calendar + Gantt-style view.
- **Scope:**
  1. Model(s) for line capacity and plan allocation (e.g. `LineCapacity`, `PpcPlan`/`PpcAllocation`): factory, line, date, available minutes/pcs, planned pcs, linked to `ProductionOrder`. Factory working calendar (holidays/off days) if not already usable from `Factory.workingCalendar`.
  2. Calc in `src/lib/capacity-calc.ts` (pure): **Available capacity, Required capacity, Planned capacity, Capacity gap** (use SMV from the IE module and line operators/efficiency).
  3. `ppc.service.ts`: list confirmed orders without a plan, create/move/release allocations, overload detection per line/day.
  4. Pages: `/ppc` (planning board: lines × days, Gantt-style bars, overload highlighted) and `/ppc/capacity` (capacity vs load table, weekly/daily toggle). Link from production order detail.
  5. Rule: planned allocation cannot exceed order quantity; overload is shown as a warning, not silently allowed. Alert feed: overloaded line → existing `alert.service`.
- **Pattern to copy:** `production-orders` (service + pages) and `ie` (SMV data).
- **Out of scope:** auto-scheduling optimizer, drag-and-drop persistence beyond simple move/edit form, HR/operator rostering.
- **Acceptance:** create a plan for the demo order across 2 lines · gap shown correctly for a hand-calculated example (add as unit test if T1 is merged) · overloaded line appears in Alerts · audit log entry on every plan change.

## T3 — Textile processing branch (optional module)  `[todo]`
- **Branch:** `feature/t3-textile`
- **Goal:** Spec Sec 20 for composite/knit factories: Yarn, Knitting, Dyeing, Fabric finishing, Lab dip / shade approval.
- **Scope:**
  1. Models: `Yarn` (type, count, composition, color, lot, supplier, qty, rate), `KnittingOrder` (machine, program, yarn requirement, planned/actual qty, production date, reject), `DyeBatch` (dye lot, color, recipe, batch, input, output, shade, rework, chemical consumption), `LabDip` (standard, submission, buyer comments, approval date, rejection reason, resubmission count), fabric finishing log.
  2. Stock effects only through `src/lib/stock.ts` (yarn issued to knitting, greige fabric produced as fabric rolls/lots). Never write `stockTransaction` directly.
  3. Status machines in `status-rules.ts`. Lab dip flow: `Request → Dyeing → Lab Dip → Buyer Review → Approved/Rejected → Bulk Dyeing`.
  4. Pages under `/textile/yarn`, `/textile/knitting`, `/textile/dyeing`, `/textile/lab-dips`, `/textile/finishing` (list, new, detail).
  5. Feature flag: whole group hidden unless the company/factory enables it (use `Factory.factoryType` or a simple company setting).
- **Pattern to copy:** `subcontract` (multi-step process with in/out qty) and `fabric-rolls`.
- **Out of scope:** machine/IoT integration, recipe costing, ETP/chemical store.
- **Acceptance:** yarn GRN → knitting → dye batch → fabric lot visible in stock · lab dip resubmission count increments · bulk dyeing blocked until lab dip approved · nav group hidden for non-textile factory.

## T4 — Reporting export + scheduled reports + background jobs  `[todo]`
- **Branch:** `feature/t4-reports-jobs`
- **Goal:** Spec Sec 73 and Sec 72. MVP = CSV + Excel; add PDF and scheduled reports.
- **Scope:**
  1. Report registry in `src/app/(app)/analytics/reports.ts`: complete the Sec 50 list (Merchandising, Procurement, Inventory, Production, Quality, Shipment, Finance) where missing.
  2. Export: CSV + Excel (`exceljs`) from a shared helper; PDF/printable via a print stylesheet or `pdf` library (choose one, justify in PR). Export respects data scope and `analytics.export` permission.
  3. Background jobs: simple job runner (route handler + secret header for an external cron, or a small worker script). Job table with status/last run/error (`JobRun`). Jobs: daily T&A overdue alerts, supplier-late reminders, daily KPI snapshot, scheduled report email.
  4. Scheduled report: admin page to define report + recipients + time (e.g. 08:00 Factory Production Summary → Factory Head, Production Manager). Email through the existing email setup.
  5. Admin page `/admin/jobs` showing last runs, failures, a "run now" button.
- **Pattern to copy:** `analytics` page/service, `notification.service.ts`.
- **Out of scope:** BI dashboard builder, queue infrastructure (Redis/BullMQ) unless the owner asks.
- **Acceptance:** each report exports CSV and Excel · PDF for at least 5 key reports · a scheduled report arrives by email at the set time (test with "run now") · job failures visible in `/admin/jobs` · long reports never block the HTTP request.

## T5 — Data import + opening balance  `[todo]`
- **Branch:** `feature/t5-import`
- **Goal:** Spec Sec 74–75. Flow: `Upload → Validate → Preview Errors → Confirm → Import → Audit`. Never import unvalidated data.
- **Scope:**
  1. `ImportBatch` / `ImportRow` models (type, status, file name, counts, row errors, who/when).
  2. Importers (Excel/CSV): Buyers, Suppliers, Materials, Styles, Orders (with color-size matrix), **Opening stock**, Open POs, Shipment balances. Employees only if an Employee model exists by then (otherwise skip).
  3. Each importer = Zod row schema + lookup/dedupe rules + dry-run. Page `/import`: choose type → download template → upload → error preview table → confirm → result summary.
  4. Opening stock must go through `src/lib/stock.ts` as an opening-balance transaction with reason. Import runs in a DB transaction per batch (all or nothing).
  5. Audit log entry per batch; import is permission `import.run` (new key).
- **Pattern to copy:** `inventory` adjustments (reason + audit) and any existing service using `exceljs`/CSV.
- **Out of scope:** mapping UI for arbitrary column names, scheduled imports, API imports.
- **Acceptance:** a file with 3 bad rows shows exactly those 3 errors and imports nothing until fixed · confirm imports all good rows · rerun with same file does not duplicate (dedupe key) · opening stock appears in Stock with the opening-balance transaction.

## T6 — Cutting (marker/lay), Quality (rework, pre-shipment), Approval engine gaps, Season master  `[todo]`
- **Branch:** `feature/t6-cutting-quality-approval`
- **Goal:** Close partial modules (SPEC-SUMMARY §6: Sec 28, 33/36, 45).
- **Scope:**
  1. **Marker/Lay:** marker planning screen inside cutting: marker (width, length, efficiency %, size ratio), lay plan (layers, lay qty), fabric requirement; link marker → lay → bundles. Use existing `Lay`/`CutPlan` models, add `Marker` if missing.
  2. **Rework:** rework record from inline/end-line/finishing QC (defect, qty, repaired/rejected), WIP effect, Rework % in quality report.
  3. **Pre-shipment inspection:** make the `PRE_SHIPMENT` stage a proper flow with report + attachments; keep rule 11 (final inspection fail blocks shipment unless override with reason).
  4. **Approval engine:** add delegation (approver can delegate for a date range), escalation (pending > N days → notify next level), "who is pending" view per request, and confirm entity coverage: costing, sample, PR, PO, material issue exception, stock adjustment, shipment, credit note. Missing entities get wired in.
  5. **Season master:** `/seasons` page (list/new/edit) using the existing `Season` model; style/order pickers already use it.
- **Pattern to copy:** `cutting`, `quality/inspections`, `approvals`.
- **Out of scope:** CAD/marker software integration, new quality stages, buyer portal approval.
- **Acceptance:** marker → lay → bundle chain traceable on cutting detail · rework qty reduces defect balance and shows in DHU/Rework report · pre-shipment fail blocks shipment · delegated approver can approve and audit shows both users · escalation notification fires in a test.

## T7 — Supplier portal + Buyer portal + REST API layer  `[todo]`
- **Branch:** `feature/t7-portals`
- **Goal:** Spec Sec 66–67, isolated from internal data (tenant/security boundary). Do this last.
- **Scope:**
  1. Portal users: role type `SUPPLIER` / `BUYER` linked to `supplierId` / `buyerId` (new fields/model, no new auth system: reuse NextAuth). Proxy (`src/proxy.ts`) routes portal users only to `/portal/*`; internal users cannot be mistaken for portal users.
  2. **Supplier portal** `/portal/supplier`: RFQs (submit quotation), POs, required vs confirmed date (supplier confirms), shipment updates, document upload, invoice status. **No** internal factory data.
  3. **Buyer portal** `/portal/buyer`: styles, sample status, approve/reject sample with comment, order status, T&A, shipment status, document download.
  4. Every portal query filters by the portal user's `supplierId`/`buyerId` at service level (IDOR-safe). Portal actions write audit logs with portal-user identity.
  5. REST route handlers under `src/app/api/v1/` for the portal reads/writes (auth + rate limit), so a mobile app can reuse them later.
- **Pattern to copy:** `rfqs`, `samples`, `shipments` services; `scope.ts` for scoping.
- **Out of scope:** public self-registration, SSO, WhatsApp/SMS, buyer chat.
- **Acceptance:** supplier A cannot open supplier B's PO by changing the URL id (test) · buyer cannot see another buyer's order · supplier confirming a date updates the follow-up record · sample approved in portal moves status per `sampleTransitions` · portal user cannot reach any internal page.

---

## Backlog (not tasks yet — do not start)
AI layer (order risk, forecasting, natural-language filter, management brief — Sec 64) · Offline/retry queue (Sec 63) · Predictive quality / production forecast (Phase 10).
