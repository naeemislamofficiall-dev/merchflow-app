"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { delegateAction, revokeDelegationAction, runEscalationAction, setEscalationAction } from "./extra-actions";

const input = "h-9 rounded-md border bg-background px-2 text-sm";

type Del = { id: string; who: string; start: string; end: string; reason: string; active: boolean };

export function DelegationPanel(props: { users: { id: string; label: string }[]; given: Del[]; received: Del[] }) {
  const router = useRouter();
  const [f, setF] = useState({ toUserId: "", startDate: "", endDate: "", reason: "" });
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
    <Card>
      <CardHeader>
        <CardTitle>Delegation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex flex-wrap items-end gap-2">
          <select className={input} value={f.toUserId} onChange={(e) => setF({ ...f, toUserId: e.target.value })}>
            <option value="">Delegate to...</option>
            {props.users.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
          </select>
          <input type="date" className={input} value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value })} />
          <input type="date" className={input} value={f.endDate} onChange={(e) => setF({ ...f, endDate: e.target.value })} />
          <input className={`${input} w-56`} placeholder="Reason" value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} />
          <Button disabled={pending} onClick={() => run(() => delegateAction(f), () => setF({ toUserId: "", startDate: "", endDate: "", reason: "" }))}>
            Delegate
          </Button>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <div>
          <p className="font-medium">I delegated</p>
          {props.given.length === 0 && <p className="text-muted-foreground">None</p>}
          {props.given.map((d) => (
            <div key={d.id} className="flex items-center gap-3">
              <span>{d.who}: {d.start} to {d.end} ({d.reason}){d.active ? "" : " - revoked"}</span>
              {d.active && <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => revokeDelegationAction(d.id))}>Revoke</Button>}
            </div>
          ))}
        </div>
        <div>
          <p className="font-medium">Delegated to me</p>
          {props.received.length === 0 && <p className="text-muted-foreground">None</p>}
          {props.received.map((d) => (
            <p key={d.id}>{d.who}: {d.start} to {d.end} ({d.reason}){d.active ? "" : " - revoked"}</p>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function EscalationPanel({ workflows }: { workflows: { id: string; name: string; days: number | null }[] }) {
  const router = useRouter();
  const [vals, setVals] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();

  function save(id: string) {
    setMsg("");
    start(async () => {
      const res = await setEscalationAction(id, vals[id] ?? "");
      setMsg(res.ok ? "Saved" : (res.error ?? "Failed"));
      if (res.ok) router.refresh();
    });
  }

  function runNow() {
    setMsg("");
    start(async () => {
      const res = await runEscalationAction();
      setMsg(res.ok ? "Escalation check done" : (res.error ?? "Failed"));
      if (res.ok) router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Escalation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p className="text-muted-foreground">If a request waits more than N days at a step, the next level is notified. Empty = off.</p>
        {workflows.map((w) => (
          <div key={w.id} className="flex items-center gap-2">
            <span className="w-56">{w.name}</span>
            <input className={`${input} w-20`} placeholder={w.days ? String(w.days) : "off"} value={vals[w.id] ?? ""} onChange={(e) => setVals((p) => ({ ...p, [w.id]: e.target.value }))} />
            <span className="text-muted-foreground">days (now: {w.days ?? "off"})</span>
            <Button size="sm" disabled={pending} onClick={() => save(w.id)}>Save</Button>
          </div>
        ))}
        <Button variant="outline" disabled={pending} onClick={runNow}>Run escalation check now</Button>
        {msg && <p className="text-xs text-muted-foreground">{msg}</p>}
      </CardContent>
    </Card>
  );
}