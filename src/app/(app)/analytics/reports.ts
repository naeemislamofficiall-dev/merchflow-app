import { analyticsService as a } from "@/services/analytics.service";
import { qualityService } from "@/services/quality.service";
import { aqlService } from "@/services/aql.service";
import { wipService } from "@/services/wip.service";
import { profitabilityService } from "@/services/profitability.service";
import { round2 } from "@/lib/finance-calc";
import { ppcService } from "@/services/ppc.service";
export type Range = { from?: string; to?: string };
export type Column = { key: string; label: string; right?: boolean };
export type ReportResult = { columns: Column[]; rows: Record<string, unknown>[]; summary?: string };
export type ReportDef = {
  key: string;
  group: "Merchandising" | "Procurement" | "Inventory" | "Production" | "Quality" | "Shipment" | "Finance";
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
  // ---------- Quality ----------
  {
    key: "quality-summary", group: "Quality", title: "DHU, rework and reject summary", ranged: false,
    run: async () => {
      const s = await qualityService.summary();
      return {
        columns: [
          { key: "metric", label: "Metric" },
          { key: "value", label: "Value", right: true },
        ],
        rows: [
          { metric: "Inspections", value: s.inspections },
          { metric: "Pieces checked", value: s.checked },
          { metric: "Defective pieces", value: s.defectivePieces },
          { metric: "Total defects", value: s.defects },
          { metric: "DHU", value: s.dhu },
          { metric: "Repaired", value: s.repaired },
          { metric: "Rejected", value: s.rejected },
          { metric: "Open defects", value: s.openDefects },
          { metric: "Rework %", value: s.reworkPct },
        ],
      };
    },
  },
  {
    key: "aql-pass-rate", group: "Quality", title: "AQL pass rate", ranged: false,
    run: async () => {
      const p = await aqlService.passRate();
      return {
        columns: [
          { key: "metric", label: "Metric" },
          { key: "value", label: "Value", right: true },
        ],
        rows: [
          { metric: "Inspections", value: p.total },
          { metric: "Passed", value: p.passed },
          { metric: "Pass rate %", value: p.passRatePct },
        ],
      };
    },
  },

    {
    key: "defect-pareto", group: "Quality", title: "Defect Pareto", ranged: false,
    run: async () => ({
      columns: [
        { key: "name", label: "Defect" },
        { key: "count", label: "Count", right: true },
        { key: "pct", label: "%", right: true },
        { key: "cumulativePct", label: "Cumulative %", right: true },
      ],
      rows: (await qualityService.summary()).pareto,
    }),
  },

  // ---------- Production ----------
  {
    key: "wip", group: "Production", title: "WIP by production order", ranged: false,
    run: async () => ({
      columns: [
        { key: "productionNo", label: "Production" },
        { key: "orderNo", label: "Order" },
        { key: "styleNo", label: "Style" },
        { key: "status", label: "Status" },
        { key: "planned", label: "Planned", right: true },
        { key: "cut", label: "Cut", right: true },
        { key: "sewn", label: "Sewn", right: true },
        { key: "sewingReject", label: "Sewing reject", right: true },
        { key: "sewingRework", label: "Sewing rework", right: true },
        { key: "finished", label: "Finished", right: true },
        { key: "packed", label: "Packed", right: true },
        { key: "shipped", label: "Shipped", right: true },
      ],
      rows: await wipService.open(),
    }),
  },
  {
    key: "daily-production", group: "Production", title: "Daily production", ranged: true,
    run: async (r) => ({
      columns: [
        { key: "date", label: "Date" },
        { key: "target", label: "Target", right: true },
        { key: "output", label: "Output", right: true },
        { key: "reject", label: "Reject", right: true },
        { key: "rework", label: "Rework", right: true },
        { key: "downtimeMinutes", label: "Downtime (min)", right: true },
        { key: "efficiencyPct", label: "Efficiency %", right: true },
      ],
      rows: await a.dailyProductionReport(input(r)),
    }),
  },
  {
    key: "line-output", group: "Production", title: "Line output and efficiency", ranged: true,
    run: async (r) => ({
      columns: [
        { key: "line", label: "Line" },
        { key: "target", label: "Target", right: true },
        { key: "output", label: "Output", right: true },
        { key: "reject", label: "Reject", right: true },
        { key: "rework", label: "Rework", right: true },
        { key: "downtimeMinutes", label: "Downtime (min)", right: true },
        { key: "efficiencyPct", label: "Efficiency %", right: true },
      ],
      rows: await a.lineOutputReport(input(r)),
    }),
  },

    {
    key: "capacity-utilization", group: "Production", title: "Capacity utilization (by line, weekly)", ranged: true,
    run: async (r) => {
      const iso = (d: Date) => d.toISOString().slice(0, 10);
      const today = new Date();
      const from = r.from ?? iso(today);
      const to = r.to ?? iso(new Date(today.getTime() + 29 * 86_400_000));
      const opts = await ppcService.formOptions();
      const rows: Record<string, unknown>[] = [];
      for (const f of opts.factories) {
        const t = await ppcService.capacityTable({ factoryId: f.id, from, to, mode: "weekly" });
        for (const x of t.rows) {
          rows.push({
            factory: f.code,
            period: x.bucket,
            line: x.code,
            availableMinutes: x.availableMinutes,
            plannedMinutes: x.plannedMinutes,
            gapMinutes: x.gapMinutes,
            loadPct: x.loadPct,
            overloaded: x.overloaded ? "Yes" : "No",
          });
        }
      }
      return {
        columns: [
          { key: "factory", label: "Factory" },
          { key: "period", label: "Period" },
          { key: "line", label: "Line" },
          { key: "availableMinutes", label: "Available (min)", right: true },
          { key: "plannedMinutes", label: "Planned (min)", right: true },
          { key: "gapMinutes", label: "Gap (min)", right: true },
          { key: "loadPct", label: "Load %", right: true },
          { key: "overloaded", label: "Overloaded" },
        ],
        rows,
        summary: `Period: ${from} to ${to}`,
      };
    },
  },
  // ---------- Shipment ----------
  {
    key: "shipment-plan", group: "Shipment", title: "Shipment plan and on-time", ranged: true,
    run: async (r) => {
      const res = await a.shipmentPlanReport(input(r));
      return {
        columns: [
          { key: "shipmentNo", label: "Shipment" },
          { key: "buyer", label: "Buyer" },
          { key: "status", label: "Status" },
          { key: "mode", label: "Mode" },
          { key: "destination", label: "Destination" },
          { key: "plannedShipDate", label: "Planned ship" },
          { key: "exFactoryDate", label: "Ex-factory" },
          { key: "actualShipDate", label: "Actual ship" },
          { key: "delayDays", label: "Delay (days)", right: true },
          { key: "onTime", label: "On time?" },
        ],
        rows: res.rows,
        summary: `On-time shipment rate: ${res.onTimePct === null ? "-" : `${res.onTimePct}%`}`,
      };
    },
  },
  {
    key: "shipment-balance", group: "Shipment", title: "Shipment balance by order", ranged: false,
    run: async () => ({
      columns: [
        { key: "orderNo", label: "Order" },
        { key: "buyer", label: "Buyer" },
        { key: "status", label: "Status" },
        { key: "ordered", label: "Ordered", right: true },
        { key: "packedNotShipped", label: "Packed, not shipped", right: true },
        { key: "shipped", label: "Shipped", right: true },
        { key: "balance", label: "Balance", right: true },
      ],
      rows: await a.shipmentBalanceReport(),
    }),
  },
  {
    key: "costing", group: "Finance", title: "Costing summary", ranged: false,
    run: async () => ({
      columns: [
        { key: "style", label: "Style" },
        { key: "version", label: "Version", right: true },
        { key: "costType", label: "Type" },
        { key: "status", label: "Status" },
        { key: "currency", label: "Currency" },
        { key: "totalCost", label: "Total cost", right: true },
        { key: "quotedPrice", label: "Quoted price", right: true },
        { key: "marginPct", label: "Margin %", right: true },
      ],
      rows: await a.costingReport(),
    }),
  },
  // ---------- Finance ----------
  {
    key: "supplier-payable", group: "Finance", title: "Supplier payable", ranged: false,
    run: async () => {
      const res = await a.supplierPayableReport();
      return {
        columns: [
          { key: "supplier", label: "Supplier" },
          { key: "invoiceNo", label: "Invoice" },
          { key: "supplierInvoiceNo", label: "Supplier invoice" },
          { key: "dueDate", label: "Due" },
          { key: "currency", label: "Currency" },
          { key: "outstanding", label: "Outstanding", right: true },
          { key: "outstandingBase", label: "Outstanding (base)", right: true },
          { key: "overdueDays", label: "Overdue (days)", right: true },
        ],
        rows: res.rows,
        summary: `Total payable (base): ${new Intl.NumberFormat("en-US", { minimumFractionDigits: 2 }).format(res.totalBase)}`,
      };
    },
  },
  {
    key: "buyer-receivable", group: "Finance", title: "Buyer receivable", ranged: false,
    run: async () => {
      const res = await a.buyerReceivableReport();
      return {
        columns: [
          { key: "buyer", label: "Buyer" },
          { key: "invoiceNo", label: "Invoice" },
          { key: "dueDate", label: "Due" },
          { key: "currency", label: "Currency" },
          { key: "outstanding", label: "Outstanding", right: true },
          { key: "outstandingBase", label: "Outstanding (base)", right: true },
          { key: "overdueDays", label: "Overdue (days)", right: true },
        ],
        rows: res.rows,
        summary: `Total receivable (base): ${new Intl.NumberFormat("en-US", { minimumFractionDigits: 2 }).format(res.totalBase)}`,
      };
    },
  },
  {
    key: "order-profitability", group: "Finance", title: "Order profitability", ranged: false,
    run: async () => ({
      columns: [
        { key: "orderNo", label: "Order" },
        { key: "revenue", label: "Revenue (base)", right: true },
        { key: "cost", label: "Cost (base)", right: true },
        { key: "margin", label: "Margin (base)", right: true },
        { key: "marginPct", label: "Margin %", right: true },
      ],
      rows: (await profitabilityService.byBuyer()).orders.map((o) => ({
        orderNo: o.orderNo,
        revenue: round2(o.revenue),
        cost: round2(o.cost),
        margin: round2(o.revenue - o.cost),
        marginPct: o.revenue > 0 ? round2(((o.revenue - o.cost) / o.revenue) * 100) : null,
      })),
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