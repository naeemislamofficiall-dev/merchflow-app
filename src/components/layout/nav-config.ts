export type NavItem = { label: string; href: string; permission?: string; ready: boolean };
export type NavGroupData = { label: string; items: NavItem[] };

// নতুন পেজ বানালে শুধু ready: true করে দিন
export const NAV: NavGroupData[] = [
  {
    label: "Executive",
    items: [
      { label: "Dashboard", href: "/dashboard", permission: "dashboard.view", ready: true },
      { label: "Alerts", href: "/alerts", permission: "alert.view", ready: false },
      { label: "Analytics", href: "/analytics", permission: "analytics.view", ready: false },
    ],
  },
  {
    label: "Merchandising",
    items: [
      { label: "Buyers", href: "/buyers", permission: "buyer.view", ready: true },
      { label: "Enquiries", href: "/enquiries", permission: "enquiry.view", ready: false },
      { label: "Styles", href: "/styles", permission: "style.view", ready: true },
      { label: "Samples", href: "/samples", permission: "sample.view", ready: false },
      { label: "Orders", href: "/orders", permission: "order.view", ready: true },
      { label: "T&A", href: "/tna", permission: "tna.view", ready: false },
      { label: "Costing", href: "/costing", permission: "costing.view", ready: false },
      { label: "BOM", href: "/bom", permission: "bom.view", ready: false },
    ],
  },
  {
    label: "Procurement",
    items: [
      { label: "Material requirements", href: "/material-requirements", permission: "mrp.view", ready: false },
      { label: "PRs", href: "/prs", permission: "pr.view", ready: false },
      { label: "RFQs", href: "/rfqs", permission: "rfq.view", ready: false },
      { label: "Quotations", href: "/quotations", permission: "quotation.view", ready: false },
      { label: "Purchase orders", href: "/purchase-orders", permission: "po.view", ready: false },
      { label: "Suppliers", href: "/suppliers", permission: "supplier.view", ready: false },
    ],
  },
  {
    label: "Inventory",
    items: [
      { label: "Warehouses", href: "/warehouses", permission: "warehouse.view", ready: false },
      { label: "Stock", href: "/inventory", permission: "inventory.view", ready: false },
      { label: "Fabric rolls", href: "/fabric-rolls", permission: "inventory.view", ready: false },
      { label: "Goods receipts", href: "/goods-receipts", permission: "grn.view", ready: false },
      { label: "Material issues", href: "/material-issues", permission: "inventory.view", ready: false },
    ],
  },
  {
    label: "Production",
    items: [
      { label: "Production orders", href: "/production-orders", permission: "production.view", ready: false },
      { label: "Cutting", href: "/cutting", permission: "cutting.view", ready: false },
      { label: "Sewing", href: "/sewing", permission: "sewing.view", ready: false },
      { label: "WIP", href: "/wip", permission: "wip.view", ready: false },
      { label: "Finishing", href: "/finishing", permission: "finishing.view", ready: false },
      { label: "Subcontract", href: "/subcontract", permission: "subcontract.view", ready: false },
    ],
  },
  {
    label: "Quality",
    items: [
      { label: "Inspections", href: "/quality/inspections", permission: "qc.view", ready: false },
      { label: "Defects", href: "/quality/defects", permission: "qc.view", ready: false },
      { label: "AQL", href: "/quality/aql", permission: "aql.view", ready: false },
      { label: "CAPA", href: "/quality/capa", permission: "capa.view", ready: false },
    ],
  },
  {
    label: "Shipping",
    items: [
      { label: "Cartons", href: "/packing/cartons", permission: "packing.view", ready: false },
      { label: "Shipments", href: "/shipments", permission: "shipment.view", ready: false },
      { label: "Export documents", href: "/commercial/documents", permission: "commercial.view", ready: false },
    ],
  },
];