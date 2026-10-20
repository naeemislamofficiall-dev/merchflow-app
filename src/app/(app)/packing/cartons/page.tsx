import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { packingService } from "@/services/packing.service";
import { CartonsTable, type CartonRow } from "./cartons-table";

const STATUSES = ["OPEN", "CLOSED", "SHIPPED"] as const;

export default async function CartonsPage(props: { searchParams: Promise<{ status?: string }> }) {
  const sp = await props.searchParams;
  const status = STATUSES.find((s) => s === sp.status);

  const list = await packingService.list(status ? { status } : {});

  const rows: CartonRow[] = list.map((c) => ({
    id: c.id,
    cartonNo: c.cartonNo,
    packType: c.packType.toLowerCase(),
    pieces: c.lines.reduce((s, l) => s + l.quantity, 0),
    grossWeight: c.grossWeightKg ? String(Number(c.grossWeightKg)) : "",
    status: c.status,
  }));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Cartons"
        description="Finished goods packed into cartons. Only closed cartons can go into a shipment"
        actions={
          <Link href="/packing/cartons/new" className={buttonVariants()}>
            New carton
          </Link>
        }
      />
      <form method="get" className="flex items-end gap-3">
        <div>
          <label htmlFor="status" className="mb-1 block text-sm font-medium">
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={status ?? ""}
            className="h-9 rounded-md border bg-background px-3 text-sm"
          >
            <option value="">All</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.toLowerCase()}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit">Filter</Button>
      </form>
      <CartonsTable rows={rows} />
    </div>
  );
}