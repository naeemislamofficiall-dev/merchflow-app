import Link from "next/link";
import { textileService } from "@/services/textile.service";
import { gate } from "../gate";
import { ActionForm } from "../action-form";
import { createLabDipAction } from "../actions";
import { Card, F, Pill, Title, inputCls, td, th } from "../ui";

export default async function LabDipsPage() {
  await gate();
  const [rows, opt] = await Promise.all([textileService.listLabDips(), textileService.options()]);
  const buyer = new Map(opt.buyers.map((b) => [b.id, b.name]));
  return (
    <div>
      <Title>Lab dips</Title>
      <Card title="New lab dip request">
        <ActionForm action={createLabDipAction} submitLabel="Create" goto="/textile/lab-dips/{id}" className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <F label="Factory"><select name="factoryId" required className={inputCls}>{opt.factories.map((f) => <option key={f.id} value={f.id}>{f.code} - {f.name}</option>)}</select></F>
          <F label="Buyer"><select name="buyerId" required className={inputCls}><option value="">Select buyer</option>{opt.buyers.map((b) => <option key={b.id} value={b.id}>{b.code} - {b.name}</option>)}</select></F>
          <F label="Color"><input name="color" required className={inputCls} /></F>
          <F label="Standard (Pantone / swatch ref)"><input name="standardRef" required className={inputCls} /></F>
          <F label="Remarks"><input name="remarks" className={inputCls} /></F>
        </ActionForm>
      </Card>
      <Card>
        <table className="w-full">
          <thead><tr><th className={th}>No</th><th className={th}>Buyer</th><th className={th}>Color</th><th className={th}>Standard</th><th className={th}>Status</th><th className={th}>Resubmissions</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className={td}><Link className="text-blue-700 underline" href={`/textile/lab-dips/${r.id}`}>{r.labDipNo}</Link></td>
                <td className={td}>{buyer.get(r.buyerId) ?? "-"}</td><td className={td}>{r.color}</td><td className={td}>{r.standardRef}</td>
                <td className={td}><Pill text={r.status} /></td><td className={td}>{r.resubmissionCount}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td className={td} colSpan={6}>No lab dips yet.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}