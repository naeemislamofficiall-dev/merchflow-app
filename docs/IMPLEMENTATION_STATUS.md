# MERCHFLOW ERP — Implementation Status

This status is based on a source-tree review and the master specification. It is **not** a claim that every workflow has passed end-to-end testing. A route existing does not prove that its permissions, transitions, integrations, or business outcomes are production-ready.

## Added in this implementation pass

- **Order Amendments UI** at `/orders/amendments`: records reason, selected header changes, prior-value snapshots, and amendment history using the existing `orderService.amend()` transaction/business rules.
- **Style revision proposal and approval UI** in the Style detail → Revisions tab: proposal fields, required reason, pending/approved status, and approval-and-apply action using `styleService`.
- **Supplier Proforma Invoice register** at `/purchase-orders/proforma-invoices`: creates PI records against a PO, snapshots currency conversion through the existing PO service, and lists company-scoped records.
- **Stock adjustments / cycle count corrections** at `/inventory/adjustments`: quantity direction and negative-stock safeguards are enforced by `inventoryService.adjust()`.
- **Material returns** at `/material-returns`: returns against issued lines and relies on the service to prevent over-return and post stock transactions.
- **Forwarder master UI** at `/shipments/forwarders`: adds forwarders for use in shipment planning.
- Navigation entries for the new pages.
- Removed the original `.env` file from this package because it contained live-looking credentials. Use `.env.example` and supply your own local secrets.
- Added initial setup, security, CI, and golden-demo documentation.

## Existing implementation areas found in the supplied project

The source tree already contains routes/services for merchandising, buyer/style/sample/order, T&A, costing/BOM, MRP, PR/RFQ/quotations/PO, GRN, inventory/rolls/issues, production orders/cutting/sewing/WIP/finishing/subcontract, QC/defects/AQL/CAPA, cartons/shipments/commercial documents, finance, alerts, approvals, notifications, analytics, organization, documents, and currency rates. Their presence is not a substitute for verifying every rule against the specification.

## Still requiring substantial implementation or verification

The following were not fully implemented or verified by this pass and must not be treated as production-ready:

- Textile-process workflows: yarn, knitting, dye-lot, finishing-batch, lab-dip and shade approval.
- HR: employee master, attendance, overtime, leave, payroll and employee self-service.
- Buyer/supplier external portals, identity/invitation lifecycle, and portal-specific data isolation.
- Forecasting/AI: delivery-risk scoring beyond existing operational alerts, material-demand forecast, capacity forecast, natural-language analytics and predictive quality.
- Full buyer configuration/approval matrix and end-to-end buyer-specific sample revision lifecycle verification.
- Complete T&A dependency recalculation, overdue alerts, shipment-risk scoring and scheduled background jobs.
- Supplier quotation comparison UI and all booking/return/count/barcode/valuation traceability paths.
- Capacity Gantt, line balancing, bottleneck analytics, hourly target/efficiency dashboards, downtime/rework, and subcontract end-to-end reconciliation.
- Buyer-specific AQL profile enforcement, defect Pareto, and CAPA verification/closure governance.
- Formal packing-list PDF/Excel export, export/LC/EXP/BTB-LC integrations, customs/C&F/forwarder handover, and delivery confirmation evidence.
- Actual-vs-estimated costing and cost variance, invoice three-way matching, payment reconciliation and historical FX regression tests.
- Full RBAC permission matrix review, server-side authorization tests, audit/document retention, global search coverage, multilingual completeness, mobile/offline flows, integration tests, e2e tests, and production recovery drills.
- Database migration verification against a clean PostgreSQL database and a real staging deployment.

## Validation performed

- Source tree and existing services inspected.
- Added route/action files and navigation entries.
- Removed the provided `.env` from the output tree and replaced it with an empty template.
- A dependency install/build could not be confirmed in this environment; `npm ci` did not finish successfully here. Run the commands in `README.md` in a network-enabled environment before deployment.

## Release rule

Do not deploy this package to production until dependencies install, Prisma client generation, migration deployment, lint, type-check, build, authorization tests and the golden demo scenario all pass against a non-production database.
