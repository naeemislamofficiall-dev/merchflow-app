import Link from "next/link";
import { textileService } from "@/services/textile.service";
import { gate } from "../gate";
import { ActionForm } from "../action-form";
import { createDyeBatchAction } from "../actions";
import { Card, F, Pill, Title, fmt, inputCls, td, th } from "../ui";

export default async function DyeingPage() {
  await gate();
  const [rows, opt] = await Promise.all([textileService.listDyeBatches(), textileService.options()]);
  return (
    <div>
      <Title>Dyeing</Title>
      <Card title="New bulk dye batch (needs an approved lab dip)">
        <ActionForm action={createDyeBatchAction} submitLabel="Create" goto="/textile/dyeing/{id}" className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <F label="Factory"><select name="factoryId" required className={inputCls}>{opt.factories.map((f) => <option key={f.id} value={f.id}>{f.code} - {f.name}</option>)}</select></F>
          <F label="Approved lab dip"><select name="labDipId" required className={inputCls}><option value="">Select lab dip</option>{opt.labDips.map((l) => <option key={l.id} value={l.id}>{l.labDipNo} - {l.color}</option>)}</select></F>
          <F label="Greige roll"><select name="greigeRollId" required className={inputCls}><option value="">Select roll</option>{opt.rolls.map((r) => <option key={r.id} value={r.id}>{r.rollNo} ({r.material.code}, {fmt(r.quantity)})</option>)}</select></F>
          <F label="Dyed fabric material"><select name="dyedMaterialId" required className={inputCls}><option value="">Select material</option>{opt.materials.map((m) => <option key={m.id} value={m.id}>{m.code} - {m.name}</option>)}</select></F>
          <F label="Dye lot"><input name="dyeLot" required className={inputCls} /></F>
          <F label="Batch no"><input name="batchNo" required className={inputCls} /></F>
          <F label="Input qty"><input name="inputQty" type="number" step="0.0001" required className={inputCls} /></F>
          <F label="Recipe"><input name="recipe" className={inputCls} /></F>
          <F label="Chemicals, one per line: name, qty, unit"><textarea name="chemicals" rows={2} className={inputCls} placeholder="Reactive red, 2.5, kg" /></F>
        </ActionForm>
      </Card>
      <Card>
        <table className="w-full">
          <thead><tr><th className={th}>No</th><th className={th}>Lab dip</th><th className={th}>Dye lot</th><th className={th}>Color</th><th className={th}>Input</th><th className={th}>Output</th><th className={th}>Status</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className={td}><Link className="text-blue-700 underline" href={`/textile/dyeing/${r.id}`}>{r.dyeNo}</Link></td>
                <td className={td}>{r.labDip.labDipNo}</td><td className={td}>{r.dyeLot}</td><td className={td}>{r.color}</td>
                <td className={td}>{fmt(r.inputQty)}</td><td className={td}>{fmt(r.outputQty)}</td><td className={td}><Pill text={r.status} /></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td className={td} colSpan={7}>No dye batches yet.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}