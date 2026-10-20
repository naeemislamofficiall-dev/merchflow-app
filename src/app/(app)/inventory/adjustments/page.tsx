import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { prisma } from "@/lib/prisma";
import { can, requireUser } from "@/lib/permissions";
import { inventoryService } from "@/services/inventory.service";
import { materialService } from "@/services/material.service";
import { warehouseService } from "@/services/warehouse.service";
import { createStockAdjustmentAction } from "./actions";
export default async function StockAdjustmentsPage({searchParams}:{searchParams:Promise<{saved?:string}>}) {
 const user=await requireUser(); if(!can(user,"inventory.view")) redirect("/dashboard");
 const [materials,warehouses,rows,params]=await Promise.all([materialService.list({activeOnly:true}),warehouseService.listAll(),prisma.stockAdjustment.findMany({where:{companyId:user.companyId},include:{material:{select:{code:true,name:true,unit:true}},warehouse:{select:{code:true,name:true}}},orderBy:{createdAt:"desc"},take:100}),searchParams]);
 return <div className="space-y-5"><PageHeader title="Stock adjustments & cycle count" description="Post audited inventory corrections with a reason. Negative stock and reason/direction rules are validated by the inventory service."/>
 {params.saved==="1"&&<p className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800">Adjustment posted.</p>}
 <section className="rounded-xl border p-4"><h2 className="mb-3 font-semibold">New adjustment</h2><form action={createStockAdjustmentAction} className="grid gap-3 md:grid-cols-3">
 <label className="grid gap-1 text-sm">Material<select required name="materialId" className="rounded-md border bg-background px-3 py-2"><option value="">Select material</option>{materials.map(m=><option key={m.id} value={m.id}>{m.code} · {m.name}</option>)}</select></label>
 <label className="grid gap-1 text-sm">Warehouse<select required name="warehouseId" className="rounded-md border bg-background px-3 py-2"><option value="">Select warehouse</option>{warehouses.map(w=><option key={w.id} value={w.id}>{w.code} · {w.name}</option>)}</select></label>
 <label className="grid gap-1 text-sm">Quantity change (+/-)<input required type="number" step="0.0001" name="quantityChange" className="rounded-md border bg-background px-3 py-2" placeholder="-2.5 or 4"/></label>
 <label className="grid gap-1 text-sm">Reason<select required name="reason" className="rounded-md border bg-background px-3 py-2">{[["COUNT_CORRECTION","Cycle count correction"],["DAMAGE","Damage"],["SCRAP","Scrap"],["LOSS","Loss"],["FOUND","Found stock"],["SUPPLIER_RETURN","Supplier return"],["OTHER","Other"]].map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
 <label className="grid gap-1 text-sm">Lot ID (optional)<input name="lotId" className="rounded-md border bg-background px-3 py-2"/></label><label className="grid gap-1 text-sm">Bin ID (optional)<input name="binId" className="rounded-md border bg-background px-3 py-2"/></label>
 <label className="grid gap-1 text-sm md:col-span-3">Reason / evidence<input required minLength={3} name="remarks" className="rounded-md border bg-background px-3 py-2" placeholder="Physical count on warehouse aisle B"/></label><div className="md:col-span-3"><button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Post adjustment</button></div></form></section>
 <section className="space-y-2"><h2 className="font-semibold">Recent adjustments</h2><div className="overflow-x-auto rounded-xl border"><table className="w-full text-sm"><thead className="bg-muted/50"><tr>{["Reference","Material","Warehouse","Change","Reason","Date","Remarks"].map(x=><th key={x} className="px-3 py-2 text-left">{x}</th>)}</tr></thead><tbody>{rows.map(r=><tr key={r.id} className="border-t"><td className="px-3 py-2">{r.adjustmentNo}</td><td className="px-3 py-2">{r.material.code} · {r.material.name}</td><td className="px-3 py-2">{r.warehouse.code}</td><td className="px-3 py-2">{Number(r.quantityChange).toLocaleString()} {r.material.unit}</td><td className="px-3 py-2">{r.reason}</td><td className="px-3 py-2">{r.createdAt.toISOString().slice(0,10)}</td><td className="px-3 py-2">{r.remarks}</td></tr>)}{rows.length===0&&<tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">No adjustments posted.</td></tr>}</tbody></table></div></section></div>
}
