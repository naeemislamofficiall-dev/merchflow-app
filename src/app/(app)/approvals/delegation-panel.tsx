"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send, Users } from "lucide-react";
import { Panel } from "@/components/dashboard/widgets";
import { delegateAction, revokeDelegationAction } from "./extra-actions";

const field =
  "h-11 w-full rounded-lg border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-blue-200";

type Del = { id: string; who: string; start: string; end: string; reason: string; active: boolean };

function Lbl({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-navy-800">{text}</span>
      {children}
    </label>
  );
}

function Row({ d, onRevoke, busy }: { d: Del; onRevoke?: () => void; busy?: boolean }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm">
      <span>
        <span className="font-semibold text-navy-800">{d.who}</span>
        <span className="ml-2 text-xs text-slate-500">
          {d.start} to {d.end} · {d.reason}
        </span>
      </span>
      <span className="flex items-center gap-2">
        <span
          className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
            d.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
          }`}
        >
          {d.active ? "Active" : "Revoked"}
        </span>
        {onRevoke && d.active && (
          <button
            type="button"
            disabled={busy}
            onClick={onRevoke}
            className="rounded-md border bg-card px-2.5 py-1 text-xs font-medium hover:bg-slate-100 disabled:opacity-60"
          >
            Revoke
          </button>
        )}
      </span>
    </li>
  );
}

export function DelegationPanel(props: {
  users: { id: string; label: string }[];
  given: Del[];
  received: Del[];
  defaultStart: string;
  defaultEnd: string;
}) {
  const router = useRouter();
  const [f, setF] = useState({ toUserId: "", startDate: props.defaultStart, endDate: props.defaultEnd, reason: "" });
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) {
    setError("");
    start(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error ?? "Failed");
      else {
        after?.();
        router.refresh();
      }
    });
  }

  return (
    <Panel
      icon={Users}
      iconClass="bg-blue-100 text-blue-600"
      title="Delegation"
      subtitle="Delegate your approval rights to another person"
      className="h-full"
    >
      <div className="grid items-end gap-3 md:grid-cols-[1.4fr_1fr_1fr_1.4fr_auto]">
        <Lbl text="Delegate to">
          <select className={field} value={f.toUserId} onChange={(e) => setF({ ...f, toUserId: e.target.value })}>
            <option value="">Select user...</option>
            {props.users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.label}
              </option>
            ))}
          </select>
        </Lbl>
        <Lbl text="From">
          <input type="date" className={field} value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value })} />
        </Lbl>
        <Lbl text="To">
          <input type="date" className={field} value={f.endDate} onChange={(e) => setF({ ...f, endDate: e.target.value })} />
        </Lbl>
        <Lbl text="Reason (Optional)">
          <input className={field} placeholder="Enter reason..." value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} />
        </Lbl>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            run(
              () => delegateAction({ ...f, reason: f.reason.trim() || "Delegated" }),
              () => setF((p) => ({ ...p, toUserId: "", reason: "" }))
            )
          }
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Delegate
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}

      <div className="mt-5 grid gap-4 border-t pt-4 md:grid-cols-2">
        <div>
          <p className="mb-2 text-sm font-semibold text-navy-800">I delegated</p>
          {props.given.length === 0 ? (
            <p className="text-sm text-muted-foreground">None</p>
          ) : (
            <ul className="space-y-1.5">
              {props.given.map((d) => (
                <Row key={d.id} d={d} busy={pending} onRevoke={() => run(() => revokeDelegationAction(d.id))} />
              ))}
            </ul>
          )}
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold text-navy-800">Delegated to me</p>
          {props.received.length === 0 ? (
            <p className="text-sm text-muted-foreground">None</p>
          ) : (
            <ul className="space-y-1.5">
              {props.received.map((d) => (
                <Row key={d.id} d={d} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </Panel>
  );
}