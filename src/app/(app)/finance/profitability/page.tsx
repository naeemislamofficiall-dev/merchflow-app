import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { getBaseCurrency } from "@/services/currency.service";
import { profitabilityService } from "@/services/profitability.service";
import { isRangeKey, profitabilityReportService } from "@/services/profitability-report.service";
import { PageBand } from "@/components/approvals/ui";
import { DonutChart, EmptyState, Panel } from "@/components/dashboard/widgets";
import { ExportMenu, RangeSelect } from "@/components/profitability/controls";
import { PALETTE, fmt2, marginPill } from "@/components/profitability/format";
import {
  BarsArt, ChartArt, CoinsArt, MoneyBagArt, PercentArt, ProfitTile, TrendChart, type Delta,
} from "@/components/profitability/parts";
import { BuyerSection, OrderSection } from "@/components/profitability/tables";
import type { RangeKey } from "@/components/profitability/types";

const SYM: Record<string, string> = { USD: "$", EUR: "€", GBP: "£", BDT: "৳" };

function delta(cur: number, prev: number | undefined, o?: { pts?: boolean; invert?: boolean }): Delta {
  if (prev === undefined) return null;
  if (o?.pts) {
    const d = Math.round((cur - prev) * 10) / 10;
    return { text: `${Math.abs(d).toFixed(1)} pts`, up: d >= 0, good: d >= 0 };
  }
  if (prev === 0) return null;
  const r = Math.round(((cur - prev) / Math.abs(prev)) * 1000) / 10;
  const up = r >= 0;
  return { text: `${Math.abs(r).toFixed(1)}%`, up, good: o?.invert ? !up : up };
}

// order-er style-wise margin (order-er shob posted invoice, date range-er bahire-o dhore)
async function loadStyles(orderId: string) {
  try {
    const [d, order] = await Promise.all([
      profitabilityService.byOrder(orderId),
      prisma.order.findUnique({ where: { id: orderId }, select: { orderNo: true } }),
    ]);
    const ids = d.styles.map((s) => s.styleId).filter((x): x is string => !!x);
    const styles = ids.length
      ? await prisma.style.findMany({ where: { id: { in: ids } }, select: { id: true, styleNo: true, name: true } })
      : [];
    const rows = d.styles.map((s) => {
      const st = styles.find((x) => x.id === s.styleId);
      const revenue = Number(s.revenue);
      const cost = Number(s.cost);
      const margin = revenue - cost;
      return {
        key: s.styleId ?? "_none",
        label: st ? `${st.styleNo} ${st.name}` : "Unassigned",
        revenue,
        cost,
        margin,
        marginPct: revenue > 0 ? Math.round((margin / revenue) * 1000) / 10 : 0,
      };
    });
    return { orderNo: order?.orderNo ?? "Order", rows };
  } catch {
    return null;
  }
}

export default async function ProfitabilityPage(props: {
  searchParams: Promise<{ range?: string; order?: string }>;
}) {
  const user = await requireUser();
  const sp = await props.searchParams;
  const range: RangeKey = isRangeKey(sp.range) ? sp.range : "all";

  const report = await profitabilityReportService.report(range).catch(() => null); // profitability.view na thakle null
  if (!report) return <p className="text-muted-foreground">You do not have access to profitability.</p>;

  const [base, detail] = await Promise.all([
    getBaseCurrency(user.companyId),
    sp.order ? loadStyles(sp.order) : Promise.resolve(null),
  ]);

  const { totals, prev } = report;
  const sym = SYM[base] ?? base;
  const donutBuyers = [...report.buyers].sort((a, b) => b.margin - a.margin);
  const prevLabel = "vs previous period";

  return (
    <div className="stagger space-y-5">
      <PageBand>
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <ChartArt />
            <div>
              <h1 className="font-heading text-3xl font-semibold text-navy-800">Profitability</h1>
              <p className="text-sm text-slate-600">
                Revenue from posted buyer invoices minus cost from approved invoices and expenses ({base}).
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <RangeSelect current={range} label={report.label} />
            <ExportMenu buyers={report.buyers} orders={report.orders} rangeKey={range} />
          </div>
        </header>
      </PageBand>

      <div className="stagger grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4">
        <ProfitTile
          theme="blue"
          art={<MoneyBagArt symbol={sym} />}
          label="Total Revenue"
          value={fmt2.format(totals.revenue)}
          delta={delta(totals.revenue, prev?.revenue)}
          deltaLabel={prevLabel}
        />
        <ProfitTile
          theme="green"
          art={<CoinsArt />}
          label="Total Cost"
          value={fmt2.format(totals.cost)}
          delta={delta(totals.cost, prev?.cost, { invert: true })}
          deltaLabel={prevLabel}
        />
        <ProfitTile
          theme="violet"
          art={<BarsArt />}
          label="Total Margin"
          value={fmt2.format(totals.margin)}
          delta={delta(totals.margin, prev?.margin)}
          deltaLabel={prevLabel}
        />
        <ProfitTile
          theme="teal"
          art={<PercentArt />}
          label="Margin %"
          value={`${totals.marginPct.toFixed(2)}%`}
          delta={delta(totals.marginPct, prev?.marginPct, { pts: true })}
          deltaLabel={prevLabel}
        />
      </div>

      <div className="stagger grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <BuyerSection buyers={report.buyers} />
        <Panel title="Margin by Buyer" subtitle="Share of total margin">
          {donutBuyers.length === 0 ? (
            <EmptyState>No invoiced orders in this period</EmptyState>
          ) : (
            <div className="flex flex-col items-center gap-5">
              <DonutChart
                size={190}
                valueSize={26}
                labelSize={13}
                data={donutBuyers.map((b, i) => ({
                  label: b.name,
                  value: Math.max(b.margin, 0),
                  color: PALETTE[i % PALETTE.length],
                }))}
                centerValue={`${totals.marginPct.toFixed(2)}%`}
                centerLabel="Overall Margin"
              />
              <ul className="w-full space-y-2.5 text-sm">
                {donutBuyers.map((b, i) => (
                  <li key={b.buyerId} className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2.5 text-navy-800">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PALETTE[i % PALETTE.length] }} />
                      {b.name}
                    </span>
                    <span className="font-semibold text-navy-800">{b.marginPct.toFixed(1)}%</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Panel>
      </div>

      <div className="stagger grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <OrderSection orders={report.orders} rangeKey={range} selectedId={sp.order ?? null} />
        <Panel title="Profit Trend" subtitle="Margin per month, last 6 months">
          <TrendChart points={report.trend} />
        </Panel>
      </div>

      {detail && (
        <div id="styles" className="scroll-mt-20">
          <Panel
            title={`Margin by style: ${detail.orderNo}`}
            subtitle="All posted invoices of this order (not limited to the date range)"
            aside={
              <Link
                href={range === "all" ? "/finance/profitability" : `/finance/profitability?range=${range}`}
                className="text-xs font-semibold text-blue-600 hover:underline"
              >
                Close
              </Link>
            }
          >
            {detail.rows.length === 0 ? (
              <EmptyState>No invoiced styles for this order</EmptyState>
            ) : (
              <div className="overflow-x-auto rounded-xl">
                <table className="w-full min-w-560px text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-[13px] font-semibold text-navy-800">
                      <th className="rounded-l-lg px-4 py-3 text-left">Style</th>
                      <th className="px-4 py-3 text-right">Revenue</th>
                      <th className="px-4 py-3 text-right">Cost</th>
                      <th className="px-4 py-3 text-right">Margin</th>
                      <th className="rounded-r-lg px-4 py-3 text-right">Margin %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.rows.map((r) => (
                      <tr key={r.key} className="border-b border-slate-100 last:border-0">
                        <td className="px-4 py-3 font-semibold text-navy-800">{r.label}</td>
                        <td className="px-4 py-3 text-right">{fmt2.format(r.revenue)}</td>
                        <td className="px-4 py-3 text-right">{fmt2.format(r.cost)}</td>
                        <td className="px-4 py-3 text-right">{fmt2.format(r.margin)}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${marginPill(r.marginPct)}`}>
                            {r.marginPct.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>
      )}
    </div>
  );
}