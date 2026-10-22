# SPEC-SUMMARY — MERCHFLOW Enterprise Garments ERP

Master Specification docx-er shaar. Section number = docx-er section number. Ei file-i tomar spec; docx porar dorkar nei.

## 1. Principles (Sec 3)
- **Order-centric chain:** Buyer → Order → Style → Color/Size → BOM → Requirement → Procurement → Inventory → Production → QC → Packing → Shipment. Prottek downstream record order/style-e traceable.
- **No duplicate entry:** order qty → MRP; BOM → procurement; GRN → stock; issue → availability; production output → WIP; QC → accepted/rejected; packing → FG stock; shipment → FG balance kome.
- **Configuration over hard-coding:** approval limit, size set, color, document type, process, warehouse, status rule — config.
- **Full auditability:** actor, time, action, entity, before/after, reason.
- **Exception-first:** dashboard-e delay, shortage, late supplier, pending approval, under-target, high rejection, shipment risk, expiring compliance, cost overrun.

## 2. Status machines (Sec 58) — arbitrary status change nishiddho
- Order: Draft → Confirmed → In Production → Partially Shipped → Fully Shipped → Closed (Confirmed → Cancelled)
- Sample: Requested → In Development → Internal QC → Sent → Buyer Review → Approved | Rejected → Revision → Resent
- PR: Draft → Submitted → Approved → PO Created → Closed
- PO: Draft → Submitted → Approved → Sent → Acknowledged → Partial Receipt → Complete → Closed
- Production: Planned → Released → In Progress → Paused → Completed → Closed
- Shipment: Draft → Planned → Documents Ready → Booked → Shipped → Delivered → Closed

## 3. Business rules (Sec 59) — shob feature-e mante hobe
1. PO required approval field chhara approve hobe na.
2. Rejected PO-te reason lagbe.
3. Received qty ordered qty-r beshi hobe na (exception permission chhara).
4. Stock issue available stock-er beshi hobe na (negative stock explicitly on na thakle).
5. Shipment packed qty-r beshi hobe na.
6. Production completion released qty-r beshi hobe na (authorized overproduction chhara).
7. Approved BOM revision silently edit kora jabe na.
8. Approved costing immutable; notun revision lagbe.
9. Closed order edit hobe na, shudhu controlled amendment diye.
10. Supplier deactivate holeo purano transaction link thakbe.
11. Final inspection fail → shipment block (authorized override chhara).
12. Material shortage production block korle alert hobe.
13. T&A delay shipment-ke affect korle shipment-risk alert hobe.
14. Prottek stock adjustment-e reason + permission.
15. Prottek order amendment-e purano value rakhte hobe.

## 4. Cross-cutting
- **Permission:** `module.action` (Sec 55). **Approval engine (Sec 45):** configurable rule, e.g. PO < $5k → Manager; $5k–$50k → Manager → Head of Procurement; > $50k → Manager → Finance → Director. Approval dorkar: costing, sample, PR, PO, material issue exception, stock adjustment, shipment, credit note.
- **Multi-company/factory (Sec 60), Multi-currency (61), Multi-language (62):** en + bn.
- **Background jobs (Sec 72):** email, scheduled T&A alert, supplier reminder, report generation, AI analysis, file processing, daily KPI snapshot. Slow kaj-er jonno user-er HTTP request-ke wait koranor na.
- **Testing (76-77), Performance (78), Observability (79), Backup (80), Git (82)** — Phase-wise.

## 5. Implementation phases (Sec 83) ar MVP (Sec 84)
Phase 0 Architecture · 1 Platform · 2 Merchandising · 3 Commercial (costing/BOM/MRP/supplier/RFQ/PR/PO) · 4 Inventory · 5 Production · 6 Quality · 7 Packing & Shipment · 8 Finance/HR · 9 Enterprise (multi-company, portals, scheduled reporting) · 10 Intelligence (AI, forecasting, risk).
MVP (27 module): Organization, Users/RBAC, Buyer, Style, Sample, Order, T&A, Costing, BOM, MRP, Supplier, PR, PO, Inventory, Fabric Roll, PPC, Production Order, Cutting, Sewing, WIP, QC, Packing, Shipment, Dashboard, Audit, Notifications, Reports.

**Code-e ekhon kora ache (verified):** Phase 1–8 er prai shob (144 page, 60+ service). Baki ache TASKS.md-te.

## 6. Gap sections (jegulo ekhono baki — detail)

### Sec 25 PPC / Capacity (T2)
Flow: `Confirmed Order → Production Requirement → Capacity → Plan`.
Production order field: number, style, buyer, order, qty, factory, line, start date, end date, priority, routing.
Capacity planning calculate korbe: **Available capacity, Required capacity, Planned capacity, Capacity gap.** Calendar + Gantt-style visualization.
Related: Sec 26 routing, Sec 27 IE (SMV/operation bulletin), Sec 29 sewing line, Sec 30 WIP.

### Sec 28 Cutting room / Marker (T6)
Cut Plan → Fabric Reservation → Lay Plan → **Marker** → Cutting → Inspection → Bundle.
Cut plan: style, order, color, size ratio, lay qty, planned output, fabric requirement. Bundle: id, style, color, size, qty, cut no, destination line. Barcode/QR scan support.

### Sec 20 Textile processing branch (T3) — optional module (composite/knit factory-r jonno)
- **Yarn:** type, count, composition, color, lot, supplier, qty, rate.
- **Knitting:** machine, program, yarn requirement, planned qty, actual qty, production date, reject.
- **Dyeing:** dye lot, color, recipe, batch, input, output, shade, rework, chemical consumption.
- **Lab Dip flow:** Request → Dyeing → Lab Dip → Buyer Review → Approved/Rejected → Bulk Dyeing.
- **Shade approval track:** standard, submission, buyer comments, approval date, rejection reason, re-submission count.
- Fabric Finishing (module map #35) ekhane-i pore.
- Module map (Sec 4): 32 Yarn Mgmt, 33 Knitting, 34 Dyeing, 35 Fabric Finishing, 36 Lab Dip/Shade Approval.

### Sec 33/36 Quality, Rework, Pre-shipment (T6)
8 stage: Incoming, Fabric, Cutting, Inline, End-line, Finishing, Final, **Pre-shipment** (enum `InspectionStage` e sob ache). Rule 11: final inspection fail → shipment block. Defect master: broken stitch, open seam, skip stitch, uneven hem, measurement deviation, stain, hole, shade variation, print defect, embroidery defect. Rework module-er jonno Sec 4 #60 (Rework) ar report (Sec 50: DHU, defect Pareto, Rework, Reject, AQL).

### Sec 45 Approval engine (T6, verify + gap)
Amount-based multi-step (code-e `Workflow` + `WorkflowStep` ache: minAmount/maxAmount, role-per-step). Gap check: delegation/escalation, "who is pending" visibility, entity coverage list above.

### Sec 73 Reporting export (T4)
CSV, Excel, PDF, printable. **MVP: CSV + Excel. Enterprise: PDF + scheduled reports.** Example: prottodin 8:00 AM "Factory Production Summary" → Factory Head, Production Manager, Management. Sec 50-er report list:
- Merchandising: buyer order, style status, T&A, sample approval, order amendment
- Procurement: supplier purchase, material booking, supplier delay, purchase spend, open PO
- Inventory: stock, stock aging, roll stock, slow-moving, stock valuation
- Production: daily production, line output, efficiency, WIP, capacity utilization
- Quality: DHU, defect Pareto, rework, reject, AQL
- Shipment: shipment plan, ex-factory, buyer shipment, balance, on-time shipment
- Finance: costing, margin, supplier payable, buyer receivable, order profitability

### Sec 74-75 Data import ar Opening balance (T5)
Excel import khub dorkari (factory spreadsheet use kore). Import: Buyers, Suppliers, Styles, Orders, Materials, **Opening stock**, Employees.
**Flow: Upload → Validate → Preview Errors → Confirm → Import → Audit.** Unvalidated spreadsheet kokhono direct import na.
Migration/opening balance: opening stock, open PO, open orders, existing suppliers/buyers/employees, existing shipment balances.

### Sec 66-67 Portals (T7)
- **Supplier Portal:** login kore RFQ, PO, required date, confirmed date, shipment update, document upload, invoice status dekhbe. Internal factory data dekhbe **na**.
- **Buyer Portal:** styles, sample status, approvals, order status, T&A, shipment status, documents dekhbe; comment, sample approve/reject, document download korte parbe. Tenant/security boundary-te isolated.

### Backlog (Phase 9-10, ekhono task na)
- **AI layer (Sec 64):** AI business rule bypass korte parbe na. Order Risk (T&A delay, material, production, QC, ship date → High Risk + reasons), Material Forecast, Production Forecast (completion date, capacity shortage, bottleneck), Natural-language query (**structured validated filter, kokhono arbitrary SQL na**), Management Brief (prottek number real data theke).
- **Offline (Sec 63):** Phase 2 enhancement: local draft, retry queue, sync status, conflict handling. MVP-te full offline na.

## 7. Golden demo scenario (Sec 85) — 32 step, end-to-end acceptance
Buyer enquiry → Style created → Tech pack uploaded → Proto sample → Fit sample approved → Costing approved → Buyer order confirmed → Color-size matrix → T&A generated → BOM approved → MRP calculates requirement → PR created → Supplier quotation compared → PO approved → Fabric received → Rolls inspected → Material issued to cutting → Cut plan → Bundles → Sewing line assigned → Hourly production entered → WIP tracked → Inline QC → Finishing → Final AQL → Cartons packed → Packing list → Shipment created → Commercial documents → Shipment closed → Actual costing → Order profitability.

## 8. Final development rule (Sec 92, bhab)
MVP age; 100 module ekshathe na. Prottek module: order/style-e traceable, audit-able, permission-guarded, status-machine-controlled, exception alert-e feed kore.
