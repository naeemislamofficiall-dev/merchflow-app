import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { textileService } from "@/services/textile.service";
import { gate } from "../gate";
import { ActionForm } from "../action-form";
import { createFinishingAction } from "../actions";
import { Card, F, Pill, Title, fmt, inputCls, td, th } from "../ui";

export default async function FinishingPage() {
  const user = await gate();
  const [rows, opt, batches] = await Promise.all([
    textileService.listFinishing(),
    textileService.options(),
    prisma.dyeBatch.findMany({
      where: { companyId: user.companyId, status: { in: ["COMPLETED", "CLOSED"] } },
      select: { id: true, dyeNo: true, color: true, outputQty: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  return (
    <div>
      <Title>Fabric finishing</Title>
      <Card title="New finishing log (process record only, no stock change)">
        <ActionForm action={createFinishingAction} submitLabel="Create" goto="/textile/finishing/{id}" className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <F label="Factory"><select name="factoryId" required className={inputCls}>{opt.factories.map((f) => <option key={f.id} value={f.id}>{f.code} - {f.name}</option>)}</select></F>
          <F label="Completed dye batch"><select name="dyeBatchId" required className={inputCls}><option value="">Select batch</option>{batches.map((b) => <option key={b.id} value={b.id}>{b.dyeNo} - {b.color} ({fmt(b.outputQty)})</option>)}</select></F>
          <F label="Process"><input name="process" required className={inputCls} placeholder="Stenter / compacting / heat set" /></F>
          <F label="Input qty"><input name="inputQty" type="number" step="0.0001" required className={inputCls} /></F>
          <F label="Remarks"><input name="remarks" className={inputCls} /></F>
        </ActionForm>
      </Card>
      <Card>
        <table className="w-full">
          <thead><tr><th className={th}>No</th><th className={th}>Dye batch</th><th className={th}>Process</th><th className={th}>Input</th><th className={th}>Output</th><th className={th}>Status</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className={td}><Link className="text-blue-700 underline" href={`/textile/finishing/${r.id}`}>{r.finishNo}</Link></td>
                <td className={td}>{r.dyeBatch.dyeNo}</td><td className={td}>{r.process}</td>
                <td className={td}>{fmt(r.inputQty)}</td><td className={td}>{fmt(r.outputQty)}</td><td className={td}><Pill text={r.status} /></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td className={td} colSpan={6}>No finishing logs yet.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}