import { notFound } from "next/navigation";
import { textileService } from "@/services/textile.service";
import { gate } from "../../gate";
import { ActionForm } from "../../action-form";
import { knittingStepAction } from "../../actions";
import { Card, F, Pill, Title, fmt, inputCls, td, th } from "../../ui";

function Step({ id, step, label, children }: { id: string; step: string; label: string; children?: React.ReactNode }) {
  return (
    <ActionForm action={knittingStepAction} submitLabel={label} className="space-y-2">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="step" value={step} />
      {children}
    </ActionForm>
  );
}

export default async function KnittingDetail({ params }: { params: Promise<{ id: string }> }) {
  await gate();
  const { id } = await params;
  let r;
  try { r = await textileService.getKnitting(id); } catch { notFound(); }
  return (
    <div>
      <Title>Knitting {r.knitNo} <Pill text={r.status} /></Title>
      <Card>
        <dl className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
          <div><dt className="text-xs text-gray-500">Machine</dt><dd>{r.machineNo}</dd></div>
          <div><dt className="text-xs text-gray-500">Program</dt><dd>{r.program ?? "-"}</dd></div>
          <div><dt className="text-xs text-gray-500">Planned fabric</dt><dd>{fmt(r.plannedQty)}</dd></div>
          <div><dt className="text-xs text-gray-500">Yarn required</dt><dd>{fmt(r.yarnRequiredQty)}</dd></div>
          <div><dt className="text-xs text-gray-500">Yarn issued</dt><dd>{fmt(r.yarnIssuedQty)}</dd></div>
          <div><dt className="text-xs text-gray-500">Actual (good)</dt><dd>{fmt(r.actualQty)}</dd></div>
          <div><dt className="text-xs text-gray-500">Reject</dt><dd>{fmt(r.rejectQty)}</dd></div>
          <div><dt className="text-xs text-gray-500">Production date</dt><dd>{r.productionDate ? r.productionDate.toISOString().slice(0, 10) : "-"}</dd></div>
        </dl>
      </Card>
      <Card title="Next action">
        {r.status === "PLANNED" && (
          <div className="grid gap-4 md:grid-cols-2">
            <Step id={id} step="issue" label="Issue yarn to knitting" />
            <Step id={id} step="cancel" label="Cancel">
              <F label="Reason (required)"><input name="reason" required className={inputCls} /></F>
            </Step>
          </div>
        )}
        {r.status === "YARN_ISSUED" && (
          <Step id={id} step="complete" label="Complete and create greige rolls">
            <F label="Rolls, one per line: qty, gsm, width cm, weight kg (only qty is required)">
              <textarea name="rolls" required rows={4} className={inputCls} placeholder={"25.5, 180, 90, 25.5\n24, 180, 90, 24"} />
            </F>
            <F label="Reject qty"><input name="rejectQty" type="number" step="0.0001" defaultValue="0" className={inputCls} /></F>
          </Step>
        )}
        {r.status === "COMPLETED" && <Step id={id} step="close" label="Close" />}
        {(r.status === "CLOSED" || r.status === "CANCELLED") && <p className="text-sm text-gray-500">No further action.</p>}
      </Card>
      <Card title="Greige rolls produced">
        <table className="w-full">
          <thead><tr><th className={th}>Roll</th><th className={th}>Qty</th></tr></thead>
          <tbody>
            {r.outputs.map((o) => <tr key={o.id} className="border-t"><td className={td}>{r.rollNos[o.rollId] ?? o.rollId}</td><td className={td}>{fmt(o.quantity)}</td></tr>)}
            {r.outputs.length === 0 && <tr><td className={td} colSpan={2}>None yet. Rolls start as PENDING until fabric inspection.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}