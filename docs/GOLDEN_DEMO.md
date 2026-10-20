# Golden Demo Scenario — One Order End to End

Use a non-production company/factory and synthetic buyer data. Do not use real customer or supplier credentials.

1. Create buyer, supplier, material categories/materials, warehouse/bin, factory/line, currency and exchange-rate records.
2. Create style with colors/sizes, attach the tech pack, request a sample, record buyer decision, and approve style.
3. Create enquiry/costing/BOM, confirm the buyer order and check the color/size quantity matrix.
4. Record an order amendment and confirm the reason, amendment number, and previous-value snapshot are visible.
5. Run MRP, create/approve PR, RFQ and quotation comparison, create PO, register supplier PI, receive GRN and inspect fabric rolls/lots.
6. Verify inventory balances and traceability; issue materials to a production order, return unused material, and post a controlled cycle-count adjustment.
7. Plan cutting and lays, generate bundles, record sewing output, WIP, finishing/subcontract receipts, inspections, defects and CAPA.
8. Create cartons, verify carton/order quantity balance, create shipment, allocate cartons, register containers/forwarder, check document readiness, book/ship/deliver and confirm shipment balance.
9. Match supplier invoice/payment and buyer invoice/receipt; compare actual vs estimated cost and profitability.
10. Confirm audit events, notifications, permission denials, cross-company isolation, report totals and recovery from a failed transaction.

## Acceptance evidence to save

- Screen recording or screenshots of each major state transition.
- Database migration status and seed/test data instructions.
- Automated test report for key rules (no over-return, no negative stock unless explicitly allowed, no shipment over-allocation, amendment snapshot immutable, approval permission required, company/factory isolation).
- Build output from the exact commit/release artifact.

This is a test plan, not a statement that the whole scenario currently passes.
