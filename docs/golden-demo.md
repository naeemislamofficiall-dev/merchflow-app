# Golden Demo: H&M Demo Buyer, POLO-1024, 20,000 pcs (spec section 85)

Lokkho: ekta order shuru theke shesh porjonto cholbe, prottek dhape onno module-er data pore. Ekta step fail korle jey page-e atkeche seta likhe rakhun.

Route gulo apnar project-er `nav-config.ts` theke neya. Tab/button-er nam apnar UI-r upor, tai ami shudhu page-ta likhechi.

## Age-e ready rakhun
- Company, factory, building/floor/line, warehouse, user (merchandiser, store, cutting, QC, shipping, finance roles)
- Supplier 2 ta (fabric, trim), Material (fabric, thread, label, carton), Currency rate
- T&A template, defect master, AQL setting
- Demo data-r nam: Buyer `H&M Demo Buyer`, Style `POLO-1024`, Order qty 20,000

## Step by step
| # | Ki korben | Page | Ki dekhben (pass hole) |
|---|---|---|---|
| 1 | Buyer enquiry | `/enquiries` | Enquiry banano, status pore convert hoy |
| 2 | Style create | `/styles` | `POLO-1024` style, color/size set |
| 3 | Tech pack upload | `/styles` > POLO-1024 | Tech pack revision listed |
| 4 | Proto sample | `/samples` | Sample request banano, due date set |
| 5 | Fit sample approve | `/samples`, `/approvals` | Status APPROVED, approval history |
| 6 | Costing approve | `/costing` | Cost sheet approved, margin dekhay |
| 7 | Order confirm | `/orders` | Order CONFIRMED |
| 8 | Color-size matrix | `/orders` > Color / size tab | Matrix total = order qty (20,000), "Matrix ready" |
| 9 | T&A generate | `/tna` | Plan with milestones, dates |
| 10 | BOM approve | `/bom` | BOM approved |
| 11 | MRP | `/material-requirements` | Requirement lines, shortage dekhay |
| 12 | PR | `/prs` | PR created from MRP |
| 13 | Supplier quotation compare | `/rfqs`, `/quotations` | 2 supplier-er quote tulona |
| 14 | PO approve | `/purchase-orders`, `/approvals` | PO APPROVED |
| 15 | Fabric receive | `/goods-receipts` | GRN posted, stock barlo |
| 16 | Fabric roll inspect | `/fabric-rolls` | Rolls inspected, 4-point result |
| 17 | Cutting-e issue | `/material-issues` | Issue posted, stock komlo |
| 18 | Cut plan | `/cutting` | Cut plan for order |
| 19 | Bundle | `/cutting` | Bundles with QR/barcode, `/scan` e scan hoy |
| 20 | Sewing line assign | `/production-orders`, `/ppc` | Line allocated, capacity within limit |
| 21 | Hourly production | `/sewing` | Hourly output entered |
| 22 | WIP | `/wip` | Cutting/sewing/finishing WIP number milche |
| 23 | Inline QC | `/quality/inspections` | Defects recorded |
| 24 | Finishing | `/finishing` | Finished qty |
| 25 | Final AQL | `/quality/aql` | AQL result PASS |
| 26 | Carton pack | `/packing/cartons` | Cartons packed |
| 27 | Packing list | `/shipments` | Packing list generated |
| 28 | Shipment | `/shipments` | Shipment created, forwarder set |
| 29 | Commercial docs | `/commercial/documents` | Invoice/packing docs |
| 30 | Shipment close | `/shipments` | Status closed |
| 31 | Actual costing | `/finance/expenses`, `/finance/profitability` | Actual cost entered |
| 32 | Profitability | `/finance/profitability` | Order margin: planned vs actual |

## Cross-check (demo-r shesh-e)
- `/alerts`: kono shomoshya alert na thakle ba explain kora jay
- `/dashboard`: order shipped dekhay
- `/admin/audit-logs`: approval ar posting gulo log-e ache
- `/inventory`: material-er balance = received - issued - returned +/- adjustment
- `/ai` (jodi Step 11 chalu): order risk LOW

## Result
| Tarikh | Konkon step pass | Fail hoyeche | Notes |
|---|---|---|---|
| [FILL] | | | |
