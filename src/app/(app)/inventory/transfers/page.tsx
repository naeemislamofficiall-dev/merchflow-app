import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { prisma } from "@/lib/prisma";
import { can, requireUser } from "@/lib/permissions";
import { materialService } from "@/services/material.service";
import { warehouseService } from "@/services/warehouse.service";
import { createStockTransferAction } from "./actions";

const input = "rounded-md border bg-background px-3 py-2";

export default async function StockTransfersPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const user = await requireUser();
  if (!can(user, "inventory.view")) redirect("/dashboard");
  const canTransfer = can(user, "inventory.transfer");

  const [materials, warehouses, outs, params] = await Promise.all([
    materialService.list({ activeOnly: true }),
    warehouseService.listAll(),
    prisma.stockTransaction.findMany({
      where: { companyId: user.companyId, refType: "TRANSFER", type: "TRANSFER_OUT" },
      include: {
        material: { select: { code: true, name: true, unit: true } },
        warehouse: { select: { code: true } },
        roll: { select: { rollNo: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    searchParams,
  ]);

  // Prottek transfer-e duto entry: OUT (source) ar IN (destination). Destination IN theke ana hoy.
  const ins = await prisma.stockTransaction.findMany({
    where: {
      companyId: user.companyId,
      refType: "TRANSFER",
      type: "TRANSFER_IN",
      refId: { in: outs.map((o) => o.refId).filter((x): x is string => !!x) },
    },
    include: { warehouse: { select: { code: true } } },
  });
  const toByRef = new Map(ins.map((i) => [i.refId, i.warehouse.code]));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Stock transfers"
        description="Move material between warehouses or bins. Source stock is checked and both ledger entries are posted together."
      />

      {params.saved === "1" && (
        <p className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800">
          Transfer posted.
        </p>
      )}
      {params.error && (
        <p className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">{params.error}</p>
      )}

      {canTransfer && (
        <section className="rounded-xl border p-4">
          <h2 className="mb-3 font-semibold">New transfer</h2>
          <form action={createStockTransferAction} className="grid gap-3 md:grid-cols-3">
            <label className="grid gap-1 text-sm md:col-span-3">
              Material
              <select required name="materialId" className={input}>
                <option value="">Select material</option>
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>{m.code} · {m.name}</option>
                ))}
              </select>
            </label>

            <label className="grid gap-1 text-sm">
              From warehouse
              <select required name="fromWarehouseId" className={input}>
                <option value="">Select source</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>{w.code} · {w.name}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              To warehouse
              <select required name="toWarehouseId" className={input}>
                <option value="">Select destination</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>{w.code} · {w.name}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              Quantity
              <input type="number" step="0.0001" min="0" name="quantity" className={input} placeholder="e.g. 150" />
            </label>

            <label className="grid gap-1 text-sm">
              Roll no. (optional)
              <input name="rollNo" className={input} placeholder="FAB-LOT22-R0047" />
              <span className="text-xs text-muted-foreground">Roll dile puro roll jabe, quantity lagbe na.</span>
            </label>
            <label className="grid gap-1 text-sm">
              From bin ID (optional)
              <input name="fromBinId" className={input} />
            </label>
            <label className="grid gap-1 text-sm">
              To bin ID (optional)
              <input name="toBinId" className={input} />
            </label>

            <label className="grid gap-1 text-sm md:col-span-3">
              Remarks
              <input name="remarks" maxLength={300} className={input} placeholder="Why is this being moved?" />
            </label>
            <div className="md:col-span-3">
              <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
                Post transfer
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="font-semibold">Recent transfers</h2>
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {["Date", "Material", "Roll", "From", "To", "Quantity", "Remarks"].map((x) => (
                  <th key={x} className="px-3 py-2 text-left">{x}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {outs.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-2">{r.createdAt.toISOString().slice(0, 10)}</td>
                  <td className="px-3 py-2">{r.material.code} · {r.material.name}</td>
                  <td className="px-3 py-2">{r.roll?.rollNo ?? "—"}</td>
                  <td className="px-3 py-2">{r.warehouse.code}</td>
                  <td className="px-3 py-2">{toByRef.get(r.refId) ?? "—"}</td>
                  <td className="px-3 py-2">
                    {Math.abs(Number(r.quantity)).toLocaleString()} {r.material.unit}
                  </td>
                  <td className="px-3 py-2">{r.remarks ?? ""}</td>
                </tr>
              ))}
              {outs.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
                    No transfers posted.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
