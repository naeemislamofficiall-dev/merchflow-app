# MERCHFLOW

Garments & Textile ERP (Bangladesh RMG / export factory / composite factory).

**Core principle:** One order → one connected operational truth.

Buyer-er enquiry theke shuru kore shipment ar invoice porjonto sob kichu ekta system-e connected thake. Ekbar data dile (buyer, style, order qty, BOM) porer step-gulo oi data reuse kore, abar type korte hoy na.

---

## Business chain

```
Buyer → Enquiry → Style → Sample → Costing → Order → T&A → BOM
→ Material Requirement (MRP) → PR → RFQ/Quotation → PO → GRN → Inventory
→ Production Order → Cutting → Sewing → Finishing → QC / AQL
→ Packing → Shipment → Invoice / Finance
```

Prottek downstream record jeno order/style-er sathe traceable thake.

## Design principles

- **Order-centric:** central object holo Order, generic booking na.
- **No duplicate entry:** order qty → MRP, BOM → procurement, GRN → inventory, production output → WIP, packing → finished goods, shipment → balance.
- **Configuration over hard-coding:** approval rule, T&A template, production route, buyer config, role/permission sob configurable.
- **Full audit:** important action-e actor, time, before/after, reason record hoy.
- **Exception-first:** dashboard/alerts-e delay, shortage, late supplier, failed inspection, pending approval age dekhay.
- **Never trust the frontend:** permission check server-side service layer-e.

---

## Tech stack

| Layer | Ki use hoy |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack), React 19, TypeScript |
| Styling | Tailwind CSS v4 (tokens `src/app/globals.css`-er `@theme`-e, `tailwind.config` nai), shadcn-style components, lucide-react |
| Database | PostgreSQL (Supabase) + Prisma |
| Prisma client | `src/generated/prisma` (generated, edit korbe na), PrismaPg adapter |
| Auth | next-auth, optional MFA (TOTP + backup code) |
| Validation / forms | zod, React Hook Form + zodResolver |
| Charts | Hand-made SVG/CSS (Recharts nai) |
| Test | Vitest |
| Scripts | tsx |
| Language | English + Bangla (`src/messages/en.ts`, `bn.ts`) |

---

## Features (module onujayi)

Bracket-er path gulo app-er route.

**Core platform**
- Login, forgot/reset password, profile, avatar (`/login`, `/account/profile`)
- MFA: authenticator code + backup code, replay protection (`/account/security`)
- Users, Roles + Permission + Scope, portal users (`/admin/users`, `/admin/roles`, `/admin/portal-users`)
- Audit logs (`/admin/audit-logs`)
- Approval engine + rules (`/approvals`, `/approvals/rules`)
- Notifications, Alerts / exception center (`/notifications`, `/alerts`)
- Documents (`/documents`), Data import with template (`/import`)
- Background jobs, scheduled reports (`/admin/jobs`, `/admin/scheduled-reports`)
- Organization, factories, warehouses (`/organization`, `/warehouses`)
- Currency / exchange rate (`/currency`)
- Scan page for QR/barcode (`/scan`)

**Commercial & Merchandising**
- Buyers (`/buyers`), Enquiries (`/enquiries`), Seasons (`/seasons`)
- Styles with color/size matrix (`/styles`)
- Samples + calendar (`/samples`, `/samples/calendar`)
- Quotations (`/quotations`)
- Orders + amendments (`/orders`, `/orders/amendments`)
- T&A: plans, calendar, risk, templates (`/tna`, `/tna/calendar`, `/tna/risk`, `/tna/templates`)
- Costing with versions (`/costing`), BOM (`/bom`)

**Sourcing & Supply chain**
- Material requirements / MRP (`/material-requirements`)
- Purchase requisition (`/prs`), RFQ (`/rfqs`), Purchase orders + proforma invoices (`/purchase-orders`)
- Suppliers (`/suppliers`), Supplier follow-up (`/follow-ups`)

**Textile processing**
- Yarn, Knitting, Dyeing, Fabric finishing, Lab dips (`/textile/*`)

**Store & Inventory**
- Goods receipt / GRN (`/goods-receipts`)
- Inventory, lots, rolls, adjustments, transfers (`/inventory/*`)
- Fabric rolls (`/fabric-rolls`)
- Material issue / return (`/material-issues`, `/material-returns`)

**Production**
- PPC + capacity (`/ppc`, `/ppc/capacity`)
- Production orders + routes (`/production-orders`)
- Cutting + bundles (`/cutting`), Sewing (`/sewing`), WIP (`/wip`), Finishing (`/finishing`)
- Industrial engineering (`/ie`), Subcontract (`/subcontract`)

**Quality**
- Inspections, AQL, CAPA, Defects, DHU (`/quality/*`)

**Packing & Shipment**
- Cartons (`/packing/cartons`)
- Shipments + forwarders (`/shipments`, `/shipments/forwarders`)
- Commercial / export documents (`/commercial/documents`)

**Finance**
- Payables, Receivables, Expenses, Profitability (`/finance/*`)

**Management & Intelligence**
- Dashboard (`/dashboard`), Analytics + export/print (`/analytics`)
- AI insights (`/ai`)

**Portals**
- Buyer portal (`/portal/buyer`), Supplier portal (`/portal/supplier`)
- Portal API (`/api/v1/portal/buyer/*`, `/api/v1/portal/supplier/*`)

**System API**
- `/api/health`, `/api/jobs/run`, `/api/avatar/[id]`, `/api/auth/[...nextauth]`

---

## Folder structure

```
src/
  app/(app)/<module>/page.tsx   server page; client part alada file-e
  app/(app)/<module>/actions.ts server actions (runAction diye wrapped)
  app/api/                      route handlers
  services/*.service.ts         business logic (BaseService extend kore)
  lib/                          rules, calculations, helpers, tests
  components/ui                 shadcn-style base components
  components/{layout,dashboard,approvals,detail,forms}
  messages/                     en.ts, bn.ts
  generated/prisma/             Prisma client (generated)
prisma/                         schema + seed
scripts/                        admin / setup script
sql/                            manual SQL (Supabase SQL editor-e chalate hoy)
docs/                           documentation, docs/archive = purano patch note
public/  storage/               static file, uploaded avatar
```

---

## Architecture (code kivabe lekha hoy)

```
UI → Server Action / Route Handler → Service → Business rules → Prisma → PostgreSQL
```

- Business logic UI component-e na, `src/services/*.service.ts`-e.
- Service gulo `BaseService` extend kore. Prottek method:
  1. `this.guard("permission.key")` diye permission check
  2. `listFilter(user)` diye company/factory scope
  3. rule check (`src/lib/business-rules.ts`, `status-rules.ts`)
  4. kaj korar por `this.audit(...)`
- Server action gulo `runAction` (`src/lib/action-result.ts`) diye wrap kora.
- Status change `assertTransition` diye, jekhane khushi status bodlano jay na.
- Money: transaction currency, base currency, exchange rate, rate date save hoy. Purano transaction aj-er rate diye abar hisab hoy na.

### State flow (spec onujayi)

| Entity | Flow |
|---|---|
| Order | Draft → Confirmed → In Production → Partially Shipped → Fully Shipped → Closed |
| Sample | Requested → In Development → Internal QC → Sent → Buyer Review → Approved / Rejected → Revision |
| PR | Draft → Submitted → Approved → PO Created → Closed |
| PO | Draft → Submitted → Approved → Sent → Acknowledged → Partial Receipt → Complete → Closed |
| Production | Planned → Released → In Progress → Paused → Completed → Closed |
| Shipment | Draft → Planned → Documents Ready → Booked → Shipped → Delivered → Closed |

### Coding rules (ESLint / React Compiler)

- Render-er bhitore component toiri korbe na (module-level map ba `createElement` use koro).
- Render-er bhitore variable reassign korbe na (`reduce` / `filter` use koro).
- `useEffect`-er bhitore synchronous `setState` korbe na.
- `watch()` er bodole `useWatch` use koro.

---

## Security

- Role + Permission + Scope (Company / Factory)
- Server-side permission check (frontend-er upor nirbhor na)
- Optional MFA, backup code, replay protection
- Audit log, login rate limiting
- Buyer ar supplier portal alada boundary-te, supplier internal data dekhe na

---

## Setup

Requirement: Node.js, PostgreSQL database (Supabase), PowerShell / VS Code.

```powershell
npm install
```

`.env` file toiri koro (secret kokhono git-e commit korbe na):

```
DATABASE_URL="postgresql://..."
# [FILL] baki variable (auth secret etc.) .env theke dekhe likho
```

```powershell
npx prisma generate
npm run dev
```

App: http://localhost:3000

### Database

- Schema change hole: SQL Supabase SQL editor-e chalao, tarpor
  ```powershell
  npx prisma db pull
  npx prisma generate
  npx tsc --noEmit
  ```
- **`prisma migrate dev` chalabe na.**
- `Property 'userMfa' does not exist` error mane table DB-te nai. `sql/user-mfa.sql` chalao.
- `.next/types/validator.ts ... Cannot find module` error mane purono build cache:
  ```powershell
  Remove-Item -Recurse -Force .next
  ```

### Setup script

`scripts/` folder-e `create-admin.ts`, `seed-permissions.ts`, `seed-currency.ts`, `seed-rate.ts` ache. Chalanor niyom:

```powershell
npx tsx scripts/<file>.ts
```

`[FILL]` prothom setup-er sothik order ekhane likho.

### Demo data

```powershell
npx tsx prisma/seed-demo.ts           # demo data bosao
npx tsx prisma/seed-demo.ts --reset   # sheta muche abar bosao
```

Eta shudhu `SEED-` diye shuru hoya record chhuye. Master data (buyer, style, supplier, material) upsert hoy, delete hoy na. Tarpor `/dashboard` kholo.

---

## Development commands

| Command | Kaj |
|---|---|
| `npm run dev` | dev server |
| `npm run build` | production build |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | type check |
| `npx vitest run` | unit test |
| `npm run check:structure` | project structure check |

Prottek change-er por chalao: `npx tsc --noEmit` ar `npm run lint` (0 error), tarpor `npm run build`.

Commit message style: `feat: ...`, `fix: ...`, `test: ...`

---

## Documentation

- `docs/backup-and-recovery.md`, `docs/golden-demo.md` (`[FILL]` gulo bharte hobe)
- `docs/archive/` purano patch note ar SQL, ekhon ar lage na
- Master spec: `MERCHFLOW_Enterprise_Garments_ERP_Master_Specification.docx`

---

## Ekhono baki (spec-er sathe tulona)

Ei page gulo spec-e ache kintu ekhon build-er route list-e nai:

- HR: `/employees`, `/attendance`, `/leave`, `/payroll`
- Stock transfer / count alada page, `/suppliers/performance`, `/ie/*` alada sub-page
- Offline / poor network support (spec-e Phase 2)

Spec-er Golden demo scenario (Buyer → Order → ... → Shipment) full end-to-end test ekhono `[FILL]`.