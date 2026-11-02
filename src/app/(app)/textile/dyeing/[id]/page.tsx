import Link from "next/link";
import { notFound } from "next/navigation";
import { textileService } from "@/services/textile.service";
import { gate } from "../../gate";
import { ActionForm } from "../../action-form";
import { dyeStepAction } from "../../actions";
import { Card, F, Pill, Title, fmt, inputCls, td, th } from "../../ui";

function Step({ id, step, label, children }: { id: string; step: string; label: string; children?: React.ReactNode }) {
  return (
    <ActionForm action={dyeStepAction} submitLabel={label} className="space-y-2">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="step" value={step} />
      {children}
    </ActionForm>
  );
}

export default async function DyeDetail({ params }: { params: Promise<{ id: string }> }) {
  await gate();
  const { id } = await params;
  const r = await textileService.getDyeBatch(id).catch(() => null);
  if (!r) notFound();
  const chem = Array.isArray(r.chemicals) ? (r.chemicals as { name: string; qty: number; unit: string }[]) : [];
  return (
    <div>
      <Title>Dye batch {r.dyeNo} <Pill text={r.status} /></Title>
      <Card>
        <dl className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
          <div><dt className="text-xs text-gray-500">Lab dip</dt><dd><Link className="text-blue-700 underline" href={`/textile/lab-dips/${r.labDipId}`}>{r.labDip.labDipNo}</Link></dd></div>
          <div><dt className="text-xs text-gray-500">Dye lot / batch</dt><dd>{r.dyeLot} / {r.batchNo}</dd></div>
          <div><dt className="text-xs text-gray-500">Color</dt><dd>{r.color}</dd></div>
          <div><dt className="text-xs text-gray-500">Recipe</dt><dd>{r.recipe ?? "-"}</dd></div>
          <div><dt className="text-xs text-gray-500">Input</dt><dd>{fmt(r.inputQty)}</dd></div>
          <div><dt className="text-xs text-gray-500">Output</dt><dd>{fmt(r.outputQty)}</dd></div>
          <div><dt className="text-xs text-gray-500">Reject</dt><dd>{fmt(r.rejectQty)}</dd></div>
          <div><dt className="text-xs text-gray-500">Shade / rework</dt><dd>{r.shade ?? "-"} / {r.reworkCount}</dd></div>
        </dl>
        {chem.length > 0 && (
          <p className="mt-3 text-sm text-gray-700">Chemicals: {chem.map((c) => `${c.name} ${c.qty}${c.unit}`).join(", ")}</p>
        )}
      </Card>
      <Card title="Next action">
        {r.status === "PLANNED" && (
          <div className="grid gap-4 md:grid-cols-2">
            <Step id={id} step="start" label="Start (issue greige roll)" />
            <Step id={id} step="cancel" label="Cancel">
              <F label="Reason (required)"><input name="reason" required className={inputCls} /></F>
            </Step>
          </div>
        )}
        {r.status === "IN_PROCESS" && (
          <Step id={id} step="complete" label="Complete and create dyed roll">
            <div className="grid gap-3 md:grid-cols-4">
              <F label="Output qty"><input name="outputQty" type="number" step="0.0001" required className={inputCls} /></F>
              <F label="Reject qty"><input name="rejectQty" type="number" step="0.0001" defaultValue="0" className={inputCls} /></F>
              <F label="Shade"><input name="shade" className={inputCls} /></F>
              <F label="Rework count"><input name="reworkCount" type="number" defaultValue="0" className={inputCls} /></F>
            </div>
          </Step>
        )}
        {r.status === "COMPLETED" && <Step id={id} step="close" label="Close" />}
        {(r.status === "CLOSED" || r.status === "CANCELLED") && <p className="text-sm text-gray-500">No further action.</p>}
      </Card>
      <Card title="Finishing logs">
        <table className="w-full">
          <thead><tr><th className={th}>No</th><th className={th}>Process</th><th className={th}>Input</th><th className={th}>Output</th><th className={th}>Status</th></tr></thead>
          <tbody>
            {r.finishings.map((f) => (
              <tr key={f.id} className="border-t">
                <td className={td}><Link className="text-blue-700 underline" href={`/textile/finishing/${f.id}`}>{f.finishNo}</Link></td>
                <td className={td}>{f.process}</td><td className={td}>{fmt(f.inputQty)}</td><td className={td}>{fmt(f.outputQty)}</td><td className={td}>{f.status}</td>
              </tr>
            ))}
            {r.finishings.length === 0 && <tr><td className={td} colSpan={5}>None yet.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}