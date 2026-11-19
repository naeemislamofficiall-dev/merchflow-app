import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { can, requireUser } from "@/lib/permissions";
import { listFilter } from "@/lib/service-helpers";
import { EnquiriesView, type EnquiryRow } from "@/components/enquiries/enquiries-view";

type Rec = Record<string, unknown>;

// field-er naam ami dekhi ni, tai ekadhik sombhabyo naam theke prothom ta nei
const str = (r: Rec, keys: string[]) => {
  for (const k of keys) {
    const v = r[k];
    if (typeof v === "string" && v) return v;
  }
  return null;
};
const num = (r: Rec, keys: string[]) => {
  for (const k of keys) {
    const v = r[k];
    if (v === null || v === undefined || v === "") continue;
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
};
const ymd = (r: Rec, keys: string[]) => {
  for (const k of keys) {
    const v = r[k];
    if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString().slice(0, 10);
    if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  }
  return null;
};

const NO_KEYS = ["enquiryNo", "enquiryNumber", "number", "code", "reference", "refNo"];
const SHIP_KEYS = ["requiredShipDate", "requiredShip", "shipDate", "requiredDate", "targetShipDate", "deliveryDate"];
const QTY_KEYS = ["quantity", "qty", "totalQty", "units", "targetQty"];
const PRICE_KEYS = ["targetPrice", "unitPrice", "price", "targetRate", "rate"];
const VALUE_KEYS = ["targetValue", "targetAmount", "totalValue", "totalAmount"];

export default async function EnquiriesPage() {
  const user = await requireUser();
  if (!can(user, "enquiry.view")) {
    return <p className="text-muted-foreground">You do not have access to enquiries.</p>;
  }

  const scope = await listFilter(user);
  const enquiries = await prisma.enquiry.findMany({
    where: { ...scope },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  const ids = enquiries.map((e) => e.id);
  const buyerIds = [
    ...new Set(enquiries.map((e) => str(e as unknown as Rec, ["buyerId"])).filter((x): x is string => !!x)),
  ];

  const [items, buyers] = await Promise.all([
    ids.length ? prisma.enquiryItem.findMany({ where: { enquiryId: { in: ids } } }) : Promise.resolve([]),
    buyerIds.length
      ? prisma.buyer.findMany({ where: { id: { in: buyerIds } }, select: { id: true, name: true } })
      : Promise.resolve([]),
  ]);

  const byEnquiry = new Map<string, Rec[]>();
  for (const it of items) {
    const r = it as unknown as Rec;
    const k = str(r, ["enquiryId"]);
    if (!k) continue;
    byEnquiry.set(k, [...(byEnquiry.get(k) ?? []), r]);
  }

  const rows: EnquiryRow[] = enquiries.map((e) => {
    const raw = e as unknown as Rec;
    const its = byEnquiry.get(e.id) ?? [];
    const units = its.reduce((s, r) => s + (num(r, QTY_KEYS) ?? 0), 0);
    const computed = its.reduce((s, r) => {
      const q = num(r, QTY_KEYS);
      const p = num(r, PRICE_KEYS);
      return q !== null && p !== null ? s + q * p : s;
    }, 0);
    const own = num(raw, VALUE_KEYS);
    const buyerId = str(raw, ["buyerId"]);
    return {
      id: e.id,
      no: str(raw, NO_KEYS) ?? e.id.slice(-8).toUpperCase(),
      buyer: buyers.find((b) => b.id === buyerId)?.name ?? "-",
      items: its.length,
      units,
      target: own ?? (computed > 0 ? computed : null),
      currency: str(raw, ["currency"]) ?? "USD",
      required: ymd(raw, SHIP_KEYS),
      status: str(raw, ["status"]) ?? "NEW",
    };
  });

  const todayKey = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" });
  const canCreate = can(user, "enquiry.create");

  return (
    <div className="stagger space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-semibold text-navy-800">Enquiries</h1>
          <p className="text-sm text-slate-600">Buyer enquiries from first request to a confirmed order</p>
        </div>
        {canCreate && (
          <Link
            href="/enquiries/new"
            className="inline-flex h-12 items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-md shadow-blue-700/25 transition-transform hover:-translate-y-0.5"
          >
            <Plus className="h-4.5 w-4.5" strokeWidth={2.5} /> New Enquiry
          </Link>
        )}
      </header>

      <EnquiriesView rows={rows} canCreate={canCreate} todayKey={todayKey} />
    </div>
  );
}