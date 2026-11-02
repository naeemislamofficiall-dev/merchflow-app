import Link from "next/link";
import { notFound } from "next/navigation";
import { textileService } from "@/services/textile.service";
import { gate } from "../../gate";
import { ActionForm } from "../../action-form";
import { labDipStepAction } from "../../actions";
import { Card, F, Pill, Title, inputCls, td, th } from "../../ui";

function Step({ id, step, label, children }: { id: string; step: string; label: string; children?: React.ReactNode }) {
  return (
    <ActionForm action={labDipStepAction} submitLabel={label} className="space-y-2">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="step" value={step} />
      {children}
    </ActionForm>
  );
}

export default async function LabDipDetail({ params }: { params: Promise<{ id: string }> }) {
  await gate();
  const { id } = await params;
  const r = await textileService.getLabDip(id);
  if (!r) notFound();
  return (
    <div>
      <Title>Lab dip {r.labDipNo} <Pill text={r.status} /></Title>
      <Card>
        <dl className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
          <div><dt className="text-xs text-gray-500">Color</dt><dd>{r.color}</dd></div>
          <div><dt className="text-xs text-gray-500">Standard</dt><dd>{r.standardRef}</dd></div>
          <div><dt className="text-xs text-gray-500">Resubmission count</dt><dd>{r.resubmissionCount}</dd></div>
          <div><dt className="text-xs text-gray-500">Approval date</dt><dd>{r.approvalDate ? r.approvalDate.toISOString().slice(0, 10) : "-"}</dd></div>
          <div><dt className="text-xs text-gray-500">Buyer comments</dt><dd>{r.buyerComments ?? "-"}</dd></div>
          <div><dt className="text-xs text-gray-500">Rejection reason</dt><dd>{r.rejectionReason ?? "-"}</dd></div>
        </dl>
      </Card>
      <Card title="Next action">
        {r.status === "REQUEST" && <Step id={id} step="start" label="Send to dyeing" />}
        {r.status === "DYEING" && <Step id={id} step="ready" label="Lab dip ready" />}
        {r.status === "LAB_DIP" && <Step id={id} step="submit" label="Submit to buyer" />}
        {r.status === "BUYER_REVIEW" && (
          <div className="grid gap-4 md:grid-cols-2">
            <Step id={id} step="approve" label="Approve">
              <F label="Buyer comments"><input name="comments" className={inputCls} /></F>
            </Step>
            <Step id={id} step="reject" label="Reject">
              <F label="Rejection reason (required)"><input name="reason" required className={inputCls} /></F>
              <F label="Buyer comments"><input name="comments" className={inputCls} /></F>
            </Step>
          </div>
        )}
        {r.status === "REJECTED" && <Step id={id} step="resubmit" label="Resubmit (back to dyeing)" />}
        {(r.status === "APPROVED" || r.status === "BULK_DYEING") && (
          <p className="text-sm text-gray-700">Approved. <Link className="text-blue-700 underline" href="/textile/dyeing">Create a bulk dye batch</Link>.</p>
        )}
      </Card>
      <Card title="Submission history">
        <table className="w-full">
          <thead><tr><th className={th}>Round</th><th className={th}>Submitted</th><th className={th}>Decision</th><th className={th}>Reason</th><th className={th}>Comments</th></tr></thead>
          <tbody>
            {r.submissions.map((s) => (
              <tr key={s.id} className="border-t">
                <td className={td}>{s.round}</td><td className={td}>{s.submittedAt.toISOString().slice(0, 10)}</td>
                <td className={td}>{s.decision ?? "Pending"}</td><td className={td}>{s.reason ?? "-"}</td><td className={td}>{s.comments ?? "-"}</td>
              </tr>
            ))}
            {r.submissions.length === 0 && <tr><td className={td} colSpan={5}>Not submitted yet.</td></tr>}
          </tbody>
        </table>
      </Card>
      <Card title="Bulk dye batches">
        <ul className="text-sm">
          {r.dyeBatches.map((b) => <li key={b.id}><Link className="text-blue-700 underline" href={`/textile/dyeing/${b.id}`}>{b.dyeNo}</Link> ({b.status})</li>)}
          {r.dyeBatches.length === 0 && <li className="text-gray-500">None yet.</li>}
        </ul>
      </Card>
    </div>
  );
}