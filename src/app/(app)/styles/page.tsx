import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { can, requireUser } from "@/lib/permissions";
import { StylesView, type StyleRow } from "@/components/styles/styles-view";

// category field-er naam ami dekhi ni, tai ekadhik sombhabyo naam theke prothom ta nei
const category = (r: Record<string, unknown>) => {
  for (const k of ["category", "garmentCategory", "productCategory", "productType"]) {
    const v = r[k];
    if (typeof v === "string" && v.trim()) return v;
  }
  return null;
};

function ShirtArt() {
  return (
    <svg viewBox="0 0 32 32" className="h-9 w-9" aria-hidden="true">
      <path d="M11 4 L3 9 L6 14 L9 12.5 V28 H23 V12.5 L26 14 L29 9 L21 4 Q16 8 11 4 Z" fill="#2563eb" />
    </svg>
  );
}

export default async function StylesPage() {
  const user = await requireUser();
  if (!can(user, "style.view")) return <p className="text-muted-foreground">You do not have access to styles.</p>;

  const styles = await prisma.style.findMany({
    where: { companyId: user.companyId },
    orderBy: { createdAt: "desc" },
    take: 1000,
  });

  const buyerIds = [...new Set(styles.map((s) => s.buyerId))];
  const seasonIds = [...new Set(styles.map((s) => s.seasonId).filter((x): x is string => !!x))];

  const [buyers, seasons] = await Promise.all([
    buyerIds.length
      ? prisma.buyer.findMany({ where: { id: { in: buyerIds } }, select: { id: true, name: true } })
      : Promise.resolve([]),
    seasonIds.length
      ? prisma.season.findMany({ where: { id: { in: seasonIds } }, select: { id: true, code: true } })
      : Promise.resolve([]),
  ]);

  const rows: StyleRow[] = styles.map((s) => ({
    id: s.id,
    styleNo: s.styleNo,
    name: s.name,
    buyer: buyers.find((b) => b.id === s.buyerId)?.name ?? null,
    category: category(s as unknown as Record<string, unknown>),
    season: seasons.find((x) => x.id === s.seasonId)?.code ?? null,
    status: String(s.status),
  }));

  const canCreate = can(user, "style.create");

  return (
    <div className="stagger space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-blue-100 shadow-card">
            <ShirtArt />
          </span>
          <div>
            <h1 className="font-heading text-3xl font-semibold text-navy-800">Styles</h1>
            <p className="text-sm text-slate-600">Technical identity of every garment</p>
          </div>
        </div>
        {canCreate && (
          <Link
            href="/styles/new"
            className="inline-flex h-12 items-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white shadow-md shadow-blue-700/25 transition-transform hover:-translate-y-0.5"
          >
            <Plus className="h-4.5 w-4.5" strokeWidth={2.5} /> New Style
          </Link>
        )}
      </header>

      <StylesView rows={rows} canCreate={canCreate} />
    </div>
  );
}