export type NavItem = { label: string; href: string; permission?: string; ready: boolean };
export type NavGroupData = { label: string; items: NavItem[] };

// নতুন পেজ বানালে শুধু ready: true করে দিন
export const NAV: NavGroupData[] = [
  {
    label: "Finance",
    items: [
      { label: "Payables", href: "/finance/payables", permission: "ap.view", ready: true },
      { label: "Receivables", href: "/finance/receivables", permission: "ar.view", ready: true },
      { label: "Expenses", href: "/finance/expenses", permission: "expense.view", ready: true },
      { label: "Profitability", href: "/finance/profitability", permission: "profitability.view", ready: true },
    ],
  },
  {
    label: "Executive",
    items: [
      { label: "Dashboard", href: "/dashboard", permission: "dashboard.view", ready: true },
      { label: "Alerts", href: "/alerts", permission: "alert.view", ready: true },
      { label: "Analytics", href: "/analytics", permission: "analytics.view", ready: true },
      { label: "Approvals", href: "/approvals", ready: true },
      { label: "Notifications", href: "/notifications", ready: true },
    ],
  },
  {
    label: "Merchandising",
    items: [
      { label: "Buyers", href: "/buyers", permission: "buyer.view", ready: true },
      { label: "Enquiries", href: "/enquiries", permission: "enquiry.view", ready: true },
      { label: "Styles", href: "/styles", permission: "style.view", ready: true },
      { label: "Samples", href: "/samples", permission: "sample.view", ready: true },
      { label: "Orders", href: "/orders", permission: "order.view", ready: true },
      { label: "Order amendments", href: "/orders/amendments", permission: "order.view", ready: true },
      { label: "T&A", href: "/tna", permission: "tna.view", ready: true },
      { label: "Costing", href: "/costing", permission: "costing.view", ready: true },
      { label: "BOM", href: "/bom", permission: "bom.view", ready: true },
    ],
  },
  {
    label: "Procurement",
    items: [
      { label: "Material requirements", href: "/material-requirements", permission: "mrp.view", ready: true },
      { label: "PRs", href: "/prs", permission: "pr.view", ready: true },
      { label: "RFQs", href: "/rfqs", permission: "rfq.view", ready: true },
      { label: "Quotations", href: "/quotations", permission: "quotation.view", ready: true },
      { label: "Purchase orders", href: "/purchase-orders", permission: "po.view", ready: true },
      { label: "Supplier proforma invoices", href: "/purchase-orders/proforma-invoices", permission: "po.view", ready: true },
      { label: "Follow-ups", href: "/follow-ups", permission: "followup.view", ready: true },
      { label: "Suppliers", href: "/suppliers", permission: "supplier.view", ready: true },
      { label: "Materials", href: "/materials", permission: "material.view", ready: true },
    ],
  },
  {
    label: "Inventory",
    items: [
      { label: "Warehouses", href: "/warehouses", permission: "warehouse.view", ready: true },
      { label: "Stock", href: "/inventory", permission: "inventory.view", ready: true },
      { label: "Stock adjustments", href: "/inventory/adjustments", permission: "inventory.view", ready: true },
      { label: "Material returns", href: "/material-returns", permission: "inventory.view", ready: true },
      { label: "Fabric rolls", href: "/fabric-rolls", permission: "inventory.view", ready: true },
      { label: "Goods receipts", href: "/goods-receipts", permission: "grn.view", ready: true },
      { label: "Material issues", href: "/material-issues", permission: "inventory.view", ready: true },
      { label: "Scan", href: "/scan", permission: "scan.use", ready: true },
    ],
  },
  {
    label: "Production",
    items: [
      { label: "Production orders", href: "/production-orders", permission: "production.view", ready: true },
      { label: "Cutting", href: "/cutting", permission: "cutting.view", ready: true },
      { label: "Sewing", href: "/sewing", permission: "sewing.view", ready: true },
      { label: "WIP", href: "/wip", permission: "wip.view", ready: true },
      { label: "Finishing", href: "/finishing", permission: "finishing.view", ready: true },
      { label: "Subcontract", href: "/subcontract", permission: "subcontract.view", ready: true },
      { label: "Industrial engineering", href: "/ie", permission: "ie.view", ready: true },
    ],
  },
  {
    label: "Quality",
    items: [
      { label: "Inspections", href: "/quality/inspections", permission: "qc.view", ready: true },
      { label: "Defects", href: "/quality/defects", permission: "qc.view", ready: true },
      { label: "AQL", href: "/quality/aql", permission: "aql.view", ready: true },
      { label: "CAPA", href: "/quality/capa", permission: "capa.view", ready: true },
    ],
  },
  {
    label: "Shipping",
    items: [
      { label: "Cartons", href: "/packing/cartons", permission: "packing.view", ready: true },
      { label: "Shipments", href: "/shipments", permission: "shipment.view", ready: true },
      { label: "Forwarders", href: "/shipments/forwarders", permission: "shipment.view", ready: true },
      { label: "Export documents", href: "/commercial/documents", permission: "commercial.view", ready: true },
    ],
  },
  {
    label: "Admin",
    items: [
      { label: "Users", href: "/admin/users", permission: "user.view", ready: true },
      { label: "Roles", href: "/admin/roles", permission: "role.view", ready: true },
      { label: "Audit log", href: "/admin/audit-logs", permission: "audit.view", ready: true },
    ],
  },
  {
    label: "Settings",
    items: [
      { label: "Organization", href: "/organization", permission: "organization.view", ready: true },
      { label: "Documents", href: "/documents", permission: "document.view", ready: true },
    ],
  },
];