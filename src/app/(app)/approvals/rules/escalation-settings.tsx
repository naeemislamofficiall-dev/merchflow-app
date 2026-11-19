"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Clock, Play, Zap } from "lucide-react";
import { Switch } from "@/components/approvals/switch";
import { runEscalationAction, setEscalationAction } from "../extra-actions";

type Rule = { id: string; code: string; name: string; days: number | null };

export function EscalationSettings({ rules }: { rules: Rule[] }) {
  const router = useRouter();
  const [defaultDays, setDefaultDays] = useState("3");
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const anyOn = rules.some((r) => r.days !== null);

  async function apply(list: { id: string; days: string }[]) {
    for (const x of list) {
      const res = await setEscalationAction(x.id, x.days);
      if (!res.ok) return res.error;
    }
    return null;
  }

  function validDefault() {
    const n = Number(defaultDays);
    if (!Number.isInteger(n) || n < 1 || n > 60) {
      setMsg({ ok: false, text: "Days must be a whole number between 1 and 60" });
      return false;
    }
    return true;
  }

  function master(on: boolean) {
    setMsg(null);
    if (on && !validDefault()) return;
    start(async () => {
      const targets = on
        ? rules.filter((r) => r.days === null).map((r) => ({ id: r.id, days: defaultDays }))
        : rules.filter((r) => r.days !== null).map((r) => ({ id: r.id, days: "" }));
      const err = await apply(targets);
      if (err) setMsg({ ok: false, text: err });
      else {
        setEdits({});
        router.refresh();
      }
    });
  }

  function one(r: Rule, days: string) {
    setMsg(null);
    if (days !== "") {
      const n = Number(days);
      if (!Number.isInteger(n) || n < 1 || n > 60) {
        setMsg({ ok: false, text: "Days must be a whole number between 1 and 60" });
        return;
      }
    }
    start(async () => {
      const err = await apply([{ id: r.id, days }]);
      if (err) setMsg({ ok: false, text: err });
      else {
        setEdits((p) => {
          const n = { ...p };
          delete n[r.id];
          return n;
        });
        router.refresh();
      }
    });
  }

  function runNow() {
    setMsg(null);
    start(async () => {
      const res = await runEscalationAction();
      if (!res.ok) setMsg({ ok: false, text: res.error });
      else setMsg({ ok: true, text: `Escalation check done: ${res.data.escalated} request(s) escalated` });
      if (res.ok) router.refresh();
    });
  }

  return (
    <section id="escalation" className="rounded-card border bg-card p-6 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Zap className="h-8 w-8 text-blue-600" fill="currentColor" fillOpacity={0.2} />
          <div>
            <h2 className="font-heading text-xl font-semibold text-navy-800">Escalation</h2>
            <p className="text-sm text-slate-500">Set up escalation rules for pending approvals</p>
          </div>
        </div>
        <label className="flex items-center gap-3 text-sm font-semibold text-navy-800">
          Enable Escalation
          <Switch checked={anyOn} onChange={master} disabled={pending || rules.length === 0} label="Enable escalation for all rules" />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-blue-50/70 px-4 py-3 text-sm text-navy-800">
        <Clock className="h-5 w-5 text-blue-600" />
        If a request waits more than
        <input
          value={defaultDays}
          onChange={(e) => setDefaultDays(e.target.value)}
          inputMode="numeric"
          aria-label="Default days"
          className="h-8 w-14 rounded-md border bg-white px-2 text-center text-sm outline-none focus:ring-2 focus:ring-blue-200"
        />
        days at a step, the next level is notified. Turn the switch off = off.
      </div>

      {rules.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No rules yet. Save a rule above first.</p>
      ) : (
        <ul className="mt-4 divide-y">
          {rules.map((r) => {
            const shown = edits[r.id] ?? String(r.days ?? "");
            const dirty = edits[r.id] !== undefined && edits[r.id] !== String(r.days ?? "");
            return (
              <li key={r.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                <span className="min-w-48 flex-1">
                  <span className="font-semibold text-navy-800">{r.name}</span>
                  <span className="ml-2 text-xs text-slate-500">{r.code}</span>
                </span>
                <Switch
                  checked={r.days !== null}
                  disabled={pending}
                  label={`Escalation for ${r.name}`}
                  onChange={(on) => (on ? (validDefault() ? one(r, defaultDays) : undefined) : one(r, ""))}
                />
                <input
                  value={shown}
                  disabled={r.days === null}
                  onChange={(e) => setEdits((p) => ({ ...p, [r.id]: e.target.value }))}
                  inputMode="numeric"
                  aria-label={`Escalation days for ${r.name}`}
                  className="h-9 w-16 rounded-md border bg-white px-2 text-center outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-slate-100"
                />
                <span className="text-slate-500">days</span>
                {dirty && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => one(r, shown)}
                    className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"
                  >
                    Save
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={runNow}
          className="inline-flex h-10 items-center gap-2 rounded-full border bg-card px-5 text-sm font-semibold text-navy-800 hover:bg-slate-50 disabled:opacity-60"
        >
          <Play className="h-4 w-4" fill="currentColor" /> Run escalation check now
        </button>
        {msg && <p className={`text-sm ${msg.ok ? "text-emerald-700" : "text-destructive"}`}>{msg.text}</p>}
      </div>
    </section>
  );
}