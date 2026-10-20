import { analyticsService as a } from "@/services/analytics.service";

export type Range = { from?: string; to?: string };
export type Column = { key: string; label: string; right?: boolean };
export type ReportResult = { columns: Column[]; rows: Record<string, unknown>[]; summary?: string };
export type ReportDef = {
  key: string;
  group: "Merchandising" | "Procurement" | "Inventory";
  title: string;
  ranged: boolean; // তারিখ-ফিল্টার চলে কিনা
  run: (r: Range) => Promise<ReportResult>;
};

const input = (r: Range) => ({
  ...(r.from ? { from: r.from } : {}),
  ...(r.to ? { to: `${r.to}T23:59:59` } : {}),
});

const flat = (o: Record<string, number>) =>
  Object.entries(o)
    .map(([k, v]) => `${k.toLowerCase().replace(/_/g, " ")}: ${v}`)
    .join(", ");

export const REPORTS: ReportDef[] = [
  // ---------- Merchandising ----------
  {
    key: "buyer-orders", group: "Merchandising", title: "Buyer order report", ranged: true,
    run: async (r) => ({
      columns: [
        { key: "buyer", label: "Buyer" },
        { key: "orders", label: "Orders", right: true },
        { key: "units", label: "Units", right: true },
        { key: "value", label: "Value (base)", right: true },
        { key: "byStatus", label: "By status" },
      ],
      rows: (await a.buyerOrderReport(input(r))).map((x) => ({ ...x, byStatus: flat(x.byStatus) })),
    }),
  },
  {
    key: "style-status", group: "Merchandising", title: "Style status", ranged: false,
    run: async () => ({
      columns: [
        { key: "status", label: "Status" },
        { key: "count", label: "Styles", right: true },
      ],
      rows: await a.styleStatusReport(),
    }),
  },
  {
    key: "tna", group: "Merchandising", title: "T&A report", ranged: false,
    run: async () => ({
      columns: [
        { key: "style", label: "Style" },
        { key: "order", label: "Order" },
        { key: "shipDate", label: "Ship date" },
        { key: "tasks", label: "Tasks", right: true },
        { key: "byStatus", label: "By status" },
        { key: "maxDelayDays", label: "Max delay (days)", right: true },
      ],
      rows: (await a.tnaReport()).map((x) => ({ ...x, byStatus: flat(x.byStatus) })),
    }),
  },
  {
    key: "sample-approval", group: "Merchandising", title: "Sample approval report", ranged: true,
    run: async (r) => {
      const res = await a.sampleApprovalReport(input(r));
      return {
        columns: [
          { key: "sampleNo", label: "Sample" },
          { key: "style", label: "Style" },
          { key: "type", label: "Type" },
          { key: "status", label: "Status" },
          { key: "rounds", label: "Rounds", right: true },
          { key: "revisionCount", label: "Revisions", right: true },
          { key: "daysToDecision", label: "Days to decision", right: true },
          { key: "firstTimeApproved", label: "First time" },
        ],
        rows: res.rows,
        summary: `First-time approval rate: ${res.firstTimeApprovalPct === null ? "-" : `${res.firstTimeApprovalPct}%`}`,
      };
    },
  },
  {
    key: "order-amendments", group: "Merchandising", title: "Order amendment report", ranged: true,
    run: async (r) => ({
      columns: [
        { key: "orderNo", label: "Order" },
        { key: "buyer", label: "Buyer" },
        { key: "amendmentNo", label: "Amendment", right: true },
        { key: "reason", label: "Reason" },
        { key: "previousValues", label: "Previous values" },
        { key: "createdAt", label: "Date" },
      ],
      rows: (await a.orderAmendmentReport(input(r))).map((x) => ({
        ...x,
        previousValues: x.previousValues === null ? null : JSON.stringify(x.previousValues),
      })),
    }),
  },

  // ---------- Procurement ----------
  {
    key: "supplier-purchase", group: "Procurement", title: "Supplier purchase report", ranged: true,
    run: async (r) => ({
      columns: [
        { key: "supplier", label: "Supplier" },
        { key: "pos", label: "POs", right: true },
        { key: "total", label: "Total (base)", right: true },
      ],
      rows: await a.supplierPurchaseReport(input(r)),
    }),
  },
  {
    key: "supplier-delay", group: "Procurement", title: "Supplier delay", ranged: false,
    run: async () => ({
      columns: [
        { key: "supplier", label: "Supplier" },
        { key: "followUps", label: "Follow-ups", right: true },
        { key: "delayed", label: "Delayed", right: true },
        { key: "avgDelayDays", label: "Avg delay (days)", right: true },
      ],
      rows: await a.supplierDelayReport(),
    }),
  },
  {
    key: "purchase-spend", group: "Procurement", title: "Purchase spend by month", ranged: true,
    run: async (r) => ({
      columns: [
        { key: "month", label: "Month" },
        { key: "spend", label: "Spend (base)", right: true },
      ],
      rows: await a.purchaseSpendReport(input(r)),
    }),
  },
  {
    key: "open-po", group: "Procurement", title: "Open POs", ranged: false,
    run: async () => ({
      columns: [
        { key: "poNo", label: "PO" },
        { key: "supplier", label: "Supplier" },
        { key: "status", label: "Status" },
        { key: "deliveryDate", label: "Delivery" },
        { key: "orderedValue", label: "Ordered (base)", right: true },
        { key: "remainingValue", label: "Remaining (base)", right: true },
        { key: "receivedPct", label: "Received %", right: true },
      ],
      rows: await a.openPoReport(),
    }),
  },

  // ---------- Inventory ----------
  {
    key: "stock-aging", group: "Inventory", title: "Stock aging (by lot)", ranged: false,
    run: async () => ({
      columns: [
        { key: "lotNo", label: "Lot" },
        { key: "material", label: "Material" },
        { key: "onHand", label: "On hand", right: true },
        { key: "unit", label: "Unit" },
        { key: "ageDays", label: "Age (days)", right: true },
        { key: "bucket", label: "Bucket" },
      ],
      rows: await a.stockAging(),
    }),
  },
  {
    key: "roll-stock", group: "Inventory", title: "Roll stock", ranged: false,
    run: async () => ({
      columns: [
        { key: "rollNo", label: "Roll" },
        { key: "material", label: "Material" },
        { key: "lotNo", label: "Lot" },
        { key: "color", label: "Color" },
        { key: "inspection", label: "Inspection" },
        { key: "onHand", label: "On hand", right: true },
      ],
      rows: await a.rollStock(),
    }),
  },
  {
    key: "slow-moving", group: "Inventory", title: "Slow moving (90+ days)", ranged: false,
    run: async () => ({
      columns: [
        { key: "code", label: "Code" },
        { key: "name", label: "Material" },
        { key: "onHand", label: "On hand", right: true },
        { key: "unit", label: "Unit" },
        { key: "lastIssueAt", label: "Last issue" },
        { key: "daysSinceIssue", label: "Days since issue", right: true },
      ],
      rows: await a.slowMoving(90),
    }),
  },
  {
    key: "stock-valuation", group: "Inventory", title: "Stock valuation", ranged: false,
    run: async () => {
      const res = await a.stockValuation();
      return {
        columns: [
          { key: "code", label: "Code" },
          { key: "name", label: "Material" },
          { key: "onHand", label: "On hand", right: true },
          { key: "unit", label: "Unit" },
          { key: "avgCost", label: "Avg cost", right: true },
          { key: "value", label: "Value (base)", right: true },
          { key: "hasCost", label: "Has cost" },
        ],
        rows: res.rows,
        summary: `Total value: ${new Intl.NumberFormat("en-US", { minimumFractionDigits: 2 }).format(res.totalValue)}`,
      };
    },
  },
];