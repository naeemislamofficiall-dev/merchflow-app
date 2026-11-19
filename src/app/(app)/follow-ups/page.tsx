import { AlertTriangle, Clock, Handshake } from "lucide-react";
import { DocFillIcon, FinCard, PageBand } from "@/components/approvals/ui";
import { followUpService } from "@/services/followup.service";
import { RefreshButton } from "./follow-up-controls";
import { FollowUpsTable, type FollowRow } from "./follow-ups-table";

const day = (d: Date) => d.toISOString().slice(0, 10);

export default async function FollowUpsPage() {
  const list = await followUpService.listOpen();
  const late = list.filter((r) => r.liveDelayDays > 0).length;
  const escalated = list.filter((r) => r.isEscalated).length;

  const rows: FollowRow[] = list.map((f) => {
    const last = f.contacts.length
      ? f.contacts.reduce((a, b) => (a.contactedAt > b.contactedAt ? a : b))
      : null;
    return {
      id: f.id,
      poId: f.po.id,
      poNo: f.po.poNo,
      supplier: f.po.supplier.name,
      firstPromise: day(f.supplierPromisedDate),
      latestPromise: day(f.latestPromisedDate),
      delayDays: f.liveDelayDays,
      escalated: f.isEscalated,
      escalationNote: f.escalationNote ?? "",
      lastContact: last ? `${day(last.contactedAt)} · ${last.method}` : "",
    };
  });

  return (
    <div className="stagger space-y-5">
      <PageBand>
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex h-22 w-22 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-blue-50 to-blue-100 text-blue-600 shadow-lg shadow-blue-200/60 ring-1 ring-white">
              <Handshake className="h-10 w-10" strokeWidth={2} />
            </span>
            <div>
              <h1 className="font-heading text-3xl font-semibold text-navy-800">Supplier follow-ups</h1>
              <p className="text-sm text-navy-800">
                Every open purchase order, with the supplier&apos;s promise and the delay so far
              </p>
            </div>
          </div>
          <RefreshButton />
        </header>
      </PageBand>

      <div className="stagger grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4">
        <FinCard theme="violet" wave={false} art={<DocFillIcon />} label="Open" value={String(list.length)} />
        <FinCard
          theme="overdue"
          wave={false}
          art={<Clock className="h-8 w-8" strokeWidth={2.4} />}
          label="Late"
          value={String(late)}
        />
        <FinCard
          theme="orange"
          wave={false}
          art={<AlertTriangle className="h-8 w-8" strokeWidth={2.4} />}
          label="Escalated"
          value={String(escalated)}
        />
      </div>

      <FollowUpsTable rows={rows} />
    </div>
  );
}