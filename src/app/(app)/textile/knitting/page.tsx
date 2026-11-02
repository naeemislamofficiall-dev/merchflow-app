import Link from "next/link";
import { textileService } from "@/services/textile.service";
import { gate } from "../gate";
import { ActionForm } from "../action-form";
import { createKnittingAction } from "../actions";
import { Card, F, Pill, Title, fmt, inputCls, td, th } from "../ui";

export default async function KnittingPage() {
  await gate();
  const [rows, opt] = await Promise.all([textileService.listKnitting(), textileService.options()]);
  return (
    <div>
      <Title>Knitting</Title>
      <Card title="New knitting order">
        <ActionForm action={createKnittingAction} submitLabel="Create" goto="/textile/knitting/{id}" className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <F label="Factory"><select name="factoryId" required className={inputCls}>{opt.factories.map((f) => <option key={f.id} value={f.id}>{f.code} - {f.name}</option>)}</select></F>
          <F label="Warehouse"><select name="warehouseId" required className={inputCls}>{opt.warehouses.map((w) => <option key={w.id} value={w.id}>{w.code} - {w.name}</option>)}</select></F>
          <F label="Machine"><input name="machineNo" required className={inputCls} /></F>
          <F label="Program"><input name="program" className={inputCls} placeholder="Single jersey 30/1" /></F>
          <F label="Yarn lot"><select name="yarnLotId" required className={inputCls}><option value="">Select lot</option>{opt.lots.map((l) => <option key={l.id} value={l.id}>{l.material.code} / {l.lotNo}</option>)}</select></F>
          <F label="Greige fabric material"><select name="greigeMaterialId" required className={inputCls}><option value="">Select material</option>{opt.materials.map((m) => <option key={m.id} value={m.id}>{m.code} - {m.name}</option>)}</select></F>
          <F label="Planned fabric qty"><input name="plannedQty" type="number" step="0.0001" required className={inputCls} /></F>
          <F label="Knitting wastage %"><input name="wastagePct" type="number" step="0.01" defaultValue="3" className={inputCls} /></F>
          <F label="Production date"><input name="productionDate" type="date" className={inputCls} /></F>
        </ActionForm>
      </Card>
      <Card>
        <table className="w-full">
          <thead><tr><th className={th}>No</th><th className={th}>Machine</th><th className={th}>Planned</th><th className={th}>Yarn required</th><th className={th}>Actual</th><th className={th}>Reject</th><th className={th}>Status</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className={td}><Link className="text-blue-700 underline" href={`/textile/knitting/${r.id}`}>{r.knitNo}</Link></td>
                <td className={td}>{r.machineNo}</td><td className={td}>{fmt(r.plannedQty)}</td><td className={td}>{fmt(r.yarnRequiredQty)}</td>
                <td className={td}>{fmt(r.actualQty)}</td><td className={td}>{fmt(r.rejectQty)}</td><td className={td}><Pill text={r.status} /></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td className={td} colSpan={7}>No knitting orders yet.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}