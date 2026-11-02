import { notFound } from "next/navigation";
import { textileService } from "@/services/textile.service";
import { gate } from "../../gate";
import { ActionForm } from "../../action-form";
import { finishingStepAction } from "../../actions";
import { Card, F, Pill, Title, fmt, inputCls } from "../../ui";

function Step({ id, step, label, children }: { id: string; step: string; label: string; children?: React.ReactNode }) {
  return (
    <ActionForm action={finishingStepAction} submitLabel={label} className="space-y-2">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="step" value={step} />
      {children}
    </ActionForm>
  );
}

export default async function FinishingDetail({ params }: { params: Promise<{ id: string }> }) {
  await gate();
  const { id } = await params;
  const r = await textileService.getFinishing(id).catch(() => null);
  if (!r) notFound();
  return (
    <div>
      <Title>Finishing {r.finishNo} <Pill text={r.status} /></Title>
      <Card>
        <dl className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
          <div><dt className="text-xs text-gray-500">Dye batch</dt><dd>{r.dyeBatch.dyeNo}</dd></div>
          <div><dt className="text-xs text-gray-500">Process</dt><dd>{r.process}</dd></div>
          <div><dt className="text-xs text-gray-500">Input</dt><dd>{fmt(r.inputQty)}</dd></div>
          <div><dt className="text-xs text-gray-500">Output</dt><dd>{fmt(r.outputQty)}</dd></div>
          <div><dt className="text-xs text-gray-500">Shrinkage %</dt><dd>{r.shrinkagePct ? fmt(r.shrinkagePct) : "-"}</dd></div>
          <div><dt className="text-xs text-gray-500">GSM after</dt><dd>{r.gsmAfter ? fmt(r.gsmAfter) : "-"}</dd></div>
        </dl>
      </Card>
      <Card title="Next action">
        {r.status === "PLANNED" && (
          <div className="grid gap-4 md:grid-cols-2">
            <Step id={id} step="start" label="Start" />
            <Step id={id} step="cancel" label="Cancel" />
          </div>
        )}
        {r.status === "IN_PROCESS" && (
          <Step id={id} step="complete" label="Complete">
            <div className="grid gap-3 md:grid-cols-3">
              <F label="Output qty"><input name="outputQty" type="number" step="0.0001" required className={inputCls} /></F>
              <F label="Shrinkage %"><input name="shrinkagePct" type="number" step="0.01" className={inputCls} /></F>
              <F label="GSM after"><input name="gsmAfter" type="number" step="0.01" className={inputCls} /></F>
            </div>
          </Step>
        )}
        {(r.status === "COMPLETED" || r.status === "CANCELLED") && <p className="text-sm text-gray-500">No further action.</p>}
      </Card>
    </div>
  );
}