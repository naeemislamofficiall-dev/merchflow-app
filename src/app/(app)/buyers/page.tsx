import Link from "next/link";
import { Handshake, Pause, Plus, ShoppingBag, ShoppingCart, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { can, requireUser } from "@/lib/permissions";
import { PageBand, StatCard } from "@/components/approvals/ui";
import { statusKind } from "@/components/buyers/status";
import { BuyersView, type BuyerRow } from "@/components/buyers/buyers-view";

export default async function BuyersPage() {
  const user = await requireUser();
  if (!can(user, "buyer.view")) return <p className="text-muted-foreground">You do not have access to buyers.</p>;

  const [buyers, open] = await Promise.all([
    prisma.buyer.findMany({ where: { companyId: user.companyId }, orderBy: { name: "asc" } }),
    prisma.order.groupBy({
      by: ["buyerId"],
      where: { companyId: user.companyId, status: { in: ["CONFIRMED", "IN_PRODUCTION", "PARTIALLY_SHIPPED"] } },
      _count: { _all: true },
    }),
  ]);

  const rows: BuyerRow[] = buyers.map((b) => {
    // status field-er naam ami dekhi ni: "status" ba "isActive", kono ta na pele Active dhori
    const raw = b as unknown as Record<string, unknown>;
    const status = typeof raw.status === "string" ? raw.status : raw.isActive === false ? "INACTIVE" : "ACTIVE";
    return {
      id: b.id,
      code: b.code,
      name: b.name,
      country: b.country ?? null,
      currency: b.currency,
      paymentTerms: b.paymentTerms ?? null,
      status,
    };
  });

  const total = rows.length;
  const active = rows.filter((r) => statusKind(r.status) === "active").length;
  const countries = new Set(rows.map((r) => r.country).filter(Boolean)).size;
  const withOpen = open.length;
  const openOrders = open.reduce((s, o) => s + o._count._all, 0);
  const canCreate = can(user, "buyer.create");

  return (
    <div className="stagger space-y-5">
      <PageBand>
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex h-18 w-18 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-blue-100 to-blue-200 text-blue-600 shadow-lg shadow-blue-200/60 ring-1 ring-white">
              <Users className="h-9 w-9" strokeWidth={2.2} />
            </span>
            <div>
              <h1 className="font-heading text-3xl font-semibold text-navy-800">Buyers</h1>
              <p className="text-sm text-slate-600">Manage your buyers and track their information</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
           
            {canCreate && (
              <Link
                href="/buyers/new"
                className="inline-flex h-12 items-center gap-2.5 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white shadow-md shadow-blue-700/25 transition-transform hover:-translate-y-0.5"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-white/90">
                  <Plus className="h-3 w-3" strokeWidth={3.5} />
                </span>
                Add Buyer
              </Link>
            )}
          </div>
        </header>
      </PageBand>

      <div className="stagger grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-4">
        <StatCard
          big
          theme="blue"
          icon={Handshake}
          label="Total Buyers"
          value={String(total)}
          sub={countries > 0 ? `${countries} countr${countries === 1 ? "y" : "ies"}` : "No country set"}
        />
        <StatCard big theme="green" icon={ShoppingCart} label="Active Buyers" value={String(active)} sub="Ready for new orders" />
        <StatCard
          big
          theme="orange"
          icon={Pause}
          label="Not Active"
          value={String(total - active)}
          sub="On hold or inactive"
        />
        <StatCard
          big
          theme="violet"
          icon={ShoppingBag}
          label="With Open Orders"
          value={String(withOpen)}
          sub={`${openOrders} open order${openOrders === 1 ? "" : "s"}`}
        />
      </div>

      <BuyersView rows={rows} canCreate={canCreate} />
    </div>
  );
}